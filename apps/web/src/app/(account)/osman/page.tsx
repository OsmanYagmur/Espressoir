import { COMMUNITY_METRICS } from "@espressoir/core";
import { communityStatSchema, type TypedSupabaseClient } from "@espressoir/db";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FieldStrip } from "@/components/site/field-strip";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { BarTable } from "@/components/stats/bar-table";
import { DayColumns } from "@/components/stats/day-columns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Capacity } from "@/components/workshop/event-card";
import { VISIT_REPORT_DAYS, getVisitReport } from "@/lib/analytics/ga-report";
import { formatAverage } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { workshopWhen } from "@/lib/workshop-format";

import { AdminArea } from "./admin-area";
import { readWorkshopAdmin, workshopPulse } from "./atolyeler/data";

export const metadata: Metadata = {
  title: t.admin.title,
  robots: { index: false, follow: false },
};

const o = t.admin.overview;
const link = "text-accent-ink underline underline-offset-3";

/** The last 28 days from Google Analytics, or what stands in the way. */
async function Visits({ formApplications }: { formApplications: number }) {
  const result = await getVisitReport();
  if (result.state !== "ready") {
    return (
      <Card>
        <p>{result.state === "failed" ? o.visitsFailed : o.visitsNotConfigured}</p>
      </Card>
    );
  }

  const { report } = result;
  const devices = o.devices as Record<string, string>;
  return (
    <div className="flex flex-col gap-8">
      <FieldStrip
        fields={[
          { label: o.users, value: report.totals.users },
          { label: o.sessions, value: report.totals.sessions },
          { label: o.views, value: report.totals.views },
        ]}
      />
      {report.workshopViews > 0 ? (
        <p>
          {format(o.workshopFunnel, {
            views: report.workshopViews,
            applications: formApplications,
            rate: formatAverage(Math.round((formApplications / report.workshopViews) * 1000) / 10),
          })}
        </p>
      ) : null}
      <div>
        <h3 className="mb-2 type-label">{o.perDayTitle}</h3>
        <DayColumns
          days={report.perDay.map(({ day, views }) => ({ day, count: views }))}
          caption={o.perDayTitle}
          label={(day, count) => format(o.dayViews, { day, count })}
          columns={[o.dayColumn, o.viewsColumn]}
        />
      </div>
      <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 type-label">{o.pagesTitle}</h3>
          <BarTable
            caption={o.pagesTitle}
            rows={report.pages.map(({ path, views }) => ({
              key: path,
              label: <span className="font-mono text-sm">{path}</span>,
              value: views,
            }))}
          />
        </div>
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="mb-2 type-label">{o.sourcesTitle}</h3>
            <BarTable
              caption={o.sourcesTitle}
              rows={report.sources.map(({ source, sessions }) => ({
                key: source,
                label: source === "(direct)" ? o.direct : source,
                value: sessions,
              }))}
            />
          </div>
          <div>
            <h3 className="mb-2 type-label">{o.devicesTitle}</h3>
            <BarTable
              caption={o.devicesTitle}
              rows={report.devices.map(({ device, users }) => ({
                key: device,
                label: devices[device] ?? device,
                value: users,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Members, tastings and the rest, in total and over the last week. */
async function Community({ supabase }: { supabase: TypedSupabaseClient }) {
  const { data, error } = await supabase.rpc("admin_community_stats_v1");
  // A database without this step's migration: the section waits for it.
  if (error || !data) return null;
  const stats = new Map(data.map((row) => [row.metric, communityStatSchema.parse(row)]));
  return (
    <Section id="topluluk">
      <SectionHeading id="topluluk" title={o.communityTitle} hint={o.communityHint} />
      <FieldStrip
        className="md:grid-cols-4"
        fields={COMMUNITY_METRICS.map((metric) => {
          const stat = stats.get(metric);
          return {
            label: o.metrics[metric],
            value: stat?.total ?? 0,
            note: stat?.lastWeek ? format(o.lastWeek, { count: stat.lastWeek }) : undefined,
          };
        })}
      />
    </Section>
  );
}

async function Overview({ supabase }: { supabase: TypedSupabaseClient }) {
  const { workshops, applications } = await readWorkshopAdmin(supabase);
  const { open, formApplications } = workshopPulse(workshops, applications, VISIT_REPORT_DAYS);

  return (
    <>
      <SectionHeading id="ziyaretler" title={o.visitsTitle} hint={o.visitsHint} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Visits formApplications={formApplications} />
      </Suspense>

      <Community supabase={supabase} />

      <Section id="acik-atolyeler">
        <SectionHeading
          id="acik-atolyeler"
          title={o.workshopsTitle}
          aside={
            <Link href="/osman/atolyeler" prefetch={false} className={link}>
              {o.workshopsLink}
            </Link>
          }
        />
        {open.length === 0 ? (
          <p className="text-ink-2">{o.workshopsEmpty}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {open.map((workshop) => {
              const mine = applications.filter(({ workshopId }) => workshopId === workshop.id);
              return (
                <li key={workshop.id}>
                  <Card className="flex h-full flex-col gap-2">
                    <Link
                      href={`/osman/atolyeler#atolye-${workshop.id}` as Route}
                      prefetch={false}
                      className="type-card-title text-ink no-underline hover:underline"
                    >
                      {workshop.title}
                    </Link>
                    <p className="type-meta">{workshopWhen(workshop).full}</p>
                    <Capacity workshop={workshop} />
                    <p className="type-meta">
                      {format(o.workshopLine, {
                        applications: mine.length,
                        approved: mine.filter(({ status }) => status === "approved").length,
                      })}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function OverviewPage() {
  return <AdminArea tab="overview">{({ supabase }) => <Overview supabase={supabase} />}</AdminArea>;
}
