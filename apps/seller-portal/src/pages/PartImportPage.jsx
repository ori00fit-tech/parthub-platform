import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { csvObjects, decodeCsv, toCsv } from "../lib/csv";
import { useT } from "../i18n";

// Bulk import from a spreadsheet saved as CSV. The file is read in the
// browser, checked by the API (dry run), then imported in chunks of 50
// rows (API: POST /api/v1/marketplace/me/parts/import, see
// workers/api/src/utils/part-import.ts).

const CHUNK = 50;
const MAX_ROWS = 1000;

// Template columns: French names, the usual spreadsheet language here. The
// API also accepts English and Arabic names.
const TEMPLATE = [
  ["Titre", "Catégorie", "Prix", "Quantité", "État", "Origine", "Marque", "Référence", "Numéros OEM", "Véhicules", "Description", "Photo"],
  ["Plaquettes de frein avant", "Freinage", "350", "4", "neuf", "adaptable", "Bosch", "PLQ-001", "7701 208 174", "Dacia Logan 2012-2020; Renault Clio IV", "Jeu de 4 plaquettes", ""],
  ["Alternateur 1.5 dCi", "Électricité", "1 200,50", "1", "occasion", "origine", "", "ALT-015", "8200 660 034", "Renault Clio 2006-2012", "Testé, garantie 1 mois", ""],
];

const COLUMN_HELP = [
  ["Titre", "Name of the part, as buyers search it.", true],
  ["Catégorie", "Freinage, Filtres, Moteur, Suspension, Électricité, Refroidissement… (or the English name).", true],
  ["Prix", "In dirhams: 350 or 1 200,50.", true],
  ["Quantité", "Stock. Empty = 1.", false],
  ["État", "neuf, occasion or reconditionné. Empty = neuf.", false],
  ["Origine", "origine (OEM), adaptable (aftermarket) or occasion.", false],
  ["Marque", "Brand of the part (Bosch, Valeo…), as in the catalog.", false],
  ["Référence", "Your own code. Import the file again later: rows with a known reference update price and stock instead of creating a new part.", false],
  ["Numéros OEM", "Original numbers, separated by ;", false],
  ["Véhicules", "Make, model (or generation) and years, separated by ; e.g. Dacia Logan 2012-2020; Renault Clio IV", false],
  ["Description", "Details for the buyer.", false],
  ["Photo", "Link to a photo (https://…). You can also add photos later.", false],
];

