-- Photos (Phase 3D): one picture per tasting and one per profile. The files live in
-- Supabase Storage (bucket "media"); this migration is everything around them: the bucket
-- and who may put what where, the columns that say which file belongs to which row, and
-- the functions that set them.
-- Rollback: supabase/rollbacks/20261015090000_media.down.sql

-- ── the bucket ──────────────────────────────────────────────────────────────────────────
-- Public to read (pictures are shown on public pages). 600 KB and two formats: the
-- browser shrinks and re-encodes every picture before sending it, and Storage refuses
-- whatever skipped that step.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 614400, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Paths are <kind>/<member id>/<file>: a member writes only inside their own folders.
-- Storage's own rules are row level security on storage.objects, like any other table.
create policy media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in ('tastings', 'avatars')
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.can_post())
  );
-- Reading the rows (not the files: those are public) is what listing and removing need.
create policy media_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );
-- One's own files can always be removed, restricted or not; an admin can remove anyone's.
create policy media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

-- ── which file belongs to which row ─────────────────────────────────────────────────────
-- The path of the full-size file; its small twin sits beside it ("…-s" before the
-- extension). Members cannot write these columns: set_tasting_photo_v1 does.
alter table public.tastings
  add column photo_path text,
  add column photo_width smallint,
  add column photo_height smallint,
  -- What the picture shows, for people who cannot see it. Plain text.
  add column photo_alt text,
  add constraint tastings_photo_path_format
    check (photo_path ~ '^tastings/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'),
  add constraint tastings_photo_complete check (
    (photo_path is null and photo_width is null and photo_height is null and photo_alt is null)
    or (photo_path is not null and photo_width is not null and photo_height is not null)
  ),
  add constraint tastings_photo_size
    check (photo_width between 1 and 1600 and photo_height between 1 and 1600),
  add constraint tastings_photo_alt_length check (char_length(photo_alt) between 1 and 140),
  -- A wishlist entry has not been tasted: there is nothing to photograph yet.
  add constraint tastings_wishlist_has_no_photo check (status = 'logged' or photo_path is null);

alter table public.profiles
  add column avatar_path text,
  add constraint profiles_avatar_path_format
    check (avatar_path ~ '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$');

-- avatar_url could be set to any address on the web (a tracking pixel, say). Nothing ever
-- used it; pictures now go through avatar_path. The column stays, unwritable.
revoke update (avatar_url) on table public.profiles from authenticated;

-- ── setting and clearing ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER because the columns are not writable through the API. Each function
-- checks whose row it is, that the file is in the caller's own folder, and that it exists.
-- They return the path that was there before, so the caller can remove that file.

create function public.set_tasting_photo_v1(
  p_tasting_id uuid,
  p_path text,
  p_width integer default null,
  p_height integer default null,
  p_alt text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_previous text;
  v_status public.tasting_status;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.photo_path, t.status into v_previous, v_status
  from public.tastings t
  where t.id = p_tasting_id and t.user_id = v_user_id
  for update;
  if not found then
    raise exception 'tasting_not_found' using errcode = 'P0002';
  end if;

  -- Taking a picture away is always allowed, like deleting anything of one's own.
  if p_path is null then
    update public.tastings
    set photo_path = null, photo_width = null, photo_height = null, photo_alt = null
    where id = p_tasting_id;
    return v_previous;
  end if;

  if not public.can_post() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_status <> 'logged' then
    raise exception 'wishlist_has_no_photo' using errcode = '23514';
  end if;
  if (storage.foldername(p_path))[1] is distinct from 'tastings'
    or (storage.foldername(p_path))[2] is distinct from v_user_id::text
  then
    raise exception 'photo_not_yours' using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'media' and o.name = p_path
  ) then
    raise exception 'photo_not_found' using errcode = 'P0002';
  end if;

  update public.tastings
  set photo_path = p_path,
      photo_width = p_width,
      photo_height = p_height,
      photo_alt = nullif(btrim(p_alt), '')
  where id = p_tasting_id;
  return v_previous;
end
$$;

comment on function public.set_tasting_photo_v1 is
  'Attaches an uploaded picture to one of the caller''s tastings, or removes it (null path).';

