# Operations runbook — backup, restore, rollback, incidents

For whoever runs PartHub in production. Every command touches production:
run it only when you mean to, and only for the step you need. The scripts
in `scripts/` that change production ask for `CONFIRM_PRODUCTION=parthub-db`.

## 1. What can be recovered, and how

| Layer | Protection | How far back |
|---|---|---|
| D1 database `parthub-db` | **Time Travel** (built into D1, always on): restore to any minute | 30 days (Workers Paid), 7 days (Free) |
| D1 database | **Weekly export** (`.github/workflows/d1-backup.yml`): full SQL, **restored into a scratch database and checked** (tables, rows, integrity) before it is stored gzipped in R2 `parthub-media/backups/d1/` | As long as the files are kept (lifecycle rule below) |
| R2 photos `parthub-media` | None automatic: deleting a photo deletes it. The API never deletes a stored file when a part is edited. | — |
| API Worker `parthub-api` | Cloudflare keeps the previous deployments: **rollback** in one command | Recent versions |
| Sites (Pages) | Every deployment is kept: **rollback** in the dashboard | All deployments |
| Code | Git (`main`, tags) | Everything |
| Secrets | Not backed up by design. Their names are in `infra/docs/assets-inventory.md`; the values live with their owner (Meta, Cloudflare) and are re-issued, not restored. | — |

Owner, once: in R2 › `parthub-media` › Settings, check **Public access is
off** (no r2.dev URL, no custom domain on the bucket). Then add a
**lifecycle rule**: delete objects under `backups/` after 180 days.

## 2. Restore the database

**Prefer Time Travel** for a recent mistake (bad bulk action, wrong script).
It restores the whole database to a minute, in place.

```bash
cd workers/api
# 1. Note the current state first: you can come back to it.
npx wrangler d1 time-travel info parthub-db
# 2. Restore to a time just before the mistake (UTC, RFC 3339) …
npx wrangler d1 time-travel restore parthub-db --timestamp=2026-11-13T09:40:00Z
# … or to a bookmark printed by step 1.
```

Everything written after that minute is lost (orders, messages). Note what
happened after it first (Admin › Activity log, `order_events`) and redo
the legitimate changes by hand.

**From a weekly export** (database lost, or older than Time Travel):

```bash
npx wrangler r2 object get parthub-media/backups/d1/<file>.sql.gz --file=restore.sql.gz --remote
gunzip restore.sql.gz
# Into a NEW database first, never straight over production:
npx wrangler d1 create parthub-db-restore
npx wrangler d1 execute parthub-db-restore --remote --file=restore.sql
# Check it (counts of users, orders, parts), then point the Worker at it:
# workers/api/wrangler.toml › [[d1_databases]] database_id = <new id>, deploy.
```

Delete `restore.sql` from your computer afterwards: it holds personal data
(law 09-08).

**Restore drill (every 3 months, 15 minutes)**: run the D1 backup workflow
by hand, then restore its file into `parthub-db-restore` as above, count
users / orders / parts against production, and delete the drill database
(`npx wrangler d1 delete parthub-db-restore`). Note the date here:
- (no drill yet)

## 3. Roll back a bad release

**API** (errors after a deploy, health check red):

```bash
cd workers/api
npx wrangler deployments list          # find the last good version
npx wrangler rollback <version-id>     # or: npx wrangler rollback (the previous one)
```

A rollback does **not** undo migrations. Migrations here only add tables
and columns (never drop or rename), so an older API keeps working on the
newer schema. Keep it that way: a migration that removes or renames
something needs its own plan.

**Sites**: Cloudflare › Workers & Pages › the project (`parthub-platform`,
`parthub-platform-seller`, `parthub-platform-admin`) › Deployments › the last
good one › **Rollback to this deployment**.

Then fix forward on a branch, merge, deploy as usual.

## 4. Release steps
1. CI green on the pull request (typecheck, lint, API tests, 3 builds).
2. Merge → Deploy API (runs the D1 migrations first, then the schema
   verify gate; a failed verify stops the deploy) → Deploy Pages.
3. Check: `https://api.parthub.autos/api/v1/health` (database ok), the
   prod-health workflow, one page per site.
4. A release: bump the versions, CHANGELOG entry, tag `vX.Y.Z` on the
   merge commit.

## 5. Incidents

| Symptom | First look | Then |
|---|---|---|
| API errors (500) | Cloudflare › parthub-api › **Logs** (must be on): find the `request_id` the app shows | Roll back (§3) if it started with a deploy |
| "Session expired" for everyone | `JWT_SECRET` changed? | Users sign in again; nothing else to do |
| WhatsApp not sending | Admin › WhatsApp (failures, last error) and › Templates | Meta token expired → System user token (never a 24 h token); template paused → read statuses |
| D1 "read limit" warnings | Free plan daily limits | Wait for the reset (UTC midnight) or move to Workers Paid |
| A seller or admin account misused | Admin › Activity log | Suspend the account; its sessions end at once (`token_version`); change secrets it could see |
| Data deleted by mistake | Activity log for when | Time Travel (§2) |

Keep this file next to the code: change it when the infrastructure changes.
