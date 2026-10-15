-- Verified roaster and café accounts (Phase 4B). A member applies to speak for a brand or
-- a café; an admin approves. The official account gets a badge, edits the business's page
-- (through a function, not column grants: those are per role and would open the name and
-- the city too), and may not score its own coffees or café.
-- Rollback: supabase/rollbacks/20261018090000_official_accounts.down.sql

-- ── what a business page says ───────────────────────────────────────────────────────────
alter table public.brands
  add column description text,
  add constraint brands_description_length check (char_length(description) between 1 and 1000);
alter table public.cafes
  add column description text,
  add column website text,
  add constraint cafes_description_length check (char_length(description) between 1 and 1000),
  add constraint cafes_website_format check (
    char_length(website) <= 300 and website ~ '^https://[^\s/$.?#][^\s]*$'
  );

-- ── official accounts ───────────────────────────────────────────────────────────────────
create table public.official_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete cascade,
  cafe_id uuid references public.cafes (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint official_accounts_one_business check (num_nonnulls(brand_id, cafe_id) = 1),
  -- A business has one official account; a member may speak for several businesses.
  constraint official_accounts_brand_key unique (brand_id),
  constraint official_accounts_cafe_key unique (cafe_id)
);

create index official_accounts_profile_idx on public.official_accounts (profile_id);

alter table public.official_accounts enable row level security;
-- Public knowledge, like a profile. Only admins grant and revoke, through functions.
revoke all on table public.official_accounts from anon, authenticated;
grant select on table public.official_accounts to anon, authenticated;
grant all on table public.official_accounts to service_role;

create policy official_accounts_select_all on public.official_accounts
  for select to anon, authenticated
  using (true);

-- ── applying ────────────────────────────────────────────────────────────────────────────
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete cascade,
  cafe_id uuid references public.cafes (id) on delete cascade,
  -- Why this member speaks for the business (role, how to check it). Plain text.
  message text not null,
  website text,
  -- open → approved | rejected. Text with a check, not an enum.
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  note text,
  constraint verification_requests_one_business check (num_nonnulls(brand_id, cafe_id) = 1),
  constraint verification_requests_message_length check (char_length(message) between 1 and 1000),
  constraint verification_requests_website_format check (
    char_length(website) <= 300 and website ~ '^https://[^\s/$.?#][^\s]*$'
  ),
  constraint verification_requests_status_known check (status in ('open', 'approved', 'rejected')),
  constraint verification_requests_note_length check (char_length(note) between 1 and 500)
);

create index verification_requests_open_idx on public.verification_requests (created_at)
  where status = 'open';
-- One open application per member and business.
create unique index verification_requests_open_brand
  on public.verification_requests (profile_id, brand_id) where status = 'open';
create unique index verification_requests_open_cafe
  on public.verification_requests (profile_id, cafe_id) where status = 'open';

create function public.prepare_verification_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.message := nullif(btrim(new.message), '');
  new.website := nullif(btrim(new.website), '');
  if exists (
    select 1 from public.official_accounts o
    where o.brand_id = new.brand_id or o.cafe_id = new.cafe_id
  ) then
    raise exception 'already_official' using errcode = '23505';
  end if;
  return new;
end
$$;

create trigger verification_requests_prepare
  before insert on public.verification_requests
  for each row execute function public.prepare_verification_request();
create trigger verification_requests_rate_limit
  before insert on public.verification_requests
  for each row execute function public.enforce_rate_limit('profile_id', '3', '1 day');

alter table public.verification_requests enable row level security;
revoke all on table public.verification_requests from anon, authenticated;
grant select, delete on table public.verification_requests to authenticated;
grant insert (profile_id, brand_id, cafe_id, message, website)
  on table public.verification_requests to authenticated;
grant all on table public.verification_requests to service_role;

create policy verification_requests_select_own on public.verification_requests
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));
create policy verification_requests_insert_own on public.verification_requests
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and (select public.can_post()));
-- An application can be withdrawn while nobody has answered it.
create policy verification_requests_delete_open on public.verification_requests
  for delete to authenticated
  using (profile_id = (select auth.uid()) and status = 'open');

-- ── an official account does not score its own ─────────────────────────────────────────
create function public.refuse_official_self_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'tastings' then
    if new.score is not null and exists (
      select 1 from public.official_accounts o
      join public.coffees c on c.brand_id = o.brand_id
      where o.profile_id = new.user_id and c.id = new.coffee_id
    ) then
      raise exception 'official_cannot_score' using errcode = '23514';
    end if;
  elsif exists (
    select 1 from public.official_accounts o
    where o.profile_id = new.user_id and o.cafe_id = new.cafe_id
  ) then
    raise exception 'official_cannot_score' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger tastings_official_self_score
  before insert or update of score, coffee_id on public.tastings
  for each row execute function public.refuse_official_self_score();
