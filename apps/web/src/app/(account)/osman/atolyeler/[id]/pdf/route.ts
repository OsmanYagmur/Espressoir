import { siteConfig } from "@espressoir/core";

import { applicationsPdf, type PdfColumn } from "@/lib/applications-pdf";
import { t } from "@/lib/i18n";

import { downloadHeaders, exportRow, readWorkshopExport } from "../export";

const c = t.admin.workshops.exportColumns;

const downloadedFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: siteConfig.timeZone,
});

// A4 landscape leaves 762 points between the margins; the question takes what is left.
const COLUMNS: readonly PdfColumn[] = [
  { title: "#", width: 24, value: (_, index) => String(index + 1) },
  { title: c.name, width: 118, value: (a) => exportRow(a).name },
  { title: c.contact, width: 100, value: (a) => exportRow(a).contact },
  { title: c.experience, width: 88, value: (a) => exportRow(a).experience },
  { title: c.status, width: 66, value: (a) => exportRow(a).status },
  {
    title: c.attendance,
    width: 58,
    value: (a) => exportRow(a).attendance,
    // A box to tick on the day, for the people with a seat.
    box: (a) => a.status === "approved",
  },
  { title: c.rsvp, width: 90, value: (a) => exportRow(a).rsvp },
  { title: c.question, width: 218, value: (a) => exportRow(a).question },
];

/**
 * A workshop's applications as a PDF for the day: approved people first, their answer to
 * "are you coming?", a box to tick when they arrive, long questions wrapped. The time
 * each one applied is in the Excel file. Admins only; anyone else gets a 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/osman/atolyeler/[id]/pdf">,
) {
  const data = await readWorkshopExport((await params).id);
  if (!data) return new Response(null, { status: 404 });

  const pdf = await applicationsPdf(
    data.workshop,
    data.applications,
    COLUMNS,
    downloadedFormat.format(new Date()),
  );
  return new Response(pdf, { headers: downloadHeaders("application/pdf", `${data.fileName}.pdf`) });
}
