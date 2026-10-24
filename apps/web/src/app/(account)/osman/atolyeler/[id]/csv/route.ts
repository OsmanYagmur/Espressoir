import { siteConfig, slugify } from "@espressoir/core";
import {
  WORKSHOP_APPLICATION_SELECT,
  workshopApplicationRowSchema,
  type WorkshopApplication,
} from "@espressoir/db";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";

const w = t.admin.workshops;

const stampFormat = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: siteConfig.timeZone,
});

/**
 * One cell. Quoted when it holds the separator, a quote or a line break. A cell that
 * starts like a formula (=, +, -, @) gets an apostrophe first: names and handles come
 * from strangers, and a spreadsheet would run "=…" as a formula.
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function row(application: WorkshopApplication): string[] {
  const states = w.attendanceStates;
  return [
    application.name,
    application.contact,
    t.workshop.form.experiences[application.experience].title,
    application.question ?? "",
    w.statuses[application.status],
    application.attended === null ? "" : application.attended ? states.came : states.missed,
    w.sources[application.source],
    stampFormat.format(new Date(application.createdAt)),
  ];
}

/**
 * A workshop's applications as a CSV file for a spreadsheet or Python: semicolons and a
 * byte order mark, so Excel set to Turkish opens the columns and the letters as they are
 * (pandas: `read_csv(path, sep=";")`). Admins only; anyone else gets a 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/osman/atolyeler/[id]/csv">,
) {
  const notFound = () => new Response(null, { status: 404 });
  const session = await getCurrentUser();
  const id = z.uuid().safeParse((await params).id);
  if (session?.user.role !== "admin" || !id.success) return notFound();

  const { supabase } = session;
  const [workshop, applications] = await Promise.all([
    supabase.from("workshops").select("title, starts_at").eq("id", id.data).maybeSingle(),
    supabase
      .from("workshop_applications")
      .select(WORKSHOP_APPLICATION_SELECT)
      .eq("workshop_id", id.data)
      .order("created_at"),
  ]);
  if (!workshop.data || applications.error) return notFound();

  const c = w.csvColumns;
  const lines = [
    [c.name, c.contact, c.experience, c.question, c.status, c.attendance, c.source, c.createdAt],
    ...applications.data.map((application) => row(workshopApplicationRowSchema.parse(application))),
  ].map((cells) => cells.map(cell).join(";"));
  const day = workshop.data.starts_at.slice(0, 10);
  const file = `${slugify(workshop.data.title)}-${day}-${w.csvFile}.csv`;

  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${file}"`,
      "cache-control": "no-store",
    },
  });
}
