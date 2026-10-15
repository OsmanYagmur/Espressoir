import { RECOMMEND_MIN_SCORED } from "@espressoir/core";
import {
  importedRecommendationSchema,
  suggestCoffees,
  tastingRowSchema,
  type Archive,
  type ImportedRecommendation,
  type Suggestion,
  type Suggestions,
  type Tasting,
} from "@espressoir/db";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Body, Button, Heading, Mono, RowLink, ScoreBadge, StateView } from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

const r = t.recommendations;

/** Why a coffee is suggested, in words: the same sentences as the website's page. */
function reasonText(archive: Archive, reason: Suggestion["reason"]): string {
  switch (reason.kind) {
    case "model":
      return reason.text ?? r.reasons.model;
    case "top":
      return r.topTitle;
    case "tags": {
      const names = new Map(archive.flavorTags.map((tag) => [tag.slug, tag.name]));
      return format(r.reasons.tags, {
        tags: reason.tags.map((slug) => names.get(slug) ?? slug).join(", "),
      });
    }
    case "together":
      return format(r.reasons.together, {
        via: archive.coffees.find((coffee) => coffee.id === reason.via)?.name ?? "",
        count: reason.members,
      });
    default:
      return r.reasons.taste;
  }
}

/** The member's own rows: their tastings (private ones too) and a model's suggestions. */
function useMine(userId: string | undefined) {
  const [mine, setMine] = useState<
    { own: Tasting[]; imported: ImportedRecommendation[] } | "failed" | null
  >(null);
  const load = useCallback(async () => {
    if (!userId) return;
    const [own, imported] = await Promise.all([
      supabase.from("tasting_feed").select("*").eq("user_id", userId),
      supabase.from("recommendations").select("coffee_id, model, score, reason, created_at"),
    ]);
    if (own.error) {
      setMine("failed");
      return;
    }
    setMine({
      own: z.array(tastingRowSchema).parse(own.data),
      // A database without the table: the site's own model.
      imported: imported.error ? [] : z.array(importedRecommendationSchema).parse(imported.data),
    });
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { mine, load };
}

export default function SuggestionsScreen() {
  const colors = useColors();
  const { session } = useSession();
  const { state, refresh } = useArchive();
  const userId = session?.user.id;
  const { mine, load } = useMine(userId);
  const [refreshing, setRefreshing] = useState(false);

  let content: React.ReactNode;
  if (session === undefined) {
    content = null;
  } else if (!userId) {
    content = (
      <View style={{ gap: 16, paddingTop: 16 }}>
        <Body muted>{t.mobile.suggestions.signInFirst}</Body>
        <Button title={t.auth.submit} onPress={() => router.push("/giris")} />
      </View>
    );
  } else if (!state.archive || mine === null) {
    content = (
      <StateView
        state={state.status === "failed" ? "failed" : "loading"}
        onRetry={() => void refresh()}
      />
    );
  } else if (mine === "failed") {
    content = <StateView state="failed" onRetry={() => void load()} />;
  } else {
    const archive = state.archive;
    const suggestions: Suggestions = suggestCoffees({
      archive,
      userId,
      own: mine.own,
      imported: mine.imported,
    });
    content = (
      <>
        <Mono muted style={{ paddingVertical: 12 }}>
          {suggestions.source === "model"
            ? format(r.fromModel, { model: suggestions.model })
            : suggestions.source === "site"
              ? r.fromSite
              : format(r.tooFew, { min: RECOMMEND_MIN_SCORED, count: suggestions.scored })}
        </Mono>
        {suggestions.items.length === 0 ? <Body muted>{r.empty}</Body> : null}
        {suggestions.items.map(({ coffee, reason }) => (
          <RowLink
            key={coffee.id}
            href={{
              pathname: "/kahve/[marka]/[kahve]",
              params: { marka: coffee.brand.slug, kahve: coffee.slug },
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Mono muted>{coffee.brand.name}</Mono>
              <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>{coffee.name}</Body>
              <Mono>{reasonText(archive, reason)}</Mono>
            </View>
            <ScoreBadge score={coffee.stats.avgScore} />
          </RowLink>
        ))}
      </>
    );
  }

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.foreground}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([refresh(), load()]);
              setRefreshing(false);
            }}
          />
        }
      >
        <Heading>{r.title}</Heading>
        <Body muted style={{ paddingTop: 12 }}>
          {r.lead}
        </Body>
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}
