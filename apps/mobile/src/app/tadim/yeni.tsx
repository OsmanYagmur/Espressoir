import {
  FLAVOR_GROUPS,
  FLAVOR_TAGS_MAX,
  NOTES_MAX_LENGTH,
  TASTE_DIMENSIONS,
  TASTE_MAX,
  TASTE_MIN,
  TASTING_VISIBILITIES,
  type TasteDimension,
  type TastingVisibility,
} from "@espressoir/core";
import {
  TASTING_INPUT_ERRORS,
  tastingInputSchema,
  toLogTastingArgs,
  type TastingInputError,
} from "@espressoir/db";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { Choices, DayPicker, Details, MultiChoices, Part, ScoreBoxes } from "@/components/form";
import { MemberGate } from "@/components/member-gate";
import { Chosen, LookAlikes, SearchPicker, searchCoffees, type Option } from "@/components/pickers";
import { Button, Field, Label, Mono } from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { tastingErrorText } from "@/lib/errors";
import { format, t } from "@/lib/i18n";
import { PhotoFailure, pickPhoto, uploadTastingPhoto, type PickedPhoto } from "@/lib/photo";
import { refreshSite } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { today as todayInArchive } from "@/lib/today";

const f = t.panel.form;
const TASTE_LEVELS = Array.from({ length: TASTE_MAX - TASTE_MIN + 1 }, (_, i) =>
  String(TASTE_MIN + i),
);
/** How many of the member's recent coffees are offered as one-tap choices. */
const RECENT = 6;

type CoffeeChoice =
  | { mode: "existing"; id: string; label: string }
  | { mode: "new"; brandName: string; coffeeName: string };

function inputErrorText(code: string): string {
  const known = TASTING_INPUT_ERRORS.find((error) => error === code) as
    TastingInputError | undefined;
  if (known === "notesTooLong")
    return format(t.panel.errors.notesTooLong, { max: NOTES_MAX_LENGTH });
  if (known === "tooManyTags") return format(t.panel.errors.tooManyTags, { max: FLAVOR_TAGS_MAX });
  return t.panel.errors[known ?? "invalid"];
}

function photoErrorText(failure: unknown): string {
  const kind = failure instanceof PhotoFailure ? failure.kind : "upload";
  if (kind === "permission") return t.mobile.add.photoPermission;
  if (kind === "metadata") return t.mobile.add.photoMetadata;
  if (kind === "tooLarge") return t.photo.errors.tooHeavy;
  if (kind === "unreadable") return t.photo.errors.unreadable;
  return t.photo.errors.failed;
}

/**
 * A new tasting, the quick way: the coffee (recent ones one tap away), the score, the day,
 * the method and device (from the last tasting), a note; the rest under "details". Saved
 * with log_tasting_v2 like on the website, then the site is asked to show it at once.
 */
