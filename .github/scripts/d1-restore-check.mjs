// Proves a D1 SQL export restores: loads it into an empty in-memory SQLite
// (node:sqlite, Node 22.5+) and checks tables, key rows and integrity.
// Usage: node d1-restore-check.mjs backup.sql   (exit 1 when it does not)
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const file = process.argv[2];
const db = new DatabaseSync(":memory:");
try {
  db.exec(readFileSync(file, "utf8"));
} catch (err) {
  console.log(`::error::the export does not load: ${err.message}`);
  process.exit(1);
}
const one = (sql) => Object.values(db.prepare(sql).get())[0];
const tables = one("select count(*) from sqlite_master where type = 'table'");
const counts = Object.fromEntries(["users", "sellers", "parts", "orders", "vehicle_generations", "vehicle_engines"].map((t) => [t, one(`select count(*) from ${t}`)]));
const integrity = one("PRAGMA integrity_check");
console.log(JSON.stringify({ tables, ...counts, integrity }));
const bad = [];
if (tables < 40) bad.push(`only ${tables} tables`);
if (counts.users < 1) bad.push("no users");
if (counts.vehicle_generations < 400) bad.push("vehicle catalog missing");
if (integrity !== "ok") bad.push(`integrity: ${integrity}`);
if (bad.length) {
  console.log(`::error::the export does not restore to a usable database: ${bad.join(", ")}`);
  process.exit(1);
}
console.log("Restore check OK");
