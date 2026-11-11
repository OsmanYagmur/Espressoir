import { siteConfig } from "@espressoir/core";
import { inviteRequestRowSchema, type TypedSupabaseClient } from "@espressoir/db";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { format, t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";

import { answerInviteRequest, cancelInvitation, inviteMember } from "./actions";
import { Empty } from "./empty";

const a = t.admin;
const field = "h-10";

// An invitation's link runs out within the hour, so the time it was sent matters.
const sentFormat = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

/**
 * Invitations: the way in while signup is closed. Uses the secret key (see
 * lib/supabase/admin.ts), and is rendered only for an admin (AdminArea).
 */
export async function Invitations() {
  const admin = createAdminClient();
  if (!admin) return <Empty>{a.invites.unavailable}</Empty>;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const pending = (data?.users ?? [])
    .filter((user) => user.invited_at && !user.email_confirmed_at && user.email)
    .sort((x, y) => (y.invited_at ?? "").localeCompare(x.invited_at ?? ""));

  return (
    <>
      <form action={inviteMember} className="grid gap-3 pb-2">
        <p className="type-meta">{a.invites.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="email"
            name="email"
            aria-label={a.invites.email}
            placeholder={a.invites.email}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={`${field} w-72 max-w-full`}
          />
          <Button type="submit" size="sm">
            {a.invites.send}
          </Button>
        </div>
      </form>

      <p className="pt-6 type-label">{a.invites.pendingTitle}</p>
      {error ? (
        <Empty>{a.invites.listFailed}</Empty>
      ) : pending.length === 0 ? (
        <Empty>{a.invites.pendingEmpty}</Empty>
      ) : (
        <ul aria-label={a.invites.pendingTitle} className="border-t border-line">
          {pending.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
            >
              <p className="min-w-0 [overflow-wrap:anywhere]">
                <span className="text-sm">{user.email}</span>{" "}
                <span className="type-meta">
                  {format(a.invites.sentAt, {
                    date: sentFormat.format(new Date(user.invited_at!)),
                  })}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <form action={inviteMember}>
                  <input type="hidden" name="email" value={user.email} />
                  <Button type="submit" variant="secondary" size="sm">
                    {a.invites.resend}
                  </Button>
                </form>
                <form action={cancelInvitation}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {a.invites.cancel}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Requests from the "Davet iste" form that nobody has answered yet, oldest first: one
 * button sends the invitation, the other closes the request. Read as the signed-in admin
 * (RLS); a database without the table yet says which migration is missing.
 */
export async function InviteRequests({ supabase }: { supabase: TypedSupabaseClient }) {
  const { data, error } = await supabase
    .from("invite_requests")
    .select("id, email, note, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return <Empty>{a.invites.requestsUnavailable}</Empty>;
  const requests = z.array(inviteRequestRowSchema).parse(data);
  if (requests.length === 0) return <Empty>{a.invites.requestsEmpty}</Empty>;

  return (
    <ul aria-label={a.invites.requestsTitle} className="border-t border-line">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
        >
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p>
              <span className="text-sm">{request.email}</span>{" "}
              <span className="type-meta">
                {format(a.invites.requestedAt, {
                  date: sentFormat.format(new Date(request.createdAt)),
                })}
              </span>
            </p>
            {/* Plain text, escaped by React. */}
            {request.note ? <p className="text-ink-2">{request.note}</p> : null}
          </div>
          <form action={answerInviteRequest} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="requestId" value={request.id} />
            <Button type="submit" name="answer" value="invite" size="sm">
              {a.invites.sendTo}
            </Button>
            <Button type="submit" name="answer" value="dismiss" variant="secondary" size="sm">
              {a.invites.dismiss}
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