create trigger cafe_visits_official_self_score
  before insert or update of score, cafe_id on public.cafe_visits
  for each row execute function public.refuse_official_self_score();

revoke all on function public.prepare_verification_request, public.refuse_official_self_score
  from public, anon, authenticated;

-- ── editing the business's page ────────────────────────────────────────────────────────
-- What an official account (or an admin) may change: the description and the website;
-- for a café also the district and the map link. The whole set is replaced: an empty value
-- clears the field. Name, city and merging stay with admins.
create function public.update_business_page_v1(
  p_brand_id uuid default null,
  p_cafe_id uuid default null,
  p_description text default null,
  p_website text default null,
  p_district text default null,
  p_map_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if num_nonnulls(p_brand_id, p_cafe_id) <> 1 then
    raise exception 'target_required' using errcode = '22023';
  end if;
  if not public.can_post() or not (
    public.is_admin() or exists (
      select 1 from public.official_accounts o
      where o.profile_id = v_user_id
        and (o.brand_id = p_brand_id or o.cafe_id = p_cafe_id)
    )
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_brand_id is not null then
    update public.brands
    set description = nullif(btrim(p_description), ''),
        website = nullif(btrim(p_website), '')
    where id = p_brand_id;
  else
    update public.cafes
    set description = nullif(btrim(p_description), ''),
        website = nullif(btrim(p_website), ''),
        district = p_district,
        map_url = p_map_url
    where id = p_cafe_id;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

comment on function public.update_business_page_v1 is
  'Official account or admin: replaces a brand''s or café''s description and links.';

revoke all on function public.update_business_page_v1 from public, anon;
grant execute on function public.update_business_page_v1 to authenticated;

-- ── notifications: the answer to an application ────────────────────────────────────────
alter table public.notifications
  add column request_id uuid references public.verification_requests (id) on delete cascade;
create index notifications_request_idx on public.notifications (request_id);

alter table public.notifications
  drop constraint notifications_type_known,
  add constraint notifications_type_known
    check (type in ('like', 'comment', 'reply', 'follow', 'verification')),
  drop constraint notifications_shape,
  add constraint notifications_shape check (
    (type = 'follow' and tasting_id is null and comment_id is null and request_id is null)
    or (type = 'like' and tasting_id is not null and comment_id is null and request_id is null)
    or (type in ('comment', 'reply') and tasting_id is not null and comment_id is not null
        and request_id is null)
    or (type = 'verification' and request_id is not null and tasting_id is null
        and comment_id is null)
  );

create or replace view public.notification_feed
with (security_invoker = true)
as
select
  n.id as notification_id,
  n.type,
  n.created_at,
  n.read_at,
  a.username as actor_username,
  a.display_name as actor_display_name,
  n.tasting_id,
  b.name as brand_name,
  c.name as coffee_name,
  n.comment_id,
  left(k.body, 140) as comment_excerpt,
  n.request_id,
  vr.status as request_status,
  coalesce(vb.name, vc.name) as business_name
from public.notifications n
join public.profiles a on a.id = n.actor_id
left join public.tastings t on t.id = n.tasting_id
left join public.coffees c on c.id = t.coffee_id
left join public.brands b on b.id = c.brand_id
left join public.comments k on k.id = n.comment_id
left join public.verification_requests vr on vr.id = n.request_id
left join public.brands vb on vb.id = vr.brand_id
left join public.cafes vc on vc.id = vr.cafe_id
where (n.tasting_id is null or t.id is not null)
  and (n.request_id is null or vr.id is not null)
  and (
    n.comment_id is null
    or (k.id is not null and k.deleted_at is null and k.hidden_at is null)
  );


-- ── admin acts ──────────────────────────────────────────────────────────────────────────
create function public.admin_resolve_verification_v1(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.verification_requests;
begin
  perform public.log_admin_action(
    case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'verification', p_request_id, p_note
  );
  select * into v_request from public.verification_requests where id = p_request_id for update;
  if not found then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'open' then
    raise exception 'request_not_open' using errcode = '22023';
  end if;

  if p_approve then
    if exists (
      select 1 from public.official_accounts o
      where o.brand_id = v_request.brand_id or o.cafe_id = v_request.cafe_id
    ) then
      raise exception 'already_official' using errcode = '23505';
    end if;
    insert into public.official_accounts (profile_id, brand_id, cafe_id, granted_by)
    values (v_request.profile_id, v_request.brand_id, v_request.cafe_id, (select auth.uid()));
  end if;

  update public.verification_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      resolved_at = now(),
      resolved_by = (select auth.uid()),
      note = nullif(left(btrim(p_note), 500), '')
  where id = p_request_id;

  -- The applicant hears the answer (an admin answering their own application does not).
  if v_request.profile_id <> (select auth.uid()) then
    insert into public.notifications (user_id, actor_id, type, request_id)
    values (v_request.profile_id, (select auth.uid()), 'verification', p_request_id);
  end if;
end
$$;

create function public.admin_revoke_official_v1(p_official_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform public.log_admin_action('revoke_official', 'official_account', p_official_id, p_note);
  delete from public.official_accounts where id = p_official_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

revoke all on function public.admin_resolve_verification_v1, public.admin_revoke_official_v1
  from public, anon;
grant execute on function public.admin_resolve_verification_v1, public.admin_revoke_official_v1
  to authenticated;

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- A brand's page: what it says about itself and who speaks for it.
create view public.brand_pages
with (security_invoker = true)
as
select
  b.id as brand_id,
  b.slug as brand_slug,
  b.name as brand_name,
  b.description,
  b.website,
  pr.username as official_username,
  pr.display_name as official_display_name
from public.brands b
left join public.official_accounts o on o.brand_id = b.id
left join public.profiles pr on pr.id = o.profile_id;

comment on view public.brand_pages is 'Brands with their description, website and official account.';

revoke all on table public.brand_pages from anon, authenticated;
grant select on table public.brand_pages to anon, authenticated, service_role;

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
  p.avatar_path,
  -- The businesses this member speaks for (Phase 4B).
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', case when o.brand_id is not null then 'brand' else 'cafe' end,
      'id', coalesce(o.brand_id, o.cafe_id),
      'slug', coalesce(b.slug, c.slug),
      'name', coalesce(b.name, c.name),
      'city_code', c.city_code
    ) order by coalesce(b.name, c.name))
    from public.official_accounts o
    left join public.brands b on b.id = o.brand_id
    left join public.cafes c on c.id = o.cafe_id
    where o.profile_id = p.id
  ), '[]'::jsonb) as official_for
