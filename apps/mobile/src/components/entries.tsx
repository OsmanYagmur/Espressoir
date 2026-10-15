import type { CafeVisit, Tasting } from "@espressoir/db";
import { Link } from "expo-router";
import { Text, View } from "react-native";

import { drinkLabel } from "@/lib/cafes";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { fonts, useColors } from "@/lib/theme";

import { Body, Mono, ScoreBadge } from "./ui";

function AuthorLink({ username }: { username: string }) {
  const colors = useColors();
  return (
    <Link
      href={{ pathname: "/u/[username]", params: { username } }}
      style={{
        fontFamily: fonts.mono,
        fontSize: 12,
        color: colors.foreground,
        textDecorationLine: "underline",
      }}
    >
      @{username}
    </Link>
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

/**
 * One tasting as a form entry, like on the site: who and when, the coffee (in lists that
 * mix coffees), the note, the tags as a sentence, the score boxed on the right.
 */
export function TastingEntry({
  tasting,
  showAuthor = false,
  showCoffee = false,
}: {
  tasting: Tasting;
  showAuthor?: boolean;
  showCoffee?: boolean;
}) {
  const colors = useColors();
  const meta = [
    tasting.tastedAt ? formatDay(tasting.tastedAt) : t.coffee.undated,
    brewLabel(tasting),
  ]
    .filter(Boolean)
    .join(" · ");
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
              <AuthorLink username={tasting.author.username} />
              <Mono muted>{" · "}</Mono>
            </>
          ) : null}
          <Mono muted>{meta}</Mono>
        </Text>
        {showCoffee ? (
          <Link
            href={{
              pathname: "/kahve/[marka]/[kahve]",
              params: { marka: tasting.brand.slug, kahve: tasting.coffee.slug },
            }}
            style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.foreground }}
          >
            {tasting.coffee.name}{" "}
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.mutedForeground }}>
              {tasting.brand.name}
            </Text>
          </Link>
        ) : null}
        {tasting.notes ? <Body>{tasting.notes}</Body> : null}
        {tasting.tags.length > 0 ? (
          <Mono muted>
            {t.taste.tagsLabel}: {tasting.tags.map((tag) => tag.name).join(", ")}
          </Mono>
        ) : null}
      </View>
      <ScoreBadge score={tasting.score} />
    </View>
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
