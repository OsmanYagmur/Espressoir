"use client";

import { COMMENT_MAX_LENGTH } from "@espressoir/core";
import { parseCommentBody, threadComments, type Comment } from "@espressoir/db";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { OfficialBadge } from "@/components/business/official-badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { format, t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";
import { useHasSession } from "@/lib/session-cookie";

import { ReportButton } from "./report-button";

const s = t.social;

// Comments are rendered in the browser only (never hydrated), so formatting here is safe.
const timeFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

const quietButton =
  "cursor-pointer text-sm text-ink-2 underline underline-offset-3 hover:text-ink disabled:opacity-50";

function errorText(failure: unknown): string {
  const kind = (failure as { kind?: string }).kind;
  if (kind === "rateLimited") return s.errors.rateLimited;
  if (kind === "restricted") return s.errors.restricted;
  if (kind === "parentGone") return s.errors.parentGone;
  return s.errors.failed;
}

/** A box to write in. `onSubmit` throws when the database refuses; the text is then kept. */
function CommentForm({
  label,
  initial = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const parsed = parseCommentBody(text);
    if (!parsed.ok) {
      return setError(
        parsed.error === "empty"
          ? s.errors.empty
          : format(s.errors.tooLong, { max: COMMENT_MAX_LENGTH }),
      );
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.body);
      setText("");
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      <Textarea
        id={id}
        value={text}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(event) => setText(event.target.value)}
        className="min-h-24"
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? s.sending : submitLabel}
        </Button>
        {onCancel ? (
          <button type="button" className={quietButton} onClick={onCancel}>
            {s.cancel}
          </button>
        ) : null}
        <span id={`${id}-hint`} className="type-meta">
          {format(s.commentHint, { max: COMMENT_MAX_LENGTH })}
        </span>
      </div>
    </form>
  );
}

interface Actions {
  viewer: string | null;
  /** Members who speak for the tasting's brand: their comments carry a badge. */
  officials: ReadonlySet<string>;
  reply: (parentId: string, body: string) => Promise<void>;
  edit: (commentId: string, body: string) => Promise<void>;
  remove: (commentId: string) => Promise<void>;
}