function downloadTemplate() {
  const blob = new Blob([toCsv(TEMPLATE)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "parthub-import-modele.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Message({ m, t }) {
  return <>{t(m.text, m.params)}</>;
}

export default function PartImportPage() {
  const t = useT();
  const [file, setFile] = useState(null); // { name, rows, columns }
  const [fileError, setFileError] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | checking | checked | importing | done
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(null); // { created, updated, errors }
  const [error, setError] = useState("");

  async function onFile(e) {
    const f = e.target.files?.[0];
    setFile(null);
    setFileError("");
    setResults([]);
    setDone(null);
    setError("");
    setPhase("idle");
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setFileError(t("Save your spreadsheet as CSV (File › Save as › CSV) and choose that file."));
      return;
    }
    const { rows, columns } = csvObjects(decodeCsv(await f.arrayBuffer()));
    if (!rows.length) return setFileError(t("No rows found under the header line."));
    if (rows.length > MAX_ROWS) return setFileError(t("At most {n} rows per file. Split your file and import the parts in several steps.", { n: MAX_ROWS }));
    setFile({ name: f.name, rows, columns });
  }

  // Sends the rows in chunks; header = line 1, so rows start at line 2.
  async function run(dryRun) {
    setError("");
    setPhase(dryRun ? "checking" : "importing");
    setProgress(0);
    const all = [];
    const totals = { created: 0, updated: 0, errors: 0 };
    try {
      for (let i = 0; i < file.rows.length; i += CHUNK) {
        const res = await api.post("/api/v1/marketplace/me/parts/import", {
          rows: file.rows.slice(i, i + CHUNK),
          first_row: i + 2,
          dry_run: dryRun,
        });
        all.push(...(res?.data || []));
        totals.created += Number(res?.meta?.created || 0);
        totals.updated += Number(res?.meta?.updated || 0);
        totals.errors += Number(res?.meta?.errors || 0);
        setProgress(Math.min(file.rows.length, i + CHUNK));
      }
      setResults(all);
      if (dryRun) setPhase("checked");
      else {
        setDone(totals);
        setPhase("done");
      }
    } catch (err) {
      setResults(all);
      if (!dryRun && all.length) setDone(totals);
      setError(
        dryRun
          ? err?.message || t("Something went wrong. Please try again.")
          : t("The import stopped at line {line}: {message}. The lines before it are saved; remove them from the file before you import it again.", {
              line: all.length + 2,
              message: err?.message || "",
            })
      );
      setPhase(dryRun ? "idle" : "done");
    }
  }

  const count = (a) => results.filter((r) => r.action === a).length;
  const withNotes = results.filter((r) => r.errors.length || r.warnings.length);
  const busy = phase === "checking" || phase === "importing";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/parts" className="text-sm font-semibold text-blue-700 hover:underline">
          ← {t("Inventory")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{t("Import parts from a spreadsheet")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t("Add many parts at once, or update the price and stock of the ones you have. New parts are checked by PartHub before they appear to buyers.")}
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{t("1. Prepare your file")}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {t("Download the template, fill one line per part in Excel or Google Sheets, then save it as CSV.")}
        </p>
        <button type="button" onClick={downloadTemplate} className="mt-4 h-11 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-semibold text-blue-800 hover:bg-blue-100">
          {t("Download the template (CSV)")}
        </button>
        <details className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">{t("What goes in each column")}</summary>
          <dl className="mt-3 divide-y divide-gray-200 text-sm">
            {COLUMN_HELP.map(([name, help, required]) => (
              <div key={name} className="grid gap-1 py-2 sm:grid-cols-[160px_1fr]">
                <dt className="font-mono font-semibold text-gray-900" dir="ltr">
                  {name}
                  {required ? <span className="ms-1 text-red-700" title={t("Required")}>*</span> : null}
                </dt>
                <dd className="text-gray-600">{t(help)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{t("2. Choose the file and check it")}</h2>
        <label htmlFor="import-file" className="mt-4 block text-sm font-semibold text-gray-800">{t("CSV file")}</label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv,.txt"
          onChange={onFile}
          disabled={busy}
          className="mt-1 block w-full text-sm text-gray-700 file:me-3 file:h-11 file:rounded-xl file:border-0 file:bg-gray-900 file:px-4 file:text-sm file:font-semibold file:text-white"
        />
        {fileError ? <p className="mt-3 text-sm text-red-700" role="alert">{fileError}</p> : null}
        {file ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-700">
              {t("{file}: {n} lines found.", { file: file.name, n: file.rows.length })}{" "}
              <span className="text-gray-500" dir="ltr">({file.columns.join(", ")})</span>
            </p>
            {phase === "idle" || phase === "checking" ? (
              <button type="button" onClick={() => run(true)} disabled={busy} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
                {phase === "checking" ? t("Checking… {done}/{total}", { done: progress, total: file.rows.length }) : t("Check the file")}
              </button>
            ) : null}
          </div>
        ) : null}
        {error && phase !== "done" ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      </section>

      {results.length && phase !== "idle" ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{phase === "done" ? t("Import finished") : t("3. Review and import")}</h2>

          {done ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
              <p className="font-semibold">
                {t("{created} parts created, {updated} updated, {errors} lines skipped.", done)}
              </p>
              {done.created ? <p className="mt-1">{t("New parts are waiting for PartHub's check. Add photos to them from your inventory.")}</p> : null}
              <Link to="/parts" className="mt-3 inline-flex font-semibold text-emerald-900 underline">{t("Go to my inventory")}</Link>
            </div>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              <li className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">{t("{n} new parts", { n: count("create") })}</li>
              <li className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">{t("{n} price and stock updates", { n: count("update") })}</li>
              <li className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-800">{t("{n} lines with errors (skipped)", { n: count("error") })}</li>
            </ul>
          )}
          {error && phase === "done" ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}

          {withNotes.length ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-start text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-start">{t("Line")}</th>
                    <th scope="col" className="px-3 py-2 text-start">{t("Part")}</th>
                    <th scope="col" className="px-3 py-2 text-start">{t("To fix / to know")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withNotes.map((r) => (
                    <tr key={r.row} className={r.errors.length ? "bg-red-50/50" : ""}>
                      <td className="px-3 py-2 align-top font-mono text-gray-700">{r.row}</td>
                      <td className="px-3 py-2 align-top text-gray-900">{r.title || "—"}</td>
                      <td className="px-3 py-2 align-top">
                        <ul className="space-y-1">
                          {r.errors.map((m, i) => (
                            <li key={`e${i}`} className="text-red-800"><Message m={m} t={t} /></li>
                          ))}
                          {r.warnings.map((m, i) => (
                            <li key={`w${i}`} className="text-amber-800"><Message m={m} t={t} /></li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {phase === "checked" || phase === "importing" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => run(false)}
                disabled={busy || !(count("create") + count("update"))}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {phase === "importing"
                  ? t("Importing… {done}/{total}", { done: progress, total: file.rows.length })
                  : t("Import {n} lines", { n: count("create") + count("update") })}
              </button>
              {count("error") ? <p className="text-sm text-gray-600">{t("Lines with errors are skipped. Fix them in the file and import it again.")}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
