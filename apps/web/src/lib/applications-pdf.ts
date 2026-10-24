import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import type { Workshop, WorkshopApplication } from "@espressoir/db";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { designTokens } from "@/lib/design-tokens";
import { format, t } from "@/lib/i18n";
import { workshopWhen } from "@/lib/workshop-format";

const w = t.admin.workshops;

// A4 landscape, in points.
const PAGE = { width: 842, height: 595 } as const;
const MARGIN = 40;
const SIZE = 9;
const LINE = 12;
const PAD = 5;

const color = (token: keyof (typeof designTokens)["light"]) => {
  const hex = designTokens.light[token].slice(1);
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  return rgb(r ?? 0, g ?? 0, b ?? 0);
};

/** The site's own Archivo (src/assets/fonts, shipped with the functions): it has ğ, ş, ı, İ. */
const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

/** Splits a text into lines that fit `width`; a word longer than a line is cut. */
function wrap(text: string, typeface: PDFFont, width: number): string[] {
  const fits = (line: string) => typeface.widthOfTextAtSize(line, SIZE) <= width;
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (!fits(rest)) {
        let cut = rest.length - 1;
        while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

export interface PdfColumn {
  title: string;
  width: number;
  /** The value of one application in this column. */
  value: (application: WorkshopApplication, index: number) => string;
  /** Draws an empty box to tick by hand when the value is empty (attendance). */
  box?: (application: WorkshopApplication) => boolean;
}

/**
 * A workshop's applications as a PDF for printing or sending: the title, the day and the
 * place, the numbers, then one row per application under a header that repeats on every
 * page. Long questions wrap inside their cell. Every page ends with when it was downloaded
 * and its number.
 */
export async function applicationsPdf(
  workshop: Workshop,
  applications: readonly WorkshopApplication[],
  columns: readonly PdfColumn[],
  downloadedAt: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${workshop.title} · ${w.exportSheet}`);
  doc.setCreator("Espressoir");
  const [regular, bold] = await Promise.all([
    font("archivo-400-normal.woff").then((bytes) => doc.embedFont(bytes, { subset: true })),
    font("archivo-600-normal.woff").then((bytes) => doc.embedFont(bytes, { subset: true })),
  ]);

  const tableWidth = PAGE.width - MARGIN * 2;
  let page: PDFPage = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const text = (value: string, x: number, at: number, size = SIZE, typeface = regular) =>
    page.drawText(value, { x, y: at, size, font: typeface, color: color("ink") });

  // The title block, on the first page only.
  text(workshop.title, MARGIN, y - 18, 18, bold);
  y -= 34;
  const when = workshopWhen(workshop).full;
  page.drawText(workshop.locationText ? `${when} · ${workshop.locationText}` : when, {
    x: MARGIN,
    y: y - 10,
    size: 10,
    font: regular,
    color: color("ink-2"),
  });
  y -= 16;
  const count = (status: WorkshopApplication["status"]) =>
    applications.filter((application) => application.status === status).length;
  page.drawText(
    format(w.pdf.summary, {
      total: applications.length,
      approved: count("approved"),
      pending: count("pending"),
      waitlist: count("waitlist"),
      capacity: workshop.capacity,
    }),
    { x: MARGIN, y: y - 10, size: 10, font: regular, color: color("ink-2") },
  );
  y -= 28;

  const header = () => {
    const height = LINE + PAD * 2;
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: tableWidth,
      height,
      color: color("sunk"),
    });
    let x = MARGIN;
    for (const column of columns) {
      text(column.title, x + PAD, y - PAD - SIZE, SIZE, bold);
      x += column.width;
    }
    y -= height;
  };

  if (applications.length === 0) {
    text(w.applicationsEmpty, MARGIN, y - 12, 11);
  } else {
    header();
    applications.forEach((application, index) => {
      const cells = columns.map((column) =>
        wrap(column.value(application, index), regular, column.width - PAD * 2),
      );
      const height = Math.max(...cells.map((lines) => lines.length)) * LINE + PAD * 2;
      if (y - height < MARGIN + 20) {
        page = doc.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
        header();
      }
      let x = MARGIN;
      columns.forEach((column, at) => {
        const lines = cells[at] ?? [];
        lines.forEach((line, row) => text(line, x + PAD, y - PAD - SIZE - row * LINE));
        if (column.box?.(application) && lines.join("") === "") {
          page.drawRectangle({
            x: x + PAD,
            y: y - PAD - SIZE - 1,
            width: 10,
            height: 10,
            borderColor: color("line-strong"),
            borderWidth: 0.75,
          });
        }
        x += column.width;
      });
      y -= height;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + tableWidth, y },
        thickness: 0.5,
        color: color("line"),
      });
    });
  }

  // Every page's foot: when it was downloaded, and "Sayfa 2 / 3".
  const pages = doc.getPages();
  pages.forEach((each, index) => {
    const foot = { y: MARGIN - 20, size: 8, font: regular, color: color("ink-2") };
    each.drawText(`Espressoir · ${format(w.pdf.downloaded, { time: downloadedAt })}`, {
      x: MARGIN,
      ...foot,
    });
    const number = format(w.pdf.page, { page: index + 1, pages: pages.length });
    each.drawText(number, {
      x: PAGE.width - MARGIN - regular.widthOfTextAtSize(number, 8),
      ...foot,
    });
  });

  // A copy on a plain ArrayBuffer, which a Response body takes.
  return new Uint8Array(await doc.save());
}