function CommentView({
  comment,
  actions,
  canReply,
}: {
  comment: Comment;
  actions: Actions;
  canReply: boolean;
}) {
  const [mode, setMode] = useState<"read" | "edit" | "reply">("read");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = comment.author !== null && comment.author.id === actions.viewer;

  if (comment.deleted) {
    return <p className="py-4 type-meta">{s.deleted}</p>;
  }

  async function remove() {
    if (!window.confirm(s.deleteConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      await actions.remove(comment.id);
    } catch (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  }

  return (
    <div className="py-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 type-meta">
        {comment.author ? (
          <Link
            href={profilePath(comment.author.username)}
            className="font-medium text-ink no-underline hover:underline"
          >
            @{comment.author.username}
          </Link>
        ) : null}
        {" · "}
        <time dateTime={comment.createdAt}>{timeFormat.format(new Date(comment.createdAt))}</time>
        {comment.edited ? ` · ${s.edited}` : null}
        {comment.author && actions.officials.has(comment.author.id) ? (
          <OfficialBadge label={t.business.officialReply} />
        ) : null}
        {comment.hidden ? <Chip>{s.hidden}</Chip> : null}
      </p>

      {mode === "edit" ? (
        <div className="mt-2">
          <CommentForm
            label={s.commentLabel}
            initial={comment.body ?? ""}
            submitLabel={s.save}
            onSubmit={async (body) => {
              await actions.edit(comment.id, body);
              setMode("read");
            }}
            onCancel={() => setMode("read")}
          />
        </div>
      ) : (
        // Plain text, escaped by React; line breaks the author typed are kept.
        <p className="mt-1 [overflow-wrap:anywhere] whitespace-pre-line">{comment.body}</p>
      )}
      {comment.hidden ? <p className="mt-1 type-meta">{s.hiddenNote}</p> : null}

      {mode === "read" && actions.viewer ? (
        <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
          {canReply ? (
            <button type="button" className={quietButton} onClick={() => setMode("reply")}>
              {s.reply}
            </button>
          ) : null}
          {mine ? (
            <>
              <button type="button" className={quietButton} onClick={() => setMode("edit")}>
                {s.edit}
              </button>
              <button
                type="button"
                className={quietButton}
                disabled={busy}
                onClick={() => void remove()}
              >
                {s.delete}
              </button>
            </>
          ) : (
            <ReportButton target="comment" targetId={comment.id} />
          )}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {mode === "reply" ? (
        <div className="mt-3 border-l-2 border-line pl-4">
          <CommentForm
            label={s.replyLabel}
            submitLabel={s.send}
            onSubmit={async (body) => {
              await actions.reply(comment.id, body);
              setMode("read");
            }}
            onCancel={() => setMode("read")}
          />
        </div>
      ) : null}
    </div>
  );
}

type Loaded =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; comments: Comment[]; viewer: string | null };

/**
 * The conversation under a tasting: comments, one level of replies, and a box to add to
 * it. Read in the browser after the page has loaded (the page itself is static), so what
 * is shown is current, and writing goes straight to Supabase.
 */
export function CommentThread({
  tastingId,
  officialIds = [],
}: {
  tastingId: string;
  officialIds?: readonly string[];
}) {
  const signedIn = useHasSession();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  // Bumped by "Tekrar dene": reads the comments again after a failure.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getViewerId, loadComments } = await import("./social-data");
        const [viewer, comments] = await Promise.all([
          signedIn ? getViewerId() : null,
          loadComments(tastingId),
        ]);
        if (!cancelled) setState({ status: "ready", comments, viewer });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, tastingId, attempt]);

  if (state.status === "loading") {
    return (
      <div role="status" className="flex flex-col gap-3 py-6">
        <span className="sr-only">{s.commentsLoading}</span>
        <Skeleton className="h-16" />
        <Skeleton className="h-16 w-3/4" />
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p role="alert" className="font-medium text-danger">
          {s.commentsFailed}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          {t.states.retry}
        </Button>
      </div>
    );
  }

  const { comments, viewer } = state;
  const update = (change: (current: Comment[]) => Comment[]) =>
    setState({ status: "ready", viewer, comments: change(comments) });

  async function add(body: string, parentId: string | null) {
    if (!viewer) return;
    const { addComment } = await import("./social-data");
    const created = await addComment(tastingId, viewer, body, parentId);
    update((current) => [...current, created]);
  }

  const officials = new Set(officialIds);
  const actions: Actions = {
    viewer,
    officials,
    reply: (parentId, body) => add(body, parentId),
    edit: async (commentId, body) => {
      const { editComment } = await import("./social-data");
      const edited = await editComment(commentId, body);
      update((current) => current.map((comment) => (comment.id === commentId ? edited : comment)));
    },
    remove: async (commentId) => {
      const { removeComment } = await import("./social-data");
      const outcome = await removeComment(commentId);
      update((current) =>
        outcome === "deleted"
          ? current.filter((comment) => comment.id !== commentId)
          : current.map((comment) =>
              comment.id === commentId
                ? { ...comment, body: null, deleted: true, author: null }
                : comment,
            ),
      );
    },
  };

  const threads = threadComments(comments);

  return (
    <div>
      {threads.length === 0 ? (
        <p className="pb-6 text-ink-2">{viewer ? s.commentsEmpty : s.commentsEmptyVisitor}</p>
      ) : (
        <ol aria-label={s.commentsTitle}>
          {threads.map((thread) => (
            <li key={thread.id} className="border-b border-line">
              <CommentView comment={thread} actions={actions} canReply={!thread.hidden} />
              {thread.replies.length > 0 ? (
                <ol className="mb-2 ml-1 border-l-2 border-line pl-4">
                  {thread.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentView comment={reply} actions={actions} canReply={false} />
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <div className="py-6">
        {viewer ? (
          <CommentForm
            label={s.commentLabel}
            submitLabel={s.send}
            onSubmit={(body) => add(body, null)}
          />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-ink-2">{s.signInToComment}</p>
            <Button asChild variant="secondary">
              <Link href="/giris" prefetch={false}>
                {s.signIn}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
