import { LIST_TITLE_MAX_LENGTH } from "@espressoir/core";
import {
  LIST_INPUT_ERRORS,
  createList,
  listInputSchema,
  loadCoffeeShelf,
  setListItem,
  setWantToTry,
  type CoffeeShelf,
} from "@espressoir/db";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useArchive } from "@/lib/archive";
import { shelfErrorText } from "@/lib/errors";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { refreshSite } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

import { Body, Button, Field, Mono } from "./ui";

const l = t.lists;

function titleError(code: string): string {
  const known = LIST_INPUT_ERRORS.find((error) => error === code) ?? "invalid";
  if (known === "titleTooLong")
    return format(l.errors.titleTooLong, { max: LIST_TITLE_MAX_LENGTH });
  return known === "titleRequired" ? l.errors.titleRequired : l.errors.invalid;
}

/** One of the member's lists, ticked when the coffee is on it. */
function ListToggle({
  title,
  isPublic,
  on,
  disabled,
  onPress,
}: {
  title: string;
  isPublic: boolean;
  on: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: on ? colors.foreground : colors.input,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <Text style={{ fontFamily: fonts.mono, fontSize: 16, color: colors.foreground }}>
        {on ? "☑" : "☐"}
      </Text>
      <View style={{ flex: 1 }}>
        <Body>{title}</Body>
        {isPublic ? null : <Mono muted>{l.private}</Mono>}
      </View>
    </Pressable>
  );
}

/**
 * "Want to try" and "Add to a list" on a coffee's page, as on the website: the member's
 * own state is read with their session, every change goes straight to Supabase, and the
 * site is asked to refresh (lists and want-to-try counts are part of its archive).
 * Visitors are sent to the sign-in.
 */
export function CoffeeShelfButtons({ coffeeId }: { coffeeId: string }) {
  const colors = useColors();
  const { session } = useSession();
  const viewer = session?.user.id ?? null;
  const { refresh } = useArchive();
  const [shelf, setShelf] = useState<CoffeeShelf | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!viewer) return setShelf(null);
    try {
      setShelf(await loadCoffeeShelf(supabase, viewer, coffeeId));
    } catch {
      setShelf(null);
    }
  }, [viewer, coffeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (session === undefined) return null;
  if (!viewer) {
    return (
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title={l.want.add} variant="outline" onPress={() => router.push("/giris")} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={l.add.open} variant="outline" onPress={() => router.push("/giris")} />
        </View>
      </View>
    );
  }
  if (!shelf) return null;

  /** Applies a change on screen at once, writes it, and puts it back if it was refused. */
  async function change(next: CoffeeShelf, write: () => Promise<unknown>) {
    const before = shelf;
    setShelf(next);
    setPending(true);
    setError(null);
    try {
      await write();
      await refreshSite();
      void refresh();
    } catch (failure) {
      setShelf(before);
      setError(shelfErrorText(failure));
    } finally {
      setPending(false);
    }
  }

  async function createWith() {
    if (!viewer || !shelf) return;
    const parsed = listInputSchema.safeParse({ title, description: "", isPublic: true });
    if (!parsed.success) {
      setError(titleError(parsed.error.issues[0]?.message ?? "invalid"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const list = await createList(supabase, viewer, parsed.data);
      await setListItem(supabase, list.id, coffeeId, true);
      setTitle("");
      await load();
      await refreshSite();
      void refresh();
    } catch (failure) {
      setError(shelfErrorText(failure));
      await load();
    } finally {
      setPending(false);
    }
  }

  const listed = shelf.lists.filter((list) => list.has).length;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={shelf.wantsToTry ? `✓ ${l.want.added}` : l.want.add}
            variant={shelf.wantsToTry ? "solid" : "outline"}
            disabled={pending}
            onPress={() =>
              void change({ ...shelf, wantsToTry: !shelf.wantsToTry }, () =>
                setWantToTry(supabase, viewer, coffeeId, !shelf.wantsToTry),
              )
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={listed > 0 ? `${l.add.open} (${listed})` : l.add.open}
            variant="outline"
            onPress={() => setOpen(true)}
          />
        </View>
      </View>
      {error && !open ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView
            contentContainerStyle={{ padding: 18, paddingTop: 28, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <Body style={{ fontFamily: fonts.bodyBold, fontSize: 20 }}>{l.add.title}</Body>
            {shelf.lists.length === 0 ? <Body muted>{l.add.none}</Body> : null}
            {shelf.lists.map((list) => (
              <ListToggle
                key={list.id}
                title={list.title}
                isPublic={list.isPublic}
                on={list.has}
                disabled={pending}
                onPress={() =>
                  void change(
                    {
                      ...shelf,
                      lists: shelf.lists.map((candidate) =>
                        candidate.id === list.id
                          ? { ...candidate, has: !candidate.has }
                          : candidate,
                      ),
                    },
                    () => setListItem(supabase, list.id, coffeeId, !list.has),
                  )
                }
              />
            ))}
            <View style={{ marginTop: 10, gap: 10 }}>
              <Field
                label={l.add.newLabel}
                placeholder={l.add.newPlaceholder}
                value={title}
                onChangeText={setTitle}
                maxLength={LIST_TITLE_MAX_LENGTH}
              />
              <Button
                title={l.add.create}
                variant="outline"
                disabled={pending || title.trim() === ""}
                onPress={() => void createWith()}
              />
            </View>
            {error ? <Mono style={{ color: colors.destructive }}>{error}</Mono> : null}
            <View style={{ marginTop: 10 }}>
              <Button title={t.mobile.close} onPress={() => setOpen(false)} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
