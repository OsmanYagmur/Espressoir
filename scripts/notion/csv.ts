/** Notion (like Excel) starts its CSV and Markdown exports with a byte order mark. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Minimal RFC 4180 CSV reader: quoted fields, doubled quotes, commas and line breaks inside
 * quotes, CRLF or LF. Enough for a Notion export, with no dependency to keep up to date.
 */
export function parseCsv(text: string): string[][] {
  const input = stripBom(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error("CSV bozuk: kapatılmamış tırnak işareti var.");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface CsvRecord {
  /** 1-based line of the record in the file (the header is line 1), for reports. */
  line: number;
  values: Record<string, string>;
}

/** Reads a CSV with a header row into records keyed by column name. Blank rows are dropped. */
export function parseCsvRecords(text: string): { header: string[]; records: CsvRecord[] } {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) throw new Error("CSV boş.");
  const header = headerRow.map((name) => name.trim());

  const records: CsvRecord[] = [];
  rows.forEach((cells, index) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const values: Record<string, string> = {};
    header.forEach((name, column) => {
      values[name] = cells[column] ?? "";
    });
    records.push({ line: index + 2, values });
  });
  return { header, records };
}
