import { findCoffee, tastingsOf } from "@espressoir/db";
import { router, useParams } from "@/navigation";
import { View } from "react-native";

import { CoffeeShelfButtons } from "@/components/coffee-shelf";
import { DetailScreen } from "@/components/detail-screen";
import { TastingEntry } from "@/components/entries";
import { Body, Button, Heading, Label, Mono, ScoreBadge, SectionHeading } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";

/** A coffee: its average, its details and the community's tastings, as on the site. */
export default function CoffeeScreen() {
  const { marka, kahve } = useParams<"Coffee">();

  return (
    <DetailScreen
      title={t.nav.coffees}
      notFound={t.states.notFoundBody}
      render={(archive) => {
        const coffee = findCoffee(archive, marka, kahve);
        if (!coffee) return null;
        const tastings = tastingsOf(archive, coffee.id);
        const logged = tastings.filter((tasting) => tasting.status === "logged");
        const wanting = tastings.length - logged.length;
        const { stats } = coffee;
        const facts = [
          coffee.form ? t.coffee.forms[coffee.form] : null,
          coffee.brandIntensity !== null
            ? `${t.coffee.fields.intensity} ${coffee.brandIntensity}`
            : null,
          coffee.region,
        ].filter(Boolean);

        return (
          <View>
            <Heading kicker={coffee.brand.name}>{coffee.name}</Heading>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14 }}
            >
              <ScoreBadge score={stats.avgScore} size="lg" />
              <View style={{ flex: 1, gap: 2 }}>
                <Mono>
                  {stats.tastingCount === 0
                    ? t.coffee.wishlist
                    : format(t.coffee.tastingCount, { count: stats.tastingCount })}
                </Mono>
                {stats.lastTastedAt ? (
                  <Mono muted>
                    {t.coffee.fields.lastTasted}: {formatDay(stats.lastTastedAt)}
                  </Mono>
                ) : null}
                {stats.ratedCount > 1 ? (
                  <Mono muted>{format(t.coffee.ratedBy, { n: stats.ratedCount })}</Mono>
                ) : null}
              </View>
            </View>
            {facts.length > 0 ? <Mono muted>{facts.join(" · ")}</Mono> : null}
            {coffee.isReviewed ? null : (
              <View style={{ marginTop: 12, gap: 4 }}>
                <Label>{t.coffee.unreviewed}</Label>
                <Body muted>{t.coffee.unreviewedNote}</Body>
              </View>
            )}
            <View style={{ marginTop: 16, gap: 10 }}>
              <Button
                title={t.mobile.add.tastedThis}
                onPress={() => router.push({ screen: "NewTasting", params: { kahve: coffee.id } })}
              />
              <CoffeeShelfButtons coffeeId={coffee.id} />
            </View>
            <SectionHeading index={1}>{t.coffeeDetail.tastingsTitle}</SectionHeading>
            {logged.length === 0 ? (
              <Body muted style={{ paddingVertical: 16 }}>
                {t.coffeeDetail.notTastedYet}
              </Body>
            ) : (
              logged.map((tasting) => (
                <TastingEntry key={tasting.id} tasting={tasting} showAuthor open />
              ))
            )}
            {wanting > 0 ? (
              <Mono muted style={{ paddingVertical: 12 }}>
                {format(t.coffeeDetail.wantCount, { count: wanting })}
              </Mono>
            ) : null}
          </View>
        );
      }}
    />
  );
}
