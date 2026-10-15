import { findProfile, tastingsBy, visitsBy } from "@espressoir/db";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { DetailScreen } from "@/components/detail-screen";
import { TastingEntry, VisitEntry } from "@/components/entries";
import { Body, Heading, Label, Mono, SectionHeading } from "@/components/ui";
import { formatScore } from "@/lib/format";
import { t } from "@/lib/i18n";
import { fonts } from "@/lib/theme";

const p = t.profile;

/** A member's notebook: their numbers, their public tastings and café visits. */
export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();

  return (
    <DetailScreen
      title={`@${username}`}
      notFound={t.states.notFoundBody}
      render={(archive) => {
        const profile = findProfile(archive, username);
        if (!profile) return null;
        const tastings = tastingsBy(archive, profile.id).filter(
          (tasting) => tasting.status === "logged",
        );
        const visits = visitsBy(archive, profile.id);
        const { stats } = profile;
        const fields = [
          { label: p.fields.tastings, value: String(stats.tastingCount) },
          {
            label: p.fields.average,
            value: stats.avgScore === null ? "—" : formatScore(stats.avgScore),
          },
          { label: p.fields.coffees, value: String(stats.coffeeCount) },
          { label: p.fields.followers, value: String(stats.followerCount) },
        ];
        let section = 0;
        return (
          <View>
            <Heading kicker={`${p.kicker.toLocaleUpperCase("tr")} · @${profile.username}`}>
              {profile.displayName ?? `@${profile.username}`}
            </Heading>
            {profile.officialFor.length > 0 ? (
              <Mono style={{ paddingTop: 10 }}>
                ✓ {t.business.badge}:{" "}
                {profile.officialFor.map((business) => business.name).join(", ")}
              </Mono>
            ) : null}
            {profile.bio ? <Body style={{ marginTop: 10 }}>{profile.bio}</Body> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14 }}>
              {fields.map((field) => (
                <View key={field.label} style={{ width: "50%", paddingVertical: 8, gap: 2 }}>
                  <Label>{field.label}</Label>
                  <Body style={{ fontFamily: fonts.heading, fontSize: 26 }}>{field.value}</Body>
                </View>
              ))}
            </View>
            <SectionHeading index={++section}>{p.tastingsTitle}</SectionHeading>
            {tastings.length === 0 ? (
              <Body muted style={{ paddingVertical: 16 }}>
                {p.empty}
              </Body>
            ) : (
              tastings.map((tasting) => (
                <TastingEntry key={tasting.id} tasting={tasting} showCoffee />
              ))
            )}
            {visits.length > 0 ? (
              <>
                <SectionHeading index={++section}>{p.cafesTitle}</SectionHeading>
                {visits.map((visit) => (
                  <VisitEntry key={visit.id} visit={visit} showCafe />
                ))}
              </>
            ) : null}
          </View>
        );
      }}
    />
  );
}
