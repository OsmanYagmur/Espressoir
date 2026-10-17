import {
  deleteList,
  findList,
  findProfile,
  loadMemberLists,
  setListItem,
  type MemberList,
} from "@espressoir/db";
import { router, useParams } from "@/navigation";
import { useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";

import { DetailScreen } from "@/components/detail-screen";
import { ReportLink } from "@/components/social";
import {
  Body,
  Button,
  Heading,
  Mono,
  QuietButton,
  RowLink,
  ScoreBadge,
  SectionHeading,
} from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { env } from "@/lib/env";
import { shelfErrorText } from "@/lib/errors";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { refreshSite } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

const l = t.lists;

/**
 * A member's list: its coffees in their order, each with its note. Public lists come from
 * the archive; the owner also opens their private ones, read with their session. The owner
 * can take a coffee off or delete the list here; renaming, notes and the order are on the
 * website.
 */
export default function ListScreen() {
  const colors = useColors();
  const { username, slug } = useParams<"List">();
  const { session } = useSession();
  const { state, refresh } = useArchive();
  const viewer = session?.user.id ?? null;
  const ownerId = state.archive ? findProfile(state.archive, username)?.id : undefined;
  const mine = viewer !== null && viewer === ownerId;
  const [ownLists, setOwnLists] = useState<MemberList[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mine || !viewer) return;
    loadMemberLists(supabase, viewer)
      .then(setOwnLists)
      .catch(() => setOwnLists(null));
  }, [mine, viewer, state.archive]);

  async function changed() {
    await refreshSite();
    await refresh();
  }

  function confirmRemove(list: MemberList, coffeeId: string) {
    Alert.alert(t.mobile.lists.removeConfirm, undefined, [
      { text: t.social.cancel, style: "cancel" },
      {
        text: l.panel.remove,
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            await setListItem(supabase, list.id, coffeeId, false);
            await changed();
          } catch (failure) {
            setError(shelfErrorText(failure));
          }
        },
      },
    ]);
  }

  function confirmDelete(list: MemberList) {
    Alert.alert(l.panel.deleteConfirm, undefined, [
      { text: t.social.cancel, style: "cancel" },
      {
        text: l.panel.delete,
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            await deleteList(supabase, list.id);
            await changed();
            router.back();
          } catch (failure) {
            setError(shelfErrorText(failure));
          }
        },
      },
    ]);
  }

  return (
    <DetailScreen
      title={l.kicker}
      notFound={t.states.notFoundBody}
      render={(archive) => {
        const list =
          (mine ? ownLists?.find((candidate) => candidate.slug === slug) : undefined) ??
          findList(archive, username, slug);
        if (!list) return null;
        const coffees = new Map(archive.coffees.map((coffee) => [coffee.id, coffee]));
        return (
          <View>
            <Heading kicker={`${l.kicker.toLocaleUpperCase("tr")} · @${list.owner.username}`}>
              {list.title}
            </Heading>
            <Mono muted style={{ paddingTop: 10 }}>
              {[
                format(l.itemCount, { count: list.items.length }),
                format(l.updated, { date: formatDay(list.updatedAt.slice(0, 10)) }),
                list.isPublic ? null : l.private,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Mono>
            {list.isHidden ? <Mono muted>{l.hiddenNote}</Mono> : null}
            {list.description ? <Body style={{ marginTop: 10 }}>{list.description}</Body> : null}

            <SectionHeading index={1}>{l.itemsLabel}</SectionHeading>
            {list.items.length === 0 ? (
              <Body muted style={{ paddingVertical: 16 }}>
                {l.empty}
              </Body>
            ) : (
              list.items.map((item, index) => {
                const coffee = coffees.get(item.coffeeId);
                if (!coffee) return null;
                return (
                  <View key={item.coffeeId}>
                    <RowLink
                      to={{
                        screen: "Coffee",
                        params: { marka: coffee.brand.slug, kahve: coffee.slug },
                      }}
                    >
                      <Mono muted>{String(index + 1).padStart(2, "0")}</Mono>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Mono muted>{coffee.brand.name}</Mono>
                        <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>
                          {coffee.name}
                        </Body>
                        {item.note ? <Body muted>{item.note}</Body> : null}
                      </View>
                      <ScoreBadge score={coffee.stats.avgScore} />
                    </RowLink>
                    {mine ? (
                      <View style={{ alignItems: "flex-end", paddingTop: 4 }}>
                        <QuietButton
                          title={l.panel.remove}
                          muted
                          onPress={() => confirmRemove(list, item.coffeeId)}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
            {error ? (
              <Mono style={{ color: colors.destructive, marginTop: 12 }}>{error}</Mono>
            ) : null}
            <View style={{ marginTop: 20, gap: 12 }}>
              {mine ? (
                <>
                  <Button
                    title={t.mobile.lists.editOnSite}
                    variant="outline"
                    onPress={() => void Linking.openURL(`${env.siteUrl}/panel/listeler/${list.id}`)}
                  />
                  <Button
                    title={l.panel.delete}
                    variant="outline"
                    onPress={() => confirmDelete(list)}
                  />
                </>
              ) : (
                <ReportLink target="list" targetId={list.id} />
              )}
            </View>
          </View>
        );
      }}
    />
  );
}
