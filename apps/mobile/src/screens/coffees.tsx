import { DEFAULT_COFFEE_FILTER, filterCoffees, type CoffeeListItem } from "@espressoir/core";
import { toListItems } from "@espressoir/db";
import { useState } from "react";
import { View } from "react-native";

import { ArchiveList } from "@/components/archive-screen";
import { Body, Field, Heading, Mono, RowLink, ScoreBadge } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { fonts } from "@/lib/theme";

/** Every coffee, searchable; the same list and filter as the website's /kahveler. */
export default function CoffeesScreen() {
  const [query, setQuery] = useState("");

  return (
    <ArchiveList<CoffeeListItem>
      items={(archive) => filterCoffees(toListItems(archive), { ...DEFAULT_COFFEE_FILTER, query })}
      keyOf={(coffee) => coffee.id}
      header={() => (
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <Heading>{t.coffees.title}</Heading>
          <Field
            label={t.coffees.search}
            placeholder={t.mobile.coffeeSearch}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}
      renderItem={({ item: coffee }) => (
        <RowLink
          to={{
            screen: "Coffee",
            params: { marka: coffee.brandSlug, kahve: coffee.slug },
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Mono muted>{coffee.brandName}</Mono>
            <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>{coffee.name}</Body>
            <Mono muted>
              {coffee.tastingCount === 0
                ? t.coffee.wishlist
                : [
                    coffee.lastTastedAt ? formatDay(coffee.lastTastedAt) : null,
                    coffee.tastingCount > 1
                      ? format(t.coffee.tastingCount, { count: coffee.tastingCount })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </Mono>
          </View>
          <ScoreBadge score={coffee.avgScore} />
        </RowLink>
      )}
    />
  );
}