from public.profiles p
left join public.tastings t
  on t.user_id = p.id and t.visibility = 'public' and t.hidden_at is null
where p.onboarded_at is not null
group by p.id;

create or replace view public.cafe_overview
with (security_invoker = true)
as
select
  c.id as cafe_id,
  c.slug as cafe_slug,
  c.name as cafe_name,
  c.city_code,
  c.district,
  c.map_url,
  c.created_at,
  (c.reviewed_at is not null) as is_reviewed,
  count(v.id)::integer as visit_count,
  round(avg(v.score), 2) as avg_score,
  max(v.visited_on) as last_visited_on,
  c.description,
  c.website,
  (
    select pr.username from public.official_accounts o
    join public.profiles pr on pr.id = o.profile_id
    where o.cafe_id = c.id
  ) as official_username
from public.cafes c
left join public.cafe_visits v
  on v.cafe_id = c.id and v.visibility = 'public' and v.hidden_at is null
group by c.id;

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
    'cafes_added', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'city_code', c.city_code,
                                          'district', c.district, 'created_at', c.created_at)
                       order by c.created_at)
      from public.cafes c
      where c.created_by = v_user_id
    ), '[]'::jsonb),
    'cafe_visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cafe', c.name, 'city_code', c.city_code, 'drink', v.drink, 'drink_name', v.drink_name,
        'score', v.score, 'notes', v.notes, 'visited_on', v.visited_on,
        'price_paid', v.price_paid, 'visibility', v.visibility, 'created_at', v.created_at
      ) order by v.created_at)
      from public.cafe_visits v
      join public.cafes c on c.id = v.cafe_id
      where v.user_id = v_user_id
    ), '[]'::jsonb),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'brand', b.name, 'coffee', c.name, 'model', r.model, 'score', r.score,
        'reason', r.reason, 'created_at', r.created_at
      ) order by r.model, r.score desc)
      from public.recommendations r
      join public.coffees c on c.id = r.coffee_id
      join public.brands b on b.id = c.brand_id
      where r.user_id = v_user_id
    ), '[]'::jsonb),
    'official_for', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', case when o.brand_id is not null then 'brand' else 'cafe' end,
        'name', coalesce(b.name, c.name), 'since', o.created_at
      ) order by o.created_at)
      from public.official_accounts o
      left join public.brands b on b.id = o.brand_id
      left join public.cafes c on c.id = o.cafe_id
      where o.profile_id = v_user_id
    ), '[]'::jsonb),
    'verification_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'business', coalesce(b.name, c.name), 'message', r.message, 'website', r.website,
        'status', r.status, 'created_at', r.created_at, 'resolved_at', r.resolved_at
      ) order by r.created_at)
      from public.verification_requests r
      left join public.brands b on b.id = r.brand_id
      left join public.cafes c on c.id = r.cafe_id
      where r.profile_id = v_user_id
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
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists, notifications, photos, cafés, recommendations and business accounts.';
