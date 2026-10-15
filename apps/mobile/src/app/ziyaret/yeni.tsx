import {
  CAFE_DRINKS,
  CAFE_VISIT_NOTES_MAX_LENGTH,
  TASTING_VISIBILITIES,
  cityByCode,
  type CafeDrink,
  type TastingVisibility,
} from "@espressoir/core";
import {
  CAFE_VISIT_INPUT_ERRORS,
  cafeVisitInputSchema,
  toLogCafeVisitArgs,
  type CafeVisitInputError,
} from "@espressoir/db";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { Choices, DayPicker, Details, Part, ScoreBoxes } from "@/components/form";
import { MemberGate } from "@/components/member-gate";
import { CityPicker, Chosen, LookAlikes, SearchPicker, cafeSearch } from "@/components/pickers";
import { Button, Field, Mono } from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { placeOf } from "@/lib/cafes";
import { visitErrorText } from "@/lib/errors";
import { format, t } from "@/lib/i18n";
import { refreshSite } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { today as todayInArchive } from "@/lib/today";

const p = t.cafes.panel;

type CafeChoice =
  | { mode: "existing"; id: string; label: string }
  | { mode: "new"; name: string; cityCode: number | null; district: string };

function inputErrorText(code: string): string {
  const known = CAFE_VISIT_INPUT_ERRORS.find((error) => error === code) as
    CafeVisitInputError | undefined;
  if (known === "notesTooLong")
    return format(t.cafes.errors.notesTooLong, { max: CAFE_VISIT_NOTES_MAX_LENGTH });
  return t.cafes.errors[known ?? "invalid"];
}

/**
 * A drink at a café: the café (search, or a new one with its city), the drink, the score,
 * the day, a note. Saved with log_cafe_visit_v1 like on the website.
 */
function VisitForm() {
  const colors = useColors();
  const { kafe } = useLocalSearchParams<{ kafe?: string }>();
  const { state, refresh } = useArchive();
  const archive = state.archive;
  const today = useMemo(() => todayInArchive(), []);

  const [cafe, setCafe] = useState<CafeChoice | null>(null);
  const [drink, setDrink] = useState<CafeDrink | null>(null);
  const [drinkName, setDrinkName] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [day, setDay] = useState(today);
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [visibility, setVisibility] = useState<TastingVisibility>("public");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // A café chosen beforehand (from its page).
  useEffect(() => {
    const chosen = kafe && archive?.cafes.find((candidate) => candidate.id === kafe);
    if (chosen)
      setCafe({ mode: "existing", id: chosen.id, label: `${chosen.name} — ${placeOf(chosen)}` });
  }, [kafe, archive]);

  // The look-alike check for a new café searches its own city only.
  const newCity = cafe?.mode === "new" ? cafe.cityCode : null;
  const searchAll = useMemo(() => cafeSearch(null), []);
  const searchCity = useMemo(() => cafeSearch(newCity, 3), [newCity]);

  async function save() {
    setMessage(null);
    const parsed = cafeVisitInputSchema(today).safeParse({
      cafe:
        cafe?.mode === "existing"
          ? { mode: "existing", cafeId: cafe.id }
          : {
              mode: "new",
              name: cafe?.mode === "new" ? cafe.name : "",
              cityCode: cafe?.mode === "new" ? cafe.cityCode : null,
              district: cafe?.mode === "new" ? cafe.district : "",
              mapUrl: "",
            },
      drink,
      drinkName,
      score,
      notes,
      visitedOn: day,
      pricePaid: price.trim() === "" ? null : Number(price.replace(",", ".")),
      visibility,
    });
    if (!parsed.success) {
      setMessage(inputErrorText(parsed.error.issues[0]?.message ?? "invalid"));
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc(
        "log_cafe_visit_v1",
        toLogCafeVisitArgs(parsed.data),
      );
      const created = data?.[0];
      if (error || !created) {
        setMessage(error ? visitErrorText(error) : t.cafes.errors.failed);
        return;
      }
      await refreshSite();
      await refresh();
      router.replace({
        pathname: "/kafe/[sehir]/[kafe]",
        params: { sehir: cityByCode(created.city_code)?.slug ?? "-", kafe: created.cafe_slug },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Part index={1} title={p.cafeSection}>
          {cafe?.mode === "existing" ? (
            <Chosen
              title={p.chosenCafe}
              label={cafe.label}
              changeText={p.changeCafe}
              onChange={() => setCafe(null)}
            />
          ) : cafe?.mode === "new" ? (
            <View style={{ gap: 14 }}>
              <Field
                label={p.name}
                value={cafe.name}
                onChangeText={(name) => setCafe({ ...cafe, name })}
              />
              <CityPicker
                value={cafe.cityCode}
                onChange={(cityCode) => setCafe({ ...cafe, cityCode })}
              />
              {cafe.cityCode ? (
                <LookAlikes
                  query={cafe.name}
                  title={p.similarTitle}
                  hint={p.similarHint}
                  pickText={p.similarPick}
                  search={searchCity}
                  onPick={(option) => setCafe({ mode: "existing", ...option })}
                />
              ) : null}
              <Field
                label={p.district}
                hint={p.districtHint}
                value={cafe.district}
                onChangeText={(district) => setCafe({ ...cafe, district })}
              />
              <Mono muted>{p.newCafeNote}</Mono>
              <Button title={p.existingCafe} variant="outline" onPress={() => setCafe(null)} />
            </View>
          ) : (
            <SearchPicker
              label={p.searchCafe}
              hint={p.searchHint}
              resultsLabel={p.searchResults}
              emptyText={p.searchEmpty}
              addNewText={p.addAsNew}
              search={searchAll}
              onPick={(option) => setCafe({ mode: "existing", ...option })}
              onAddNew={(typed) =>
                setCafe({ mode: "new", name: typed, cityCode: null, district: "" })
              }
            />
          )}
        </Part>

        <Part index={2} title={p.drinkSection}>
          <Choices
            label={p.drink}
            options={CAFE_DRINKS.map((value) => ({ value, label: t.cafes.drinks[value] }))}
            value={drink}
            onChange={setDrink}
          />
          <Field
            label={p.drinkName}
            hint={p.drinkNameHint}
            value={drinkName}
            onChangeText={setDrinkName}
          />
          <ScoreBoxes label={p.score} value={score} onChange={setScore} />
          <DayPicker label={p.date} value={day} onChange={setDay} today={today} />
          <Field
            label={p.notes}
            hint={format(t.panel.form.notesHint, { max: CAFE_VISIT_NOTES_MAX_LENGTH })}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={CAFE_VISIT_NOTES_MAX_LENGTH}
            style={{ minHeight: 110, textAlignVertical: "top", paddingTop: 10 }}
          />
        </Part>

        <Details index={3} title={p.detailsSection}>
          <Field label={p.price} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Choices
            label={p.visibility}
            options={TASTING_VISIBILITIES.map((value) => ({
              value,
              label: t.panel.visibility[value],
            }))}
            value={visibility}
            onChange={(value) => setVisibility(value ?? "public")}
          />
        </Details>

        {message ? (
          <View accessibilityLiveRegion="polite" style={{ marginTop: 18 }}>
            <Mono style={{ color: colors.destructive }}>{message}</Mono>
          </View>
        ) : null}
        <View style={{ marginTop: 22 }}>
          <Button
            title={saving ? p.saving : p.save}
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function NewVisitScreen() {
  return <MemberGate>{() => <VisitForm />}</MemberGate>;
}
