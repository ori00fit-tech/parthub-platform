// CSV for the bulk part import (see pages/PartImportPage.jsx).

// File bytes → text. Excel on Windows often saves CSV in Windows-1252
// rather than UTF-8; accents would come out broken, so fall back to it.
export function decodeCsv(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

// The separator used by the header line: ";" (Excel in French), "," or tab.
export function detectDelimiter(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

// RFC 4180 parser: quoted fields, "" inside quotes, line breaks inside
// quotes, CRLF. Returns an array of rows (arrays of strings).
export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
}

// Rows → objects keyed by the header line, with each object's line
// number in the file (header = line 1).
export function csvObjects(text) {
  const [header = [], ...body] = parseCsv(text);
  const keys = header.map((h) => String(h).trim());
  return {
    columns: keys.filter(Boolean),
    rows: body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, String(cells[i] ?? "").trim()]).filter(([k]) => k))),
  };
}

const quote = (v) => {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// A file Excel opens with accents intact (UTF-8 BOM) and columns split
// (";" separator).
export function toCsv(rows) {
  return `﻿${rows.map((r) => r.map(quote).join(";")).join("\r\n")}\r\n`;
}
