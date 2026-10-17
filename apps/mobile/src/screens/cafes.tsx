import { cityByCode, foldTurkish } from "@espressoir/core";
import type { Cafe } from "@espressoir/db";
import { useState } from "react";
import { View } from "react-native";

import { ArchiveList } from "@/components/archive-screen";
import { Body, Field, Heading, Label, Mono, RowLink, ScoreBadge } from "@/components/ui";
import { placeOf } from "@/lib/cafes";
import { format, t } from "@/lib/i18n";
import { fonts } from "@/lib/theme";

/** Cafés, most visited first; search by name, district or city, as on /kafeler. */
export default function CafesScreen() {
  const [query, setQuery] = useState("");
  const wanted = foldTurkish(query.trim());

  return (
    <ArchiveList<Cafe>
      items={(archive) =>
        [...archive.cafes]
          .filter(
            (cafe) =>
              wanted === "" || foldTurkish(`${cafe.name} ${placeOf(cafe)}`).includes(wanted),
          )
          .sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name, "tr"))
      }
      keyOf={(cafe) => cafe.id}
      empty={t.cafes.emptyArchive}
      header={() => (
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <Heading>{t.cafes.title}</Heading>
          <Field
            label={t.cafes.search}
            placeholder={t.mobile.cafeSearch}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}
      renderItem={({ item: cafe }) => (
        <RowLink
          to={{
            screen: "Cafe",
            params: { sehir: cityByCode(cafe.cityCode)?.slug ?? "-", kafe: cafe.slug },
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Mono muted>{placeOf(cafe)}</Mono>
            <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>{cafe.name}</Body>
            <Mono muted>
              {cafe.visitCount === 0
                ? t.cafes.noVisits
                : format(t.cafes.visitCount, { count: cafe.visitCount })}
            </Mono>
            {cafe.isReviewed ? null : <Label>{t.cafes.unreviewed}</Label>}
          </View>
          <ScoreBadge score={cafe.avgScore} />
        </RowLink>
      )}
    />
  );
}
