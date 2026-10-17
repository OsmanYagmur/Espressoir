import {
  findProfile,
  listsBy,
  loadMemberLists,
  loadOwnTastings,
  tastingsBy,
  visitsBy,
  type MemberList,
  type Tasting,
} from "@espressoir/db";
import { useParams } from "@/navigation";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { DetailScreen } from "@/components/detail-screen";
import { TastingEntry, VisitEntry } from "@/components/entries";
import { FollowButton, ReportLink } from "@/components/social";
import { Body, Heading, Label, Mono, RowLink, SectionHeading } from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { formatScore } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { fonts } from "@/lib/theme";

const p = t.profile;

/**
 * The member's own rows, whatever their visibility: their tastings (wishlist included) and
 * lists. Only for their own profile; everyone else sees the public archive.
 */
function useOwnRows(userId: string | null, archive: unknown) {
  const [rows, setRows] = useState<{ tastings: Tasting[]; lists: MemberList[] } | null>(null);
  const load = useCallback(async () => {
    if (!userId) return setRows(null);
    try {
      const [tastings, lists] = await Promise.all([
        loadOwnTastings(supabase, userId),
        loadMemberLists(supabase, userId),
      ]);
      setRows({ tastings, lists });
    } catch {
      setRows(null);
    }
  }, [userId]);
  // Read again whenever the archive is (pull to refresh, after a save).
  useEffect(() => {
    void load();
  }, [load, archive]);
  return rows;
}

function ListRow({ list, username }: { list: MemberList; username: string }) {
  return (
    <RowLink to={{ screen: "List", params: { username, slug: list.slug } }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>{list.title}</Body>
        <Mono muted>
          {[
            format(t.mobile.profile.lists, { count: list.items.length }),
            list.isPublic ? null : t.lists.private,
            list.isHidden ? t.lists.hidden : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Mono>
      </View>
    </RowLink>
  );
}

/**
 * A member's notebook: their numbers, tastings, lists and café visits, a follow button.
 * On the member's own profile it also shows what only they can see.
 */
export default function ProfileScreen() {
  const { username } = useParams<"Profile">();
  const { session } = useSession();
  const { state } = useArchive();
  const viewer = session?.user.id ?? null;
  const ownerId = state.archive ? findProfile(state.archive, username)?.id : undefined;
  const mine = viewer !== null && viewer === ownerId;
  const own = useOwnRows(mine ? viewer : null, state.archive);

  return (
    <DetailScreen
      title={`@${username}`}
      notFound={t.states.notFoundBody}
      render={(archive) => {
        const profile = findProfile(archive, username);
        if (!profile) return null;
        const entries = own?.tastings ?? tastingsBy(archive, profile.id);
        const tastings = entries.filter((tasting) => tasting.status === "logged");
        const wishlist = entries.filter((tasting) => tasting.status === "wishlist");
        const lists = own?.lists ?? listsBy(archive, profile.id);
        const visits = visitsBy(archive, profile.id);
        const { stats } = profile;
        const fields = [
          { label: p.fields.tastings, value: String(stats.tastingCount) },
          {
            label: p.fields.average,
            value: stats.avgScore === null ? "—" : formatScore(stats.avgScore),
          },
          { label: p.fields.followers, value: String(stats.followerCount) },
          { label: p.fields.following, value: String(stats.followingCount) },
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
            <View style={{ marginTop: 10, gap: 10 }}>
              <FollowButton userId={profile.id} />
              {mine ? <Mono muted>{t.mobile.profile.mine}</Mono> : null}
            </View>

            <SectionHeading index={++section}>{p.tastingsTitle}</SectionHeading>
            {tastings.length === 0 ? (
              <Body muted style={{ paddingVertical: 16 }}>
                {mine ? t.panel.empty : p.empty}
              </Body>
            ) : (
              tastings.map((tasting) => (
                <TastingEntry
                  key={tasting.id}
                  tasting={tasting}
                  showCoffee
                  showVisibility={mine}
                  open
                />
              ))
            )}
            {wishlist.length > 0 ? (
              <>
                <SectionHeading index={++section}>{p.wishlistTitle}</SectionHeading>
                {wishlist.map((tasting) => (
                  <RowLink
                    key={tasting.id}
                    to={{
                      screen: "Coffee",
                      params: { marka: tasting.brand.slug, kahve: tasting.coffee.slug },
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Mono muted>{tasting.brand.name}</Mono>
                      <Body style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>
                        {tasting.coffee.name}
                      </Body>
                    </View>
                  </RowLink>
                ))}
              </>
            ) : null}
            {lists.length > 0 ? (
              <>
                <SectionHeading index={++section}>{p.listsTitle}</SectionHeading>
                {lists.map((list) => (
                  <ListRow key={list.id} list={list} username={profile.username} />
                ))}
              </>
            ) : null}
            {visits.length > 0 ? (
              <>
                <SectionHeading index={++section}>{p.cafesTitle}</SectionHeading>
                {visits.map((visit) => (
                  <VisitEntry key={visit.id} visit={visit} showCafe />
                ))}
              </>
            ) : null}
            {mine ? null : (
              <View style={{ paddingTop: 20 }}>
                <ReportLink target="profile" targetId={profile.id} />
              </View>
            )}
          </View>
        );
      }}
    />
  );
}
