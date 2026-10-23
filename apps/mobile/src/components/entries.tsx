import type { CafeVisit, Tasting } from "@espressoir/db";
import { router } from "@/navigation";
import { Image, Pressable, Text, View } from "react-native";

import { drinkLabel } from "@/lib/cafes";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { smallMediaUrl } from "@/lib/media";
import { fonts, useColors } from "@/lib/theme";

import { Body, Mono, ScoreBadge, TextLink } from "./ui";

function AuthorLink({ username }: { username: string }) {
  const colors = useColors();
  return (
    <TextLink
      to={{ screen: "Profile", params: { username } }}
      style={{
        fontFamily: fonts.mono,
        fontSize: 12,
        color: colors.foreground,
        textDecorationLine: "underline",
      }}
    >
      @{username}
    </TextLink>
  );
}

/** "Kapsül Makinesi · Nespresso C30". */
function brewLabel(tasting: Tasting): string | null {
  if (tasting.brewMethod && tasting.device) {
    return format(t.coffee.methodWithDevice, {
      method: tasting.brewMethod.name,
      device: tasting.device,
    });
  }
  return tasting.brewMethod?.name ?? tasting.device;
}

/** The small twin of a tasting's picture, at a fixed height and its own proportions. */
function Thumbnail({ tasting }: { tasting: Tasting }) {
  if (!tasting.photo) return null;
  const { path, width, height, alt } = tasting.photo;
  const shown = 96;
  return (
    <Image
      source={{ uri: smallMediaUrl(path) }}
      accessibilityLabel={
        alt ??
        format(t.photo.defaultAlt, { coffee: `${tasting.brand.name} ${tasting.coffee.name}` })
      }
      style={{ width: Math.min(220, (shown * width) / height), height: shown, marginTop: 4 }}
    />
  );
}

/**
 * One tasting as a form entry, like on the site: who and when, the coffee (in lists that
 * mix coffees), the note, the tags as a sentence, the score boxed on the right. With
 * `open`, the entry leads to the tasting's own page (likes and comments are there).
 */
export function TastingEntry({
  tasting,
  showAuthor = false,
  showCoffee = false,
  showVisibility = false,
  open = false,
}: {
  tasting: Tasting;
  showAuthor?: boolean;
  showCoffee?: boolean;
  /** On the member's own pages: who can see it. */
  showVisibility?: boolean;
  open?: boolean;
}) {
  const colors = useColors();
  const meta = [
    tasting.tastedAt ? formatDay(tasting.tastedAt) : t.coffee.undated,
    brewLabel(tasting),
    showVisibility ? t.panel.visibility[tasting.visibility] : null,
    tasting.isHidden ? t.panel.hidden : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <View style={{ flex: 1, gap: 4 }}>
        <Text>
          {showAuthor ? (
            <>
              <AuthorLink username={tasting.author.username} />
              <Mono muted>{" · "}</Mono>
            </>
          ) : null}
          <Mono muted>{meta}</Mono>
        </Text>
        {showCoffee ? (
          <TextLink
            to={{
              screen: "Coffee",
              params: { marka: tasting.brand.slug, kahve: tasting.coffee.slug },
            }}
            style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.foreground }}
          >
            {tasting.coffee.name}{" "}
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.mutedForeground }}>
              {tasting.brand.name}
            </Text>
          </TextLink>
        ) : null}
        {tasting.notes ? <Body>{tasting.notes}</Body> : null}
        {tasting.tags.length > 0 ? (
          <Mono muted>
            {t.taste.tagsLabel}: {tasting.tags.map((tag) => tag.name).join(", ")}
          </Mono>
        ) : null}
        <Thumbnail tasting={tasting} />
        {open && tasting.status === "logged" ? (
          <Mono style={{ textDecorationLine: "underline", marginTop: 2 }}>
            {format(t.social.counts, { likes: tasting.likeCount, comments: tasting.commentCount })}
          </Mono>
        ) : null}
      </View>
      <ScoreBadge score={tasting.score} />
    </>
  );
  const row = {
    flexDirection: "row" as const,
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  };
  if (!open) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint={t.social.openTasting}
      onPress={() => router.push({ screen: "Tasting", params: { id: tasting.id } })}
      style={({ pressed }) => [row, pressed ? { backgroundColor: colors.muted } : null]}
    >
      {body}
    </Pressable>
  );
}

/** A drink at a café, like a tasting: who and when, the drink, the note, the score. */
export function VisitEntry({
  visit,
  showAuthor = false,
  showCafe = false,
}: {
  visit: CafeVisit;
  showAuthor?: boolean;
  showCafe?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text>
          {showAuthor ? (
            <>
              <AuthorLink username={visit.author.username} />
              <Mono muted>{" · "}</Mono>
            </>
          ) : null}
          <Mono muted>{formatDay(visit.visitedOn)}</Mono>
        </Text>
        <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>
          {showCafe ? `${visit.cafe.name} · ` : ""}
          {drinkLabel(visit)}
        </Body>
        {visit.notes ? <Body>{visit.notes}</Body> : null}
      </View>
      <ScoreBadge score={visit.score} />
    </View>
  );
}