create function public.set_avatar_v1(p_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_previous text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select p.avatar_path into v_previous from public.profiles p where p.id = v_user_id for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0002';
  end if;

  if p_path is not null then
    if not public.can_post() then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if (storage.foldername(p_path))[1] is distinct from 'avatars'
      or (storage.foldername(p_path))[2] is distinct from v_user_id::text
    then
      raise exception 'photo_not_yours' using errcode = '42501';
    end if;
    if not exists (
      select 1 from storage.objects o where o.bucket_id = 'media' and o.name = p_path
    ) then
      raise exception 'photo_not_found' using errcode = 'P0002';
    end if;
  end if;

  update public.profiles set avatar_path = p_path where id = v_user_id;
  return v_previous;
end
$$;

comment on function public.set_avatar_v1 is
  'Sets the caller''s profile picture to an uploaded file, or removes it (null path).';

-- An admin takes a picture down: the row forgets it and the act is logged. The file
-- itself is removed by the caller through Storage (admins may delete any file).
create function public.admin_remove_photo_v1(
  p_target_type public.report_target,
  p_target_id uuid,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous text;
begin
  perform public.log_admin_action('remove_photo', p_target_type::text, p_target_id, p_note);

  if p_target_type = 'tasting' then
    select t.photo_path into v_previous from public.tastings t where t.id = p_target_id for update;
    if not found then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
    update public.tastings
    set photo_path = null, photo_width = null, photo_height = null, photo_alt = null
    where id = p_target_id;
  elsif p_target_type = 'profile' then
    select p.avatar_path into v_previous from public.profiles p where p.id = p_target_id for update;
    if not found then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
    update public.profiles set avatar_path = null where id = p_target_id;
  else
    raise exception 'target_has_no_photo' using errcode = '22023';
  end if;
  return v_previous;
end
$$;

comment on function public.admin_remove_photo_v1 is
  'Admin: detaches the picture of a tasting or a profile and returns its path.';

-- How much is stored, so the free plan's limit is seen coming.
create function public.media_usage_v1()
returns table (files integer, bytes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select count(*)::integer, coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id = 'media';
end
$$;

comment on function public.media_usage_v1 is
  'Admin: number of stored pictures and their total size in bytes.';

revoke all on function
  public.set_tasting_photo_v1, public.set_avatar_v1, public.admin_remove_photo_v1,
  public.media_usage_v1
  from public, anon;
grant execute on function
  public.set_tasting_photo_v1, public.set_avatar_v1, public.admin_remove_photo_v1,
  public.media_usage_v1
  to authenticated;

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- New columns at the end; everything before them is unchanged.
create or replace view public.tasting_feed
with (security_invoker = true)
as
select
  t.id as tasting_id,
  t.status,
  t.visibility,
  t.score,
  t.tasted_at,
  t.notes,
  t.device,
  t.body,
  t.acidity,
  t.bitterness,
  t.sweetness,
  t.aftertaste,
  t.would_buy_again,
  t.created_at,
  p.id as user_id,
  p.username,
  p.display_name,
  c.id as coffee_id,
  c.slug as coffee_slug,
  c.name as coffee_name,
  c.form,
  c.brand_intensity,
  c.origin_country,
  b.id as brand_id,
  b.slug as brand_slug,
  b.name as brand_name,
  m.slug as brew_method_slug,
  m.name as brew_method_name,
  m.category as brew_category,
  (select count(*) from public.likes l where l.tasting_id = t.id)::integer as like_count,
  (
    select count(*) from public.comments k
    where k.tasting_id = t.id and k.deleted_at is null and k.hidden_at is null
  )::integer as comment_count,
  (t.hidden_at is not null) as is_hidden,
  -- Flavour tags in the order of the reference list, as two arrays of the same length:
  -- the slugs to work with and the names to print. Empty for a tasting without any.
  coalesce(
    (
      select array_agg(f.slug order by f.sort_order, f.slug)
      from public.tasting_flavor_tags x
      join public.flavor_tags f on f.id = x.flavor_tag_id
      where x.tasting_id = t.id
    ),
    '{}'::text[]
  ) as flavor_tag_slugs,
  coalesce(
    (
      select array_agg(f.name order by f.sort_order, f.slug)
      from public.tasting_flavor_tags x
      join public.flavor_tags f on f.id = x.flavor_tag_id
      where x.tasting_id = t.id
    ),
    '{}'::text[]
  ) as flavor_tag_names,
  -- The photo: where the file is, its size in pixels (so pages can reserve the space),
  -- and what it shows, in the author's words.
  t.photo_path,
  t.photo_width,
  t.photo_height,
  t.photo_alt
from public.tastings t
join public.profiles p on p.id = t.user_id
join public.coffees c on c.id = t.coffee_id
join public.brands b on b.id = c.brand_id
left join public.brew_methods m on m.id = t.brew_method_id;

-- "select f.*" was expanded when the view was made: say it again to pick up the new columns.
create or replace view public.following_feed
with (security_invoker = true)
as
select f.*
from public.tasting_feed f
where f.status = 'logged'
  and exists (
    select 1 from public.follows w
    where w.follower_id = (select auth.uid()) and w.following_id = f.user_id
  );

create or replace view public.profile_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.created_at as joined_at,
  (count(t.id) filter (where t.status = 'logged'))::integer as tasting_count,
  (count(t.score) filter (where t.status = 'logged'))::integer as rated_count,
  round(avg(t.score) filter (where t.status = 'logged'), 2) as avg_score,
  (count(distinct t.coffee_id) filter (where t.status = 'logged'))::integer as coffee_count,
  (count(t.id) filter (where t.status = 'wishlist'))::integer as wishlist_count,
  max(t.tasted_at) filter (where t.status = 'logged') as last_tasted_at,
  (select count(*) from public.follows f where f.following_id = p.id)::integer as follower_count,
  (select count(*) from public.follows f where f.follower_id = p.id)::integer as following_count,
  p.avatar_path
from public.profiles p
left join public.tastings t
  on t.user_id = p.id and t.visibility = 'public' and t.hidden_at is null
where p.onboarded_at is not null
group by p.id;

-- ── data export ─────────────────────────────────────────────────────────────────────────
create or replace function public.export_my_data_v2()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  -- v1 refuses anonymous callers.
  return public.export_my_data_v1() || jsonb_build_object(
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'tasting_id', c.tasting_id, 'reply_to', c.parent_id, 'body', c.body,
        'created_at', c.created_at, 'edited_at', c.edited_at, 'hidden', c.hidden_at is not null
      ) order by c.created_at)
      from public.comments c
      where c.user_id = v_user_id
    ), '[]'::jsonb),
    'likes', coalesce((
      select jsonb_agg(jsonb_build_object('tasting_id', l.tasting_id, 'created_at', l.created_at)
                       order by l.created_at)
      from public.likes l
      where l.user_id = v_user_id
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'target_type', r.target_type, 'target_id', r.target_id, 'reason', r.reason,
        'details', r.details, 'status', r.status, 'created_at', r.created_at
      ) order by r.created_at)
      from public.reports r
      where r.reporter_id = v_user_id
    ), '[]'::jsonb),
    'tasting_flavor_tags', coalesce((
      select jsonb_agg(jsonb_build_object('tasting_id', x.tasting_id, 'tags', x.tags)
                       order by x.tasting_id)
      from (
        select g.tasting_id, jsonb_agg(f.name order by f.sort_order, f.slug) as tags
        from public.tasting_flavor_tags g
        join public.tastings t on t.id = g.tasting_id
        join public.flavor_tags f on f.id = g.flavor_tag_id
        where t.user_id = v_user_id
        group by g.tasting_id
      ) x
    ), '[]'::jsonb),
    'lists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', l.title, 'description', l.description, 'public', l.is_public,
        'created_at', l.created_at, 'updated_at', l.updated_at,
        'coffees', coalesce((
          select jsonb_agg(jsonb_build_object('brand', b.name, 'coffee', c.name, 'note', i.note)
                           order by i.position)
          from public.list_items i
          join public.coffees c on c.id = i.coffee_id
          join public.brands b on b.id = c.brand_id
          where i.list_id = l.id
        ), '[]'::jsonb)
      ) order by l.created_at)
      from public.lists l
      where l.user_id = v_user_id
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', n.type, 'from', a.username, 'tasting_id', n.tasting_id,
        'created_at', n.created_at, 'read_at', n.read_at
      ) order by n.created_at)
      from public.notifications n
      join public.profiles a on a.id = n.actor_id
      where n.user_id = v_user_id
    ), '[]'::jsonb),
    -- Where the member's pictures are kept (bucket "media"); the files can be fetched there.
    'photos', jsonb_build_object(
      'avatar', (select p.avatar_path from public.profiles p where p.id = v_user_id),
      'tastings', coalesce((
        select jsonb_agg(jsonb_build_object(
          'tasting_id', t.id, 'path', t.photo_path, 'description', t.photo_alt
        ) order by t.created_at)
        from public.tastings t
        where t.user_id = v_user_id and t.photo_path is not null
      ), '[]'::jsonb)
    )
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists, notifications and photos.';
