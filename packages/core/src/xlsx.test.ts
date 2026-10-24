import { crc32 as nodeCrc32 } from "node:zlib";

import { describe, expect, it } from "vitest";

import { columnName, crc32, utf8, xlsxWorkbook, zipStored } from "./xlsx";

const decoder = new TextDecoder();

/** Reads a stored zip back through its central directory: name → text. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const localName = view.getUint16(offset + 26, true);
    const data = bytes.subarray(offset + 30 + localName, offset + 30 + localName + size);
    expect(crc32(data), name).toBe(crc);
    files.set(name, decoder.decode(data));
    at += 46 + nameLength;
  }
  return files;
}

describe("crc32", () => {
  it("agrees with zlib", () => {
    const bytes = new TextEncoder().encode("Kahve 101 — çekirdek, öğütme, ışık");
    expect(crc32(bytes)).toBe(nodeCrc32(bytes));
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("utf8", () => {
  it("encodes like TextEncoder, Turkish letters, emoji and lone surrogates included", () => {
    for (const text of ["", "Kahve", "ğüşıöç ĞÜŞİÖÇ", "€ — ☕", "kahve 🫘 çekirdek", "a\ud800b"]) {
      expect([...utf8(text)], text).toEqual([...new TextEncoder().encode(text)]);
    }
  });
});

describe("zipStored", () => {
  it("writes every file so it can be read back", () => {
    const files = unzip(
      zipStored([
        { name: "a.txt", data: new TextEncoder().encode("bir") },
        { name: "klasör/b.txt", data: new TextEncoder().encode("iki") },
      ]),
    );
    expect([...files]).toEqual([
      ["a.txt", "bir"],
      ["klasör/b.txt", "iki"],
    ]);
  });
});

describe("xlsxWorkbook", () => {
  it("is one sheet with a bold header and escaped text cells", () => {
    const files = unzip(
      xlsxWorkbook(
        "Kahve 101: başvurular",
        [
          { title: "Ad", width: 24 },
          { title: "Soru", width: 40, wrap: true },
        ],
        [
          ["Ayşe <Yılmaz>", '=HYPERLINK("x")\u0007 & ne?'],
          ["Ali", ""],
        ],
      ),
    );
    expect([...files.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
      "xl/styles.xml",
    ]);
    // ":" is not allowed in a sheet's name.
    expect(files.get("xl/workbook.xml")).toContain('name="Kahve 101  başvurular"');
    const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Ad</t>');
    expect(sheet).toContain("Ayşe &lt;Yılmaz&gt;");
    // Text, never a formula; the control character is gone.
    expect(sheet).toContain(
      '<c r="B2" s="2" t="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;x&quot;) &amp; ne?</t>',
    );
    expect(sheet).not.toContain("<f>");
    // An empty value is an empty cell.
    expect(sheet).toContain('<row r="3"><c r="A3" s="3" t="inlineStr">');
    expect(sheet).not.toContain('r="B3"');
  });

  it("names the columns like Excel", () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual([
      "A",
      "B",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
      "ZZ",
      "AAA",
    ]);
  });
});
