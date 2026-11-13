#!/usr/bin/env bash
# After the migrations: check the production schema really has what the API
# needs. A wrong value fails the job (and so the API deploy that depends on
# it). D1's daily read limit makes read queries fail for a while without
# anything being wrong: that case is only a warning.
#
# Usage (from workers/api): d1-verify.sh   (needs DB_NAME and MIGRATIONS)
set -uo pipefail

seed="$MIGRATIONS/0017_seed_vehicle_catalog.sql"
min_gens=$(grep -c "INSERT OR IGNORE INTO vehicle_generations" "$seed")
min_engines=$(grep -c "INSERT OR IGNORE INTO vehicle_engines" "$seed")

has() { echo "(SELECT CASE WHEN instr(sql, '$2') > 0 THEN 1 ELSE 0 END FROM sqlite_master WHERE type='table' AND name='$1') AS $3"; }
tables() { local list=$1 alias=$2; echo "(SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ($list)) AS $alias"; }

sql="SELECT
  $(tables "'part_requests','request_offers','whatsapp_notifications','part_search_logs','stock_alerts','order_issues'" tables_of_6),
  $(has part_requests images images_column),
  $(has sellers seller_type seller_type_column),
  $(has parts part_origin part_origin_column),
  $(has parts moderation_note parts_note_column),
  $(has sellers moderation_note sellers_note_column),
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name IN ('idx_part_images_part','idx_compat_part_id','idx_parts_seller_id','idx_parts_status')) AS key_indexes_of_4,
  $(has users terms_accepted_at users_terms_column),
  $(has sellers agreement_accepted_at sellers_agreement_column),
  $(has order_items delivered_at order_items_fulfilment_columns),
  $(has orders delivered_at orders_delivered_column),
  (SELECT COUNT(*) FROM vehicle_generations) AS vehicle_generations,
  (SELECT COUNT(*) FROM vehicle_engines) AS vehicle_engines,
  $(has part_compatibility engine_scope engine_scope_column),
  (SELECT COUNT(*) FROM vehicle_engines WHERE source IS NULL) AS engines_without_source,
  $(tables "'part_numbers','part_listing_numbers','part_number_links'" part_number_tables_of_3),
  $(tables "'order_shipments','commissions','platform_settings','commission_rates','commission_events','commission_invoices','commission_payments'" revenue_tables_of_7),
  $(has sellers delivery_fee_local sellers_fee_columns),
  $(has order_issues refund_amount issues_refund_column),
  $(has commissions invoice_id commissions_invoice_column),
  $(has order_items received_by_buyer_at items_received_column),
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='uq_commission_invoices_live') AS invoice_unique_index,
  $(tables "'carriers','shipment_events'" carrier_tables_of_2),
  $(has order_shipments cod_collected shipments_status_columns),
  (SELECT COUNT(*) FROM carriers) AS carriers_count,
  $(tables "'whatsapp_contacts','whatsapp_messages'" whatsapp_tables_of_2),
  $(has whatsapp_notifications wa_message_id whatsapp_status_columns),
  $(has whatsapp_notifications language whatsapp_language_columns),
  $(has users locale users_locale_column),
  $(has order_shipments delay_notified_at shipments_delay_column),
  $(has orders idempotency_key orders_guard_columns),
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='uq_orders_buyer_idempotency') AS order_idempotency_index,
  $(tables "'whatsapp_templates'" whatsapp_templates_table),
  $(tables "'admin_audit_log'" admin_audit_table),
  (SELECT rate_bps FROM commission_rates WHERE cancelled_at IS NULL AND effective_from <= datetime('now') ORDER BY effective_from DESC, id DESC LIMIT 1) AS commission_rate_now_bps"

out=$(npx --yes wrangler@4 d1 execute "$DB_NAME" --remote --json --command "$sql" 2>&1)
code=$?
if [ $code -ne 0 ]; then
  echo "$out"
  if echo "$out" | grep -qiE "read limit|limit exceeded|exceeded.*limit|quota|rows read"; then
    echo "::warning::D1 read limit reached: the schema could not be verified now (migrations themselves ran). Run this workflow again later."
    exit 0
  fi
  echo "::error::Verify query failed"
  exit 1
fi

MIN_GENS=$min_gens MIN_ENGINES=$min_engines node -e '
const raw = require("fs").readFileSync(0, "utf8");
const json = JSON.parse(raw.slice(raw.indexOf("[")));
const row = json[0].results[0];
console.log(JSON.stringify(row, null, 2));
const exact = { tables_of_6: 6, key_indexes_of_4: 4, part_number_tables_of_3: 3, revenue_tables_of_7: 7, engines_without_source: 0, invoice_unique_index: 1, carrier_tables_of_2: 2, whatsapp_tables_of_2: 2, whatsapp_templates_table: 1, order_idempotency_index: 1, admin_audit_table: 1 };
for (const k of Object.keys(row)) if (k.endsWith("_column") || k.endsWith("_columns")) exact[k] = 1;
const bad = [];
for (const [k, v] of Object.entries(exact)) if (Number(row[k]) !== v) bad.push(`${k} = ${row[k]} (expected ${v})`);
if (Number(row.vehicle_generations) < Number(process.env.MIN_GENS)) bad.push(`vehicle_generations = ${row.vehicle_generations} (expected >= ${process.env.MIN_GENS})`);
if (Number(row.vehicle_engines) < Number(process.env.MIN_ENGINES)) bad.push(`vehicle_engines = ${row.vehicle_engines} (expected >= ${process.env.MIN_ENGINES})`);
if (Number(row.carriers_count) < 12) bad.push(`carriers_count = ${row.carriers_count} (expected >= 12, the carriers of 0026)`);
if (row.commission_rate_now_bps === null || row.commission_rate_now_bps === undefined) bad.push("no commission rate in force (commission_rates is empty)");
console.log(`commission rate now: ${row.commission_rate_now_bps} bps`);
if (bad.length) { for (const b of bad) console.log(`::error::${b}`); process.exit(1); }
console.log("Schema OK");
' <<<"$out"
