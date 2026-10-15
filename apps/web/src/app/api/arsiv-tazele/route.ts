import { expireArchive } from "@/lib/data/refresh-archive";
import { createPublicClient } from "@/lib/supabase/public";

/** Calls one member may make in a minute (per server instance; a guard, not a quota). */
const PER_MINUTE = 20;
const recent = new Map<string, number[]>();

function tooMany(userId: string): boolean {
  const now = Date.now();
  const calls = (recent.get(userId) ?? []).filter((at) => now - at < 60_000);
  calls.push(now);
  recent.set(userId, calls);
  return calls.length > PER_MINUTE;
}

/**
 * The mobile app writes to Supabase directly; this makes the website show what it wrote
 * at once instead of within the hour. Only a signed-in member may ask (their access token
 * as `Authorization: Bearer …`, checked with the auth server); all it does is expire the
 * archive's cache, so it needs no secret and changes no data.
 */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  let userId: string | undefined;
  try {
    const { data } = await createPublicClient().auth.getUser(token);
    userId = data.user?.id;
  } catch {
    // No auth server to ask (the offline preview): the same answer as a bad token.
  }
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (tooMany(userId)) return Response.json({ error: "rate_limited" }, { status: 429 });

  expireArchive();
  return Response.json({ ok: true });
}
