import { TASTE_DIMENSIONS } from "@espressoir/core";
import { deleteTasting, loadTasting, type Tasting } from "@espressoir/db";
import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, RefreshControl, ScrollView, View } from "react-native";

import { Comments } from "@/components/comments";
import { LikeButton, ReportLink } from "@/components/social";
import {
  Body,
  Button,
  Heading,
  Label,
  Mono,
  ScoreBadge,
  SectionHeading,
  StateView,
} from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { env } from "@/lib/env";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { refreshSite } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

const s = t.social;

/**
 * A tasting's own page, as on the website: the coffee, who and when, the note, the taste
 * profile, the picture, then likes and the conversation. Read with the viewer's session, so
 * a followers-only or private tasting opens for those allowed to see it.
 */
export default function TastingScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const { state: archiveState, refresh: refreshArchive } = useArchive();
  const [tasting, setTasting] = useState<Tasting | null | "failed" | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTasting(await loadTasting(supabase, id));
    } catch {
      setTasting("failed");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, viewer]);

  function confirmDelete() {
    Alert.alert(t.panel.form.deleteConfirm, undefined, [
      { text: s.cancel, style: "cancel" },
      {
        text: t.panel.form.delete,
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          setError(null);
          try {
            await deleteTasting(supabase, id);
            await refreshSite();
            await refreshArchive();
            router.back();
          } catch {
            setError(t.mobile.tasting.deleteFailed);
            setDeleting(false);
          }
        },
      },
    ]);
  }

  let content: React.ReactNode;
  if (tasting === undefined) {
    content = <StateView state="loading" />;
  } else if (tasting === "failed") {
    content = (
      <StateView state="failed" message={t.mobile.loadFailed} onRetry={() => void load()} />
    );
  } else if (tasting === null) {
    content = <StateView state="empty" message={t.mobile.tasting.notFound} />;
  } else {
    const mine = viewer === tasting.author.id;
    // Members who speak for this brand: their comments carry the "official reply" badge.
    const officialIds = (archiveState.archive?.profiles ?? [])
      .filter((profile) =>
        profile.officialFor.some(
          (business) => business.kind === "brand" && business.id === tasting.brand.id,
        ),
      )
      .map((profile) => profile.id);
    const taste = TASTE_DIMENSIONS.filter((dimension) => tasting.profile[dimension] !== null);
    const meta = [
      tasting.tastedAt ? formatDay(tasting.tastedAt) : t.coffee.undated,
      tasting.brewMethod
        ? tasting.device
          ? format(t.coffee.methodWithDevice, {
              method: tasting.brewMethod.name,
              device: tasting.device,
            })
          : tasting.brewMethod.name
        : tasting.device,
    ]
      .filter(Boolean)
      .join(" · ");
    let section = 0;

    content = (
      <View>
        <Heading kicker={tasting.brand.name}>{tasting.coffee.name}</Heading>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14 }}>
          <ScoreBadge score={tasting.score} size="lg" />
          <View style={{ flex: 1, gap: 4 }}>
            <Mono>
              <Link
                href={{ pathname: "/u/[username]", params: { username: tasting.author.username } }}
                style={{ textDecorationLine: "underline", color: colors.foreground }}
              >
                @{tasting.author.username}
              </Link>
            </Mono>
            <Mono muted>{meta}</Mono>
            {mine ? (
              <Mono muted>
                {format(t.mobile.tasting.visibility, {
                  visibility: t.panel.visibility[tasting.visibility],
                })}
              </Mono>
            ) : null}
          </View>
        </View>
        {tasting.isHidden ? <Mono muted>{t.panel.hiddenNote}</Mono> : null}
        {tasting.notes ? <Body style={{ marginTop: 6 }}>{tasting.notes}</Body> : null}
        {tasting.tags.length > 0 ? (
          <Mono muted style={{ marginTop: 8 }}>
            {t.taste.tagsLabel}: {tasting.tags.map((tag) => tag.name).join(", ")}
          </Mono>
        ) : null}
        {tasting.photo ? (
          <Image
            source={{ uri: mediaUrl(tasting.photo.path) }}
            accessibilityLabel={
              tasting.photo.alt ??
              format(t.photo.defaultAlt, {
                coffee: `${tasting.brand.name} ${tasting.coffee.name}`,
              })
            }
            style={{
              width: "100%",
              aspectRatio: tasting.photo.width / tasting.photo.height,
              marginTop: 14,
            }}
          />
        ) : null}

        {taste.length > 0 ? (
          <>
            <SectionHeading index={++section}>{t.tastingPage.profileTitle}</SectionHeading>
            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingTop: 6 }}>
              {taste.map((dimension) => (
                <View key={dimension} style={{ width: "33%", paddingVertical: 8, gap: 2 }}>
                  <Label>{t.panel.form.taste[dimension]}</Label>
                  <Body style={{ fontFamily: fonts.heading, fontSize: 22 }}>
                    {`${tasting.profile[dimension]} / 5`}
                  </Body>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {tasting.wouldBuyAgain !== null ? (
          <Mono style={{ marginTop: 10 }}>
            {t.tastingPage.buyAgain} {tasting.wouldBuyAgain ? t.tastingPage.yes : t.tastingPage.no}
          </Mono>
        ) : null}

        <View style={{ marginTop: 18, gap: 12 }}>
          <Button
            title={t.tastingPage.backToCoffee}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/kahve/[marka]/[kahve]",
                params: { marka: tasting.brand.slug, kahve: tasting.coffee.slug },
              })
            }
          />
          {mine ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.mobile.tasting.editOnSite}
                  variant="outline"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(`${env.siteUrl}/panel/tadim/${tasting.id}`)
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t.panel.form.delete}
                  variant="outline"
                  disabled={deleting}
                  onPress={confirmDelete}
                />
              </View>
            </View>
          ) : (
            <ReportLink target="tasting" targetId={tasting.id} />
          )}
          {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
        </View>

        {tasting.status === "logged" ? (
          <>
            <SectionHeading index={++section}>{s.commentsTitle}</SectionHeading>
            <View style={{ paddingVertical: 12 }}>
              <LikeButton tastingId={tasting.id} authorId={tasting.author.id} />
            </View>
            <Comments tastingId={tasting.id} officialIds={officialIds} />
          </>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t.tastingPage.kicker }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.foreground}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {content}
      </ScrollView>
    </>
  );
}
