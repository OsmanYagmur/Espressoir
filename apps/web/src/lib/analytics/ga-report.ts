import "server-only";

import { createSign } from "node:crypto";

import { z } from "zod";

/**
 * The visits of the last 28 days from Google Analytics, for the admin overview. Read with
 * the Data API as a service account the owner added to the property as a viewer
 * (docs/setup-analytics.md). The key is read here and nowhere else, and only for /osman,
 * after the admin check. Without the three settings the overview says what is missing.
 */
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** The days the report covers; the overview counts applications over the same stretch. */
export const VISIT_REPORT_DAYS = 28;

function settings() {
  const propertyId = process.env.GA_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA_SERVICE_ACCOUNT_EMAIL?.trim();
  // Vercel keeps a multi-line value as typed; pasted with "\n" escapes, it is unescaped.
  const privateKey = process.env.GA_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n").trim();
  return propertyId && clientEmail && privateKey ? { propertyId, clientEmail, privateKey } : null;
}

/** A service account signs its own short-lived token request (OAuth 2.0 JWT bearer). */
async function accessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`token request answered ${response.status}`);
  return z.object({ access_token: z.string() }).parse(await response.json()).access_token;
}

const reportSchema = z.object({
  rows: z
    .array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })).default([]),
        metricValues: z.array(z.object({ value: z.string() })),
      }),
    )
    .default([]),
});

type Row = { dimensions: string[]; metrics: number[] };

const range = [{ startDate: `${VISIT_REPORT_DAYS - 1}daysAgo`, endDate: "today" }];

const REPORTS = {
  totals: { metrics: ["activeUsers", "sessions", "screenPageViews"] },
  perDay: {
    dimensions: ["date"],
    metrics: ["screenPageViews"],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  },
  pages: {
    dimensions: ["pagePath"],
    metrics: ["screenPageViews"],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  },
  sources: {
    dimensions: ["sessionSource"],
    metrics: ["sessions"],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 8,
  },
  devices: {
    dimensions: ["deviceCategory"],
    metrics: ["activeUsers"],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  },
} as const;

/**
 * The workshop pages (/workshop and each workshop's own), in one sum; /atolye is where they
 * were until 2026-10-24, so earlier visits still count.
 */
const WORKSHOP_PAGES = {
  metrics: ["screenPageViews"],
  dimensionFilter: {
    orGroup: {
      expressions: ["/workshop", "/atolye"].map((value) => ({
        filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value } },
      })),
    },
  },
};

const request = ({
  dimensions = [],
  metrics,
  ...rest
}: {
  dimensions?: readonly string[];
  metrics: readonly string[];
  [key: string]: unknown;
}) => ({
  dateRanges: range,
  dimensions: dimensions.map((name) => ({ name })),
  metrics: metrics.map((name) => ({ name })),
  ...rest,
});

interface VisitReport {
  days: number;
  totals: { users: number; sessions: number; views: number };
  /** YYYY-MM-DD, oldest first; days without a visit are missing. */
  perDay: { day: string; views: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; sessions: number }[];
  devices: { device: string; users: number }[];
  workshopViews: number;
}

export type VisitReportResult =
  { state: "ready"; report: VisitReport } | { state: "not_configured" } | { state: "failed" };

export async function getVisitReport(): Promise<VisitReportResult> {
  const config = settings();
  if (!config) return { state: "not_configured" };

  try {
    const token = await accessToken(config.clientEmail, config.privateKey);
    const call = async (path: string, body: object) => {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:${path}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(`${path} answered ${response.status}`);
      return response.json() as Promise<unknown>;
    };
    const rows = (report: unknown): Row[] =>
      reportSchema.parse(report).rows.map((row) => ({
        dimensions: row.dimensionValues.map(({ value }) => value),
        metrics: row.metricValues.map(({ value }) => Number(value) || 0),
      }));

    // The Data API answers at most five reports in one batch; the sixth goes on its own.
    const [batch, workshop] = await Promise.all([
      call("batchRunReports", { requests: Object.values(REPORTS).map(request) }),
      call("runReport", request(WORKSHOP_PAGES)),
    ]);
    const [totals, perDay, pages, sources, devices] = z
      .object({ reports: z.array(z.unknown()).length(5) })
      .parse(batch)
      .reports.map(rows);
    const [total] = totals ?? [];

    return {
      state: "ready",
      report: {
        days: VISIT_REPORT_DAYS,
        totals: {
          users: total?.metrics[0] ?? 0,
          sessions: total?.metrics[1] ?? 0,
          views: total?.metrics[2] ?? 0,
        },
        perDay: (perDay ?? []).map(({ dimensions: [date = ""], metrics: [views = 0] }) => ({
          // GA writes dates as 20261024.
          day: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
          views,
        })),
        pages: (pages ?? []).map(({ dimensions: [path = ""], metrics: [views = 0] }) => ({
          path,
          views,
        })),
        sources: (sources ?? []).map(({ dimensions: [source = ""], metrics: [sessions = 0] }) => ({
          source,
          sessions,
        })),
        devices: (devices ?? []).map(({ dimensions: [device = ""], metrics: [users = 0] }) => ({
          device,
          users,
        })),
        workshopViews: rows(workshop)[0]?.metrics[0] ?? 0,
      },
    };
  } catch (error) {
    console.error("[analytics] report failed:", error instanceof Error ? error.message : error);
    return { state: "failed" };
  }
}
