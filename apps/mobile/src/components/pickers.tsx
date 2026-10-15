import { TR_CITIES, cityByCode, foldTurkish } from "@espressoir/core";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

import { Body, Button, Field, Label, Mono } from "./ui";

export interface Option {
  id: string;
  label: string;
}

const MIN_QUERY = 2;

/** Answers from the database's trigram search, asked a moment after typing stops. */
function useMatches(query: string, search: (text: string) => PromiseLike<Option[]>) {
  const text = query.trim();
  const [answer, setAnswer] = useState<{ text: string; matches: Option[] } | null>(null);
  useEffect(() => {
    if (text.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let matches: Option[] = [];
      try {
        matches = await search(text);
      } catch {
        // Offline or refused: no suggestions, the member can still add a new one.
      }
      if (!cancelled) setAnswer({ text, matches });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, search]);
  if (text.length < MIN_QUERY) return { matches: [], settled: false };
  return { matches: answer?.matches ?? [], settled: answer?.text === text };
}

function OptionRow({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.input,
        backgroundColor: pressed ? colors.muted : "transparent",
        justifyContent: "center",
      })}
    >
      <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** What was chosen, with a way to choose again. */
export function Chosen({
  label,
  title,
  changeText,
  onChange,
}: {
  label: string;
  title: string;
  changeText: string;
  onChange: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Label>{title}</Label>
      <View style={{ borderWidth: 1.5, borderColor: colors.foreground, padding: 12, gap: 8 }}>
        <Body style={{ fontFamily: fonts.bodyBold }}>{label}</Body>
        <Pressable accessibilityRole="button" onPress={onChange}>
          <Mono style={{ textDecorationLine: "underline" }}>{changeText}</Mono>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Search, pick from the matches, or start a new one with what was typed. `search` asks the
 * database (search_coffees_v1 / search_cafes_v1); it must be stable between renders.
 */
export function SearchPicker({
  label,
  hint,
  resultsLabel,
  emptyText,
  addNewText,
  search,
  onPick,
  onAddNew,
}: {
  label: string;
  hint: string;
  resultsLabel: string;
  emptyText: string;
  addNewText: string;
  search: (text: string) => PromiseLike<Option[]>;
  onPick: (option: Option) => void;
  onAddNew: (typed: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { matches, settled } = useMatches(query, search);
  return (
    <View style={{ gap: 10 }}>
      <Field
        label={label}
        hint={hint}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {matches.length > 0 ? (
        <View style={{ gap: 6 }} accessibilityLabel={resultsLabel}>
          {matches.map((option) => (
            <OptionRow key={option.id} label={option.label} onPress={() => onPick(option)} />
          ))}
        </View>
      ) : settled ? (
        <Mono muted>{emptyText}</Mono>
      ) : null}
      {settled ? (
        <Pressable accessibilityRole="button" onPress={() => onAddNew(query.trim())}>
          <Mono style={{ textDecorationLine: "underline" }}>{addNewText}</Mono>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The duplicate check while something new is typed: the same coffee or café added twice
 * splits its tastings, so close matches are offered first. Silent when there are none.
 */
export function LookAlikes({
  query,
  title,
  hint,
  pickText,
  search,
  onPick,
}: {
  query: string;
  title: string;
  hint: string;
  pickText: string;
  search: (text: string) => PromiseLike<Option[]>;
  onPick: (option: Option) => void;
}) {
  const { matches } = useMatches(query, search);
  if (matches.length === 0) return null;
  return (
    <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
      <Label>{title}</Label>
      {matches.map((option) => (
        <OptionRow
          key={option.id}
          label={`${option.label} · ${pickText}`}
          onPress={() => onPick(option)}
        />
      ))}
      <Mono muted>{hint}</Mono>
    </View>
  );
}

/** Coffees resembling the query, from the same search the website uses. */
export async function searchCoffees(text: string): Promise<Option[]> {
  const { data, error } = await supabase.rpc("search_coffees_v1", { p_query: text, p_limit: 8 });
  if (error) throw error;
  return data.map((row) => ({
    id: row.coffee_id,
    label: `${row.brand_name} — ${row.coffee_name}`,
  }));
}

/** Cafés resembling the query, optionally in one city. */
export function cafeSearch(cityCode: number | null, limit = 8) {
  return async (text: string): Promise<Option[]> => {
    const { data, error } = await supabase.rpc("search_cafes_v1", {
      p_query: text,
      p_city_code: cityCode ?? undefined,
      p_limit: limit,
    });
    if (error) throw error;
    return data.map((row) => ({
      id: row.cafe_id,
      label: `${row.cafe_name} — ${[row.district, cityByCode(row.city_code)?.name].filter(Boolean).join(", ")}`,
    }));
  };
}

const CITIES = [...TR_CITIES].sort((a, b) => a.name.localeCompare(b.name, "tr"));

/** The 81 provinces in a searchable sheet. */
export function CityPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (code: number) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const wanted = foldTurkish(query.trim());
    return wanted ? CITIES.filter((city) => foldTurkish(city.name).includes(wanted)) : CITIES;
  }, [query]);

  return (
    <View style={{ gap: 6 }}>
      <Label>{t.cafes.panel.city}</Label>
      <OptionRow
        label={value ? (cityByCode(value)?.name ?? "") : t.mobile.add.chooseCity}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 18, gap: 12 }}>
          <Field
            label={t.mobile.add.citySearch}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <FlatList
            data={shown}
            keyExtractor={(city) => String(city.code)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            renderItem={({ item: city }) => (
              <OptionRow
                label={city.name}
                onPress={() => {
                  onChange(city.code);
                  setOpen(false);
                }}
              />
            )}
          />
          <Button title={t.cafes.panel.cancel} variant="outline" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
