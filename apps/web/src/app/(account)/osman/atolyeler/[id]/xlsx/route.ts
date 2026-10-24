import { xlsxWorkbook, type SheetColumn } from "@espressoir/core";

import { t } from "@/lib/i18n";

import { downloadHeaders, EXPORT_COLUMNS, exportRow, readWorkshopExport } from "../export";

const w = t.admin.workshops;

const WIDTHS: Record<(typeof EXPORT_COLUMNS)[number], number> = {
  name: 26,
  contact: 20,
  experience: 18,
  status: 14,
  attendance: 12,
  source: 10,
  createdAt: 18,
  question: 60,
};

/**
 * A workshop's applications as an Excel workbook (also opens in Numbers, Google Sheets
 * and pandas: `read_excel(path)`). Every cell is text, so a name typed as "=…" stays a
 * name. Admins only; anyone else gets a 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/osman/atolyeler/[id]/xlsx">,
) {
  const data = await readWorkshopExport((await params).id);
  if (!data) return new Response(null, { status: 404 });

  const columns: SheetColumn[] = EXPORT_COLUMNS.map((column) => ({
    title: w.exportColumns[column],
    width: WIDTHS[column],
    wrap: column === "question",
  }));
  const rows = data.applications.map((application) => {
    const row = exportRow(application);
    return EXPORT_COLUMNS.map((column) => row[column]);
  });
  const workbook = xlsxWorkbook(w.exportSheet, columns, rows);

  return new Response(workbook, {
    headers: downloadHeaders(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `${data.fileName}.xlsx`,
    ),
  });
}
