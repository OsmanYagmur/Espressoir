import { COMMENT_MAX_LENGTH } from "@espressoir/core";
import {
  addComment,
  editComment,
  loadComments,
  parseCommentBody,
  removeComment,
  threadComments,
  type Comment,
} from "@espressoir/db";
import { router } from "@/navigation";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { socialErrorText } from "@/lib/errors";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

import { ReportLink } from "./social";
import { Body, Button, Field, Mono, QuietButton, TextLink } from "./ui";

const s = t.social;

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
  const colors = useColors();
  const [text, setText] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const parsed = parseCommentBody(text);
    if (!parsed.ok) {
      setError(
        parsed.error === "empty"
          ? s.errors.empty
          : format(s.errors.tooLong, { max: COMMENT_MAX_LENGTH }),
      );
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.body);
      setText("");
    } catch (failure) {
      setError(socialErrorText(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        hint={format(s.commentHint, { max: COMMENT_MAX_LENGTH })}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={COMMENT_MAX_LENGTH}
        style={{ minHeight: 84, textAlignVertical: "top", paddingTop: 10 }}
      />
      {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ minWidth: 130 }}>
          <Button
            title={pending ? s.sending : submitLabel}
            disabled={pending}
            onPress={() => void submit()}
          />
        </View>
        {onCancel ? <QuietButton title={s.cancel} onPress={onCancel} /> : null}
      </View>
    </View>
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
  const colors = useColors();
  const [mode, setMode] = useState<"read" | "edit" | "reply">("read");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = comment.author !== null && comment.author.id === actions.viewer;

  if (comment.deleted) {
    return (
      <Mono muted style={{ paddingVertical: 10 }}>
        {s.deleted}
      </Mono>
    );
  }

  function confirmRemove() {
    Alert.alert(s.deleteConfirm, undefined, [
      { text: s.cancel, style: "cancel" },
      {
        text: s.delete,
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await actions.remove(comment.id);
          } catch (failure) {
            setError(socialErrorText(failure));
            setBusy(false);
          }
        },
      },
    ]);
  }

  const meta = [
    formatDay(comment.createdAt.slice(0, 10)),
    comment.edited ? s.edited : null,
    comment.author && actions.officials.has(comment.author.id)
      ? `✓ ${t.business.officialReply}`
      : null,
    comment.hidden ? s.hidden : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={{ paddingVertical: 10, gap: 4 }}>
      <Mono muted>
        {comment.author ? (
          <TextLink
            to={{ screen: "Profile", params: { username: comment.author.username } }}
            style={{ color: colors.foreground, textDecorationLine: "underline" }}
          >
            @{comment.author.username}
          </TextLink>
        ) : null}
        {" · "}
        {meta}
      </Mono>
      {mode === "edit" ? (
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
      ) : (
        // Plain text; line breaks the author typed are kept.
        <Body>{comment.body}</Body>
      )}
      {comment.hidden ? <Mono muted>{s.hiddenNote}</Mono> : null}
      {mode === "read" && actions.viewer ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {canReply ? <QuietButton title={s.reply} onPress={() => setMode("reply")} /> : null}
          {mine ? (
            <>
              <QuietButton title={s.edit} onPress={() => setMode("edit")} />
              <QuietButton title={s.delete} disabled={busy} onPress={confirmRemove} />
            </>
          ) : (
            <ReportLink target="comment" targetId={comment.id} />
          )}
        </View>
      ) : null}
      {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
      {mode === "reply" ? (
        <View style={{ borderLeftWidth: 2, borderColor: colors.border, paddingLeft: 12 }}>
          <CommentForm
            label={s.replyLabel}
            submitLabel={s.send}
            onSubmit={async (body) => {
              await actions.reply(comment.id, body);
              setMode("read");
            }}
            onCancel={() => setMode("read")}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * The conversation under a tasting: comments, one level of replies, and a box to add to
 * it. Read and written straight from Supabase with the same queries as the website.
 */
export function Comments({
  tastingId,
  officialIds,
}: {
  tastingId: string;
  officialIds: readonly string[];
}) {
  const colors = useColors();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const [comments, setComments] = useState<Comment[] | "failed" | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadComments(supabase, tastingId)
      .then((loaded) => !cancelled && setComments(loaded))
      .catch(() => !cancelled && setComments("failed"));
    return () => {
      cancelled = true;
    };
  }, [tastingId, viewer]);

  if (comments === null) return <Mono muted>{s.commentsLoading}</Mono>;
  if (comments === "failed") {
    return <Mono style={{ color: colors.destructive }}>{s.commentsFailed}</Mono>;
  }

  async function add(body: string, parentId: string | null) {
    if (!viewer) return;
    const created = await addComment(supabase, tastingId, viewer, body, parentId);
    setComments((current) => (Array.isArray(current) ? [...current, created] : [created]));
  }

  const actions: Actions = {
    viewer,
    officials: new Set(officialIds),
    reply: (parentId, body) => add(body, parentId),
    edit: async (commentId, body) => {
      const edited = await editComment(supabase, commentId, body);
      setComments((current) =>
        Array.isArray(current)
          ? current.map((comment) => (comment.id === commentId ? edited : comment))
          : current,
      );
    },
    remove: async (commentId) => {
      const outcome = await removeComment(supabase, commentId);
      setComments((current) =>
        !Array.isArray(current)
          ? current
          : outcome === "deleted"
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
    <View>
      {threads.length === 0 ? (
        <Body muted style={{ paddingVertical: 12 }}>
          {viewer ? s.commentsEmpty : s.commentsEmptyVisitor}
        </Body>
      ) : (
        threads.map((thread) => (
          <View key={thread.id} style={{ borderBottomWidth: 1, borderColor: colors.border }}>
            <CommentView comment={thread} actions={actions} canReply={!thread.hidden} />
            {thread.replies.length > 0 ? (
              <View
                style={{
                  marginLeft: 4,
                  marginBottom: 8,
                  borderLeftWidth: 2,
                  borderColor: colors.border,
                  paddingLeft: 12,
                }}
              >
                {thread.replies.map((reply) => (
                  <CommentView key={reply.id} comment={reply} actions={actions} canReply={false} />
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
      <View style={{ paddingTop: 16 }}>
        {viewer ? (
          <CommentForm
            label={s.commentLabel}
            submitLabel={s.send}
            onSubmit={(body) => add(body, null)}
          />
        ) : (
          <View style={{ gap: 10 }}>
            <Body muted>{s.signInToComment}</Body>
            <Button
              title={s.signIn}
              variant="outline"
              onPress={() => router.push({ screen: "SignIn" })}
            />
          </View>
        )}
      </View>
    </View>
  );
}
