import { findCafe, visitsAt } from "@espressoir/db";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { DetailScreen } from "@/components/detail-screen";
import { VisitEntry } from "@/components/entries";
import { Body, Heading, Label, Mono, ScoreBadge, SectionHeading } from "@/components/ui";
import { placeOf } from "@/lib/cafes";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";

/** A café: where, its average, what it says about itself, the visits. */
export default function CafeScreen() {
  const { sehir, kafe } = useLocalSearchParams<{ sehir: string; kafe: string }>();

  return (
    <DetailScreen
      title={t.cafes.title}
      notFound={t.states.notFoundBody}
      render={(archive) => {
        const cafe = findCafe(archive, sehir, kafe);
        if (!cafe) return null;
        const visits = visitsAt(archive, cafe.id);
        return (
          <View>
            <Heading kicker={placeOf(cafe)}>{cafe.name}</Heading>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14 }}
            >
              <ScoreBadge score={cafe.avgScore} size="lg" />
              <View style={{ flex: 1, gap: 2 }}>
                <Mono>
                  {cafe.visitCount === 0
                    ? t.cafes.noVisits
                    : format(t.cafes.visitCount, { count: cafe.visitCount })}
                </Mono>
                {cafe.lastVisitedOn ? (
                  <Mono muted>
                    {t.cafes.lastVisit}: {formatDay(cafe.lastVisitedOn)}
                  </Mono>
                ) : null}
              </View>
            </View>
            {cafe.officialUsername ? (
              <Mono>
                ✓ {t.business.badge}: @{cafe.officialUsername}
              </Mono>
            ) : null}
            {cafe.description ? <Body style={{ marginTop: 8 }}>{cafe.description}</Body> : null}
            {cafe.isReviewed ? null : (
              <View style={{ marginTop: 12, gap: 4 }}>
                <Label>{t.cafes.unreviewed}</Label>
                <Body muted>{t.cafes.unreviewedNote}</Body>
              </View>
            )}
            <SectionHeading index={1}>{t.cafes.visitsTitle}</SectionHeading>
            {visits.length === 0 ? (
              <Body muted style={{ paddingVertical: 16 }}>
                {t.cafes.notVisitedYet}
              </Body>
            ) : (
              visits.map((visit) => <VisitEntry key={visit.id} visit={visit} showAuthor />)
            )}
          </View>
        );
      }}
    />
  );
}