function TastingForm({ userId }: { userId: string }) {
  const colors = useColors();
  const { kahve } = useLocalSearchParams<{ kahve?: string }>();
  const { state, refresh } = useArchive();
  const archive = state.archive;
  const today = useMemo(() => todayInArchive(), []);

  const [coffee, setCoffee] = useState<CoffeeChoice | null>(null);
  const [recent, setRecent] = useState<Option[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [day, setDay] = useState(today);
  const [method, setMethod] = useState<string | null>(null);
  const [device, setDevice] = useState("");
  const [notes, setNotes] = useState("");
  const [taste, setTaste] = useState<Record<TasteDimension, number | null>>({
    body: null,
    acidity: null,
    bitterness: null,
    sweetness: null,
    aftertaste: null,
  });
  const [tags, setTags] = useState<ReadonlySet<string>>(new Set());
  const [visibility, setVisibility] = useState<TastingVisibility>("public");
  const [buyAgain, setBuyAgain] = useState<"yes" | "no" | null>(null);
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // A coffee chosen beforehand (from its page).
  useEffect(() => {
    const chosen = kahve && archive?.coffees.find((candidate) => candidate.id === kahve);
    if (chosen)
      setCoffee({
        mode: "existing",
        id: chosen.id,
        label: `${chosen.brand.name} — ${chosen.name}`,
      });
  }, [kahve, archive]);

  // The member's own last tastings: the coffees they come back to, and how they brewed last.
  useEffect(() => {
    void supabase
      .from("tasting_feed")
      .select("coffee_id, coffee_name, brand_name, brew_method_slug, device")
      .eq("user_id", userId)
      .eq("status", "logged")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        const rows = data ?? [];
        const seen = new Set<string>();
        const options: Option[] = [];
        for (const row of rows) {
          if (!row.coffee_id || seen.has(row.coffee_id)) continue;
          seen.add(row.coffee_id);
          options.push({ id: row.coffee_id, label: `${row.brand_name} — ${row.coffee_name}` });
          if (options.length === RECENT) break;
        }
        setRecent(options);
        const last = rows[0];
        if (last) {
          setMethod((current) => current ?? last.brew_method_slug ?? null);
          setDevice((current) => current || (last.device ?? ""));
        }
      });
  }, [userId]);

  const search = useCallback(searchCoffees, []);

  async function choosePhoto(source: "camera" | "library") {
    setMessage(null);
    try {
      const picked = await pickPhoto(source);
      if (picked) setPhoto(picked);
    } catch (failure) {
      setMessage(photoErrorText(failure));
    }
  }

  async function save() {
    setMessage(null);
    const parsed = tastingInputSchema(today).safeParse({
      coffee:
        coffee?.mode === "existing"
          ? { mode: "existing", coffeeId: coffee.id }
          : {
              mode: "new",
              brandName: coffee?.mode === "new" ? coffee.brandName : "",
              coffeeName: coffee?.mode === "new" ? coffee.coffeeName : "",
              form: null,
              capsuleSystem: null,
              brandIntensity: null,
              originCountry: null,
            },
      status: "logged",
      visibility,
      brewMethodSlug: method,
      device: device.trim() || null,
      score,
      tastedAt: day,
      notes: notes.trim() || null,
      ...taste,
      wouldBuyAgain: buyAgain === null ? null : buyAgain === "yes",
      pricePaid: price.trim() === "" ? null : Number(price.replace(",", ".")),
      flavorTagSlugs: [...tags],
    });
    if (!parsed.success) {
      setMessage(inputErrorText(parsed.error.issues[0]?.message ?? "invalid"));
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("log_tasting_v2", toLogTastingArgs(parsed.data));
      const created = data?.[0];
      if (error || !created) {
        setMessage(error ? tastingErrorText(error) : t.panel.errors.failed);
        return;
      }
      // The tasting is saved; a picture that cannot follow it is said so, not retried.
      let photoProblem: string | null = null;
      if (photo) {
        try {
          const uploaded = await uploadTastingPhoto(userId, photo);
          const attached = await supabase.rpc("set_tasting_photo_v1", {
            p_tasting_id: created.tasting_id,
            p_path: uploaded.path,
            p_width: uploaded.width,
            p_height: uploaded.height,
          });
          if (attached.error) photoProblem = photoErrorText(null);
        } catch (failure) {
          photoProblem = photoErrorText(failure);
        }
      }
      await refreshSite();
      await refresh();
      if (photoProblem) Alert.alert(t.mobile.add.savedWithoutPhoto, photoProblem);
      router.replace({
        pathname: "/kahve/[marka]/[kahve]",
        params: { marka: created.brand_slug, kahve: created.coffee_slug },
      });
    } finally {
      setSaving(false);
    }
  }

  const groups = FLAVOR_GROUPS.map((group) => ({
    label: t.taste.groups[group],
    options: (archive?.flavorTags ?? [])
      .filter((tag) => tag.group === group)
      .map((tag) => ({ value: tag.slug, label: tag.name })),
  })).filter((group) => group.options.length > 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Part index={1} title={f.coffeeSection}>
          {coffee?.mode === "existing" ? (
            <Chosen
              title={f.chosenCoffee}
              label={coffee.label}
              changeText={f.changeCoffee}
              onChange={() => setCoffee(null)}
            />
          ) : coffee?.mode === "new" ? (
            <View style={{ gap: 14 }}>
              <Field
                label={f.brandName}
                hint={f.brandHint}
                value={coffee.brandName}
                onChangeText={(brandName) => setCoffee({ ...coffee, brandName })}
              />
              <Field
                label={f.coffeeName}
                value={coffee.coffeeName}
                onChangeText={(coffeeName) => setCoffee({ ...coffee, coffeeName })}
              />
              <LookAlikes
                query={`${coffee.brandName} ${coffee.coffeeName}`}
                title={f.similarTitle}
                hint={f.similarHint}
                pickText={f.similarPick}
                search={search}
                onPick={(option) => setCoffee({ mode: "existing", ...option })}
              />
              <Button title={f.existingCoffee} variant="outline" onPress={() => setCoffee(null)} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {recent.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Label>{f.recent}</Label>
                  {recent.map((option) => (
                    <Button
                      key={option.id}
                      title={option.label}
                      variant="outline"
                      onPress={() => setCoffee({ mode: "existing", ...option })}
                    />
                  ))}
                </View>
              ) : null}
              <SearchPicker
                label={f.searchCoffee}
                hint={f.searchHint}
                resultsLabel={f.searchResults}
                emptyText={f.searchEmpty}
                addNewText={f.addAsNew}
                search={search}
                onPick={(option) => setCoffee({ mode: "existing", ...option })}
                onAddNew={(typed) => setCoffee({ mode: "new", brandName: "", coffeeName: typed })}
              />
            </View>
          )}
        </Part>

        <Part index={2} title={f.tastingSection}>
          <ScoreBoxes label={f.score} value={score} onChange={setScore} allowNone />
          <DayPicker label={f.date} value={day} onChange={setDay} today={today} />
          <Choices
            label={f.method}
            options={(archive?.brewMethods ?? []).map((brew) => ({
              value: brew.slug,
              label: brew.name,
            }))}
            value={method}
            onChange={setMethod}
            allowNone
          />
          <Field
            label={f.device}
            hint={f.deviceHint}
            value={device}
            onChangeText={setDevice}
            autoCorrect={false}
          />
          <Field
            label={f.notes}
            hint={format(f.notesHint, { max: NOTES_MAX_LENGTH })}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={NOTES_MAX_LENGTH}
            style={{ minHeight: 110, textAlignVertical: "top", paddingTop: 10 }}
          />
        </Part>

        <Details index={3} title={f.detailsSection}>
          <View style={{ gap: 10 }}>
            <Mono muted>{f.tasteHint}</Mono>
            {TASTE_DIMENSIONS.map((dimension) => (
              <Choices
                key={dimension}
                label={f.taste[dimension]}
                options={TASTE_LEVELS.map((level) => ({ value: level, label: level }))}
                value={taste[dimension] === null ? null : String(taste[dimension])}
                onChange={(level) =>
                  setTaste((current) => ({
                    ...current,
                    [dimension]: level === null ? null : Number(level),
                  }))
                }
                allowNone
              />
            ))}
          </View>
          <MultiChoices
            label={f.flavorTags}
            hint={format(f.flavorTagsHint, { max: FLAVOR_TAGS_MAX })}
            groups={groups}
            selected={tags}
            max={FLAVOR_TAGS_MAX}
            onToggle={(slug) =>
              setTags((current) => {
                const next = new Set(current);
                if (next.has(slug)) next.delete(slug);
                else next.add(slug);
                return next;
              })
            }
          />
          <View style={{ gap: 10 }}>
            <Label>{t.photo.label}</Label>
            <Mono muted>{t.photo.hint}</Mono>
            {photo ? (
              <View style={{ gap: 8 }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: "100%", aspectRatio: photo.width / photo.height }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
                <Button title={t.photo.remove} variant="outline" onPress={() => setPhoto(null)} />
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t.mobile.add.camera}
                    variant="outline"
                    onPress={() => void choosePhoto("camera")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t.mobile.add.library}
                    variant="outline"
                    onPress={() => void choosePhoto("library")}
                  />
                </View>
              </View>
            )}
          </View>
          <Choices
            label={f.visibility}
            options={TASTING_VISIBILITIES.map((value) => ({
              value,
              label: t.panel.visibility[value],
            }))}
            value={visibility}
            onChange={(value) => setVisibility(value ?? "public")}
          />
          <Choices
            label={f.wouldBuyAgain}
            options={[
              { value: "yes" as const, label: f.yes },
              { value: "no" as const, label: f.no },
            ]}
            value={buyAgain}
            onChange={setBuyAgain}
            allowNone
          />
          <Field label={f.price} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </Details>

        {message ? (
          <View accessibilityLiveRegion="polite" style={{ marginTop: 18 }}>
            <Mono style={{ color: colors.destructive }}>{message}</Mono>
          </View>
        ) : null}
        <View style={{ marginTop: 22 }}>
          <Button
            title={saving ? f.saving : f.save}
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function NewTastingScreen() {
  return <MemberGate>{(userId) => <TastingForm userId={userId} />}</MemberGate>;
}
