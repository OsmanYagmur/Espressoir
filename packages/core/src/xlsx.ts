/**
 * A one-sheet Excel workbook (.xlsx) without a package: the file is a zip of a few XML
 * parts, written here uncompressed ("stored"), which every spreadsheet program reads. Cells
 * are inline text, so nothing a stranger typed can ever run as a formula. The first row is
 * the header: bold, frozen while scrolling.
 */

export interface SheetColumn {
  title: string;
  /** In characters, as Excel counts them. */
  width: number;
  /** Long text (a question, a note): wrapped inside its cell. */
  wrap?: boolean;
}

const encoder = new TextEncoder();

// ── zip ─────────────────────────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** A zip of the given files, uncompressed; names are UTF-8 (flag bit 11). */
export function zipStored(
  files: readonly { name: string; data: Uint8Array }[],
): Uint8Array<ArrayBuffer> {
  const DATE_1980_01_01 = (0 << 9) | (1 << 5) | 1;
  const UTF8 = 0x0800;
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, UTF8, true);
    header.setUint16(8, 0, true); // stored
    header.setUint16(10, 0, true);
    header.setUint16(12, DATE_1980_01_01, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, size, true);
    header.setUint32(22, size, true);
    header.setUint16(26, name.length, true);
    header.setUint16(28, 0, true);
    local.push(new Uint8Array(header.buffer), name, file.data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, UTF8, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, DATE_1980_01_01, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + size;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

// ── the workbook ────────────────────────────────────────────────────────────────────────

/** Text for XML: escaped, and without the control characters XML 1.0 does not allow. */
const xmlText = (value: string) =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** "A", "B", … "Z", "AA": the column's letters. */
export function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** Excel's rules for a sheet's name: at most 31 characters, none of : \ / ? * [ ]. */
const sheetName = (name: string) => name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Sayfa 1";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE = "application/vnd.openxmlformats-officedocument";

// Cell styles: 0 plain, 1 bold (the header), 2 wrapped at the top (long text), 3 at the top.
const STYLES = `${XML}<styleSheet xmlns="${MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** The whole workbook: one sheet, the columns' titles, then the rows (text cells). */
export function xlsxWorkbook(
  name: string,
  columns: readonly SheetColumn[],
  rows: readonly (readonly string[])[],
): Uint8Array<ArrayBuffer> {
  const cell = (ref: string, value: string, style: number) =>
    value === ""
      ? ""
      : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
  const header = columns.map((column, index) => cell(`${columnName(index)}1`, column.title, 1));
  const body = rows.map(
    (row, rowIndex) =>
      `<row r="${rowIndex + 2}">${row
        .map((value, index) =>
          cell(`${columnName(index)}${rowIndex + 2}`, value, columns[index]?.wrap ? 2 : 3),
        )
        .join("")}</row>`,
  );
  const widths = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
    )
    .join("");
  const sheet = `${XML}<worksheet xmlns="${MAIN}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData><row r="1">${header.join("")}</row>${body.join("")}</sheetData></worksheet>`;

  const parts: Record<string, string> = {
    "[Content_Types].xml": `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${OFFICE}.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${OFFICE}.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${OFFICE}.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `${XML}<Relationships xmlns="${PACKAGE_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="${xmlText(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML}<Relationships xmlns="${PACKAGE_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": sheet,
    "xl/styles.xml": STYLES,
  };
  return zipStored(
    Object.entries(parts).map(([file, text]) => ({ name: file, data: encoder.encode(text) })),
  );
}
