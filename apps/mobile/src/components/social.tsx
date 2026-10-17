import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "@espressoir/core";
import {
  SocialFailure,
  fileReport,
  isFollowing,
  loadLikes,
  setFollowing,
  setLiked,
} from "@espressoir/db";
import { router } from "@/navigation";
import { useEffect, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { followErrorText, socialErrorText } from "@/lib/errors";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

import { Choices } from "./form";
import { Button, Field, Mono, QuietButton } from "./ui";

const s = t.social;

/**
 * The like button under a tasting, with the count. Members like other people's tastings,
 * as themselves; their own shows the count only. Written straight to Supabase, like on the
 * website (the count on lists catches up with the archive).
 */
export function LikeButton({ tastingId, authorId }: { tastingId: string; authorId: string }) {
  const colors = useColors();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const [state, setState] = useState<{ count: number; liked: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLikes(supabase, tastingId, viewer)
      .then((loaded) => !cancelled && setState(loaded))
      .catch(() => !cancelled && setState({ count: 0, liked: false }));
    return () => {
      cancelled = true;
    };
  }, [tastingId, viewer]);

  if (!state) return null;
  const countText = format(s.likeCount, { count: state.count });
  if (!viewer || viewer === authorId) {
    return <Mono muted>{viewer ? `${countText} · ${s.ownTasting}` : countText}</Mono>;
  }

  async function toggle() {
    if (!viewer || !state) return;
    const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
    setPending(true);
    setError(null);
    setState(next);
    try {
      await setLiked(supabase, tastingId, viewer, next.liked);
    } catch (failure) {
      setState(state);
      setError(socialErrorText(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ minWidth: 150 }}>
          <Button
            title={state.liked ? `♥ ${s.liked}` : `♡ ${s.like}`}
            variant={state.liked ? "solid" : "outline"}
            disabled={pending}
            onPress={() => void toggle()}
          />
        </View>
        <Mono>{countText}</Mono>
      </View>
      {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
    </View>
  );
}

/** Follow or stop following a member. Visitors are offered the sign-in instead. */
export function FollowButton({ userId }: { userId: string }) {
  const colors = useColors();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const [following, setFollowingState] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer || viewer === userId) return;
    let cancelled = false;
    isFollowing(supabase, viewer, userId)
      .then((value) => !cancelled && setFollowingState(value))
      .catch(() => !cancelled && setFollowingState(false));
    return () => {
      cancelled = true;
    };
  }, [viewer, userId]);

  if (session === undefined || viewer === userId) return null;
  if (!viewer) {
    return (
      <Button
        title={t.follow.follow}
        variant="outline"
        onPress={() => router.push({ screen: "SignIn" })}
      />
    );
  }
  if (following === null) return null;

  async function toggle() {
    if (!viewer) return;
    setPending(true);
    setError(null);
    try {
      await setFollowing(supabase, viewer, userId, !following);
      setFollowingState(!following);
    } catch (failure) {
      setError(followErrorText(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <Button
        title={following ? t.follow.unfollow : t.follow.follow}
        variant={following ? "outline" : "solid"}
        disabled={pending}
        onPress={() => void toggle()}
      />
      {following ? <Mono muted>{t.follow.following}</Mono> : null}
      {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
    </View>
  );
}

/**
 * "Report this" for a tasting, a comment or a member: a quiet link that opens a short form.
 * Offered to signed-in members only; an admin sees the report in the website's panel.
 */
export function ReportLink({ target, targetId }: { target: ReportTarget; targetId: string }) {
  const colors = useColors();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!viewer) return null;
  if (done) return <Mono muted>{done}</Mono>;

  async function send() {
    if (!viewer || !reason) return;
    setPending(true);
    setError(null);
    try {
      await fileReport(supabase, viewer, target, targetId, reason, details);
      setDone(s.reportSent);
      setOpen(false);
    } catch (failure) {
      if (failure instanceof SocialFailure && failure.kind === "duplicate") {
        setDone(s.reportDuplicate);
        setOpen(false);
      } else {
        setError(socialErrorText(failure));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <QuietButton title={s.report} muted onPress={() => setOpen(true)} />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 28, gap: 16 }}>
            <Choices
              label={s.reportTitle}
              options={REPORT_REASONS.map((value) => ({ value, label: s.reportReasons[value] }))}
              value={reason}
              onChange={setReason}
            />
            <Field
              label={s.reportDetails}
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={REPORT_DETAILS_MAX_LENGTH}
              style={{ minHeight: 90, textAlignVertical: "top", paddingTop: 10 }}
            />
            {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
            <Button
              title={pending ? s.sending : s.reportSend}
              disabled={pending || !reason}
              onPress={() => void send()}
            />
            <Button
              title={t.mobile.report.cancel}
              variant="outline"
              onPress={() => setOpen(false)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
