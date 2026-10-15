-- Cafés (Phase 3F): places, and what members drank there. Kept apart from the coffee
-- catalog on purpose: a flat white at a café is not a bag of beans, and mixing the two would
-- skew every coffee average and chart. Members add cafés the way they add coffees: at once,
-- marked as not reviewed, a few a day, with a look-alike check; admins review and merge.
-- Rollback: supabase/rollbacks/20261016090000_cafes.down.sql

-- A café and a visit can be reported like everything else. The values are only named
-- inside function bodies below, which are not run here.
alter type public.report_target add value if not exists 'cafe';
alter type public.report_target add value if not exists 'cafe_visit';

-- ── cafés ───────────────────────────────────────────────────────────────────────────────
create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Made from the name, unique within the city, never rewritten: /kafe/<city>/<slug>.
  slug text not null default '',
  -- Turkey's provinces by plate number (TR_CITIES in @espressoir/core).
  city_code smallint not null,
  district text,
  -- A link to the place on a map service, pasted by whoever adds it. Nothing is fetched.
  map_url text,
  -- Folded name and district, for search and the look-alike check (kept by a trigger).
  search_text text not null default '',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cafes_name_length check (char_length(name) between 1 and 80),
  constraint cafes_city_code_range check (city_code between 1 and 81),
  constraint cafes_district_length check (char_length(district) between 1 and 60),
  constraint cafes_map_url_format check (
    char_length(map_url) <= 500 and map_url ~ '^https://((www\.)?google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})/maps|maps\.google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})|maps\.app\.goo\.gl|goo\.gl/maps|maps\.apple\.com|(www\.)?openstreetmap\.org|yandex\.com(\.tr)?/maps)[/?#][^\s]*$'
  ),
  constraint cafes_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint cafes_city_slug_key unique (city_code, slug)
);

create index cafes_search_text_trgm_idx
  on public.cafes using gin (search_text extensions.gin_trgm_ops);
create index cafes_city_idx on public.cafes (city_code);

create function public.prepare_cafe()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  new.name := btrim(regexp_replace(coalesce(new.name, ''), '\s+', ' ', 'g'));
  new.district := nullif(btrim(regexp_replace(coalesce(new.district, ''), '\s+', ' ', 'g')), '');
  new.map_url := nullif(btrim(new.map_url), '');
  new.search_text := btrim(public.fold_tr(new.name || ' ' || coalesce(new.district, '')));

  if tg_op = 'UPDATE' then
    new.slug := old.slug;
    return new;
  end if;

  v_base := public.slugify(new.name);
  if v_base = '' then
    v_base := 'kafe';
  end if;
  v_slug := v_base;
  while exists (
    select 1 from public.cafes c where c.city_code = new.city_code and c.slug = v_slug
  ) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  new.slug := v_slug;
  return new;
end
$$;

-- Like coffees: admins and scripts add reviewed cafés, members unreviewed ones.
create function public.set_cafe_review_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));
  else
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end
$$;

create trigger cafes_prepare
  before insert or update on public.cafes
  for each row execute function public.prepare_cafe();
create trigger cafes_review_state
  before insert on public.cafes
  for each row execute function public.set_cafe_review_state();
create trigger cafes_set_updated_at
  before update on public.cafes
  for each row execute function public.set_updated_at();
create trigger cafes_rate_limit
  before insert on public.cafes
  for each row execute function public.enforce_rate_limit('created_by', '5', '1 day');

-- ── visits: a drink at a café ───────────────────────────────────────────────────────────
create table public.cafe_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete restrict,
  -- What kind of drink (CAFE_DRINKS in @espressoir/core); a text with a check, not an enum.
  drink text not null,
  -- Its own name on the menu, if it has one ("Etiyopya V60").
  drink_name text,
  score smallint not null,
  -- Plain text. Always rendered escaped.
  notes text,
  visited_on date not null default current_date,
  price_paid numeric(10, 2),
  visibility public.tasting_visibility not null default 'public',
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cafe_visits_drink_known check (drink in ('espresso', 'ristretto', 'americano', 'macchiato', 'cortado', 'flat_white', 'cappuccino', 'latte', 'filter', 'pour_over', 'cold_brew', 'turkish', 'other')),
  constraint cafe_visits_drink_name_length check (char_length(drink_name) between 1 and 60),
  constraint cafe_visits_score_range check (score between 1 and 10),
  constraint cafe_visits_notes_length check (char_length(notes) between 1 and 2000),
  constraint cafe_visits_price_paid_range check (price_paid >= 0),
  constraint cafe_visits_hidden_reason_length check (char_length(hidden_reason) between 1 and 500)
);

create index cafe_visits_cafe_idx on public.cafe_visits (cafe_id);
create index cafe_visits_user_recent_idx on public.cafe_visits (user_id, visited_on desc);
create index cafe_visits_public_recent_idx
  on public.cafe_visits (created_at desc, id desc)
  where visibility = 'public' and hidden_at is null;

create function public.prepare_cafe_visit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.drink_name := nullif(btrim(regexp_replace(coalesce(new.drink_name, ''), '\s+', ' ', 'g')), '');
  new.notes := nullif(btrim(new.notes), '');
  return new;
end
$$;

create trigger cafe_visits_prepare
  before insert or update on public.cafe_visits
  for each row execute function public.prepare_cafe_visit();
create trigger cafe_visits_set_updated_at
  before update on public.cafe_visits
  for each row execute function public.set_updated_at();
create trigger cafe_visits_rate_limit
  before insert on public.cafe_visits
  for each row execute function public.enforce_rate_limit('user_id', '30', '1 day');

revoke all on function public.prepare_cafe, public.set_cafe_review_state, public.prepare_cafe_visit
  from public, anon, authenticated;

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.cafes enable row level security;
alter table public.cafe_visits enable row level security;

revoke all on table public.cafes, public.cafe_visits from anon, authenticated;
grant select on table public.cafes, public.cafe_visits to anon, authenticated;
grant insert (name, city_code, district, map_url, created_by) on table public.cafes to authenticated;
-- Corrections are an admin's (the policies below say so); members cannot edit a café.
grant update (name, city_code, district, map_url) on table public.cafes to authenticated;
grant delete on table public.cafes to authenticated;
grant insert (user_id, cafe_id, drink, drink_name, score, notes, visited_on, price_paid, visibility)
  on table public.cafe_visits to authenticated;
grant update (drink, drink_name, score, notes, visited_on, price_paid, visibility)
  on table public.cafe_visits to authenticated;
grant delete on table public.cafe_visits to authenticated;
grant all on table public.cafes, public.cafe_visits to service_role;

create policy cafes_select_all on public.cafes
  for select to anon, authenticated
  using (true);
create policy cafes_insert_own on public.cafes
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (select public.can_post()));
create policy cafes_update_admin on public.cafes
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cafes_delete_admin on public.cafes
  for delete to authenticated
  using ((select public.is_admin()));

-- Reading a visit: as with tastings. Public ones for everyone, your own always, "followers"
-- ones when you follow the author, everything for admins; hidden ones for nobody else.
create policy cafe_visits_select_public on public.cafe_visits
  for select to anon, authenticated
  using (visibility = 'public' and hidden_at is null);
create policy cafe_visits_select_own on public.cafe_visits
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy cafe_visits_select_followers on public.cafe_visits
  for select to authenticated
  using (
    visibility = 'followers'
    and hidden_at is null
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = cafe_visits.user_id
    )
  );
create policy cafe_visits_select_admin on public.cafe_visits
  for select to authenticated
  using ((select public.is_admin()));
create policy cafe_visits_insert_own on public.cafe_visits
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.can_post()));
create policy cafe_visits_update_own on public.cafe_visits
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.can_post()));
create policy cafe_visits_delete_own on public.cafe_visits
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── finding a café ──────────────────────────────────────────────────────────────────────
-- Cafés whose name (and district) resemble what someone typed, best first, optionally in
-- one city: the search box of the visit form and the "is it already here?" check.
create function public.search_cafes_v1(
  p_query text,
  p_city_code smallint default null,
  p_limit integer default 8
)
returns table (
  cafe_id uuid,
  cafe_slug text,
  cafe_name text,
  city_code smallint,
  district text,
  is_reviewed boolean,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select btrim(regexp_replace(public.fold_tr(coalesce(p_query, '')), '\s+', ' ', 'g')) as text
  ),
  scored as (
    select
      c.*,
      greatest(
        extensions.similarity(c.search_text, q.text),
        extensions.word_similarity(q.text, c.search_text)
      ) as score,
      position(q.text in c.search_text) > 0 as contains
    from public.cafes c, q
    where char_length(q.text) >= 2
      and (p_city_code is null or c.city_code = p_city_code)
  )
  select s.id, s.slug, s.name, s.city_code, s.district, s.reviewed_at is not null, s.score::real
  from scored s
  where s.contains or s.score >= 0.35
  order by s.contains desc, s.score desc, s.name
  limit least(greatest(coalesce(p_limit, 8), 1), 25)
$$;

comment on function public.search_cafes_v1 is
  'Cafés whose name and district resemble the query (trigram similarity), best match first.';

revoke all on function public.search_cafes_v1 from public;
grant execute on function public.search_cafes_v1 to anon, authenticated, service_role;

-- ── logging a visit ─────────────────────────────────────────────────────────────────────
-- A visit to an existing café (p_cafe_id), or to one named here: a café of the same name in
-- the same city is reused (ignoring case, accents and Turkish letter variants), otherwise
-- it is created. One transaction. Runs with the caller's rights: RLS still decides.
create function public.log_cafe_visit_v1(
  p_cafe_id uuid default null,
  p_cafe_name text default null,
  p_city_code smallint default null,
  p_district text default null,
  p_map_url text default null,
  p_drink text default null,
  p_drink_name text default null,
  p_score smallint default null,
  p_notes text default null,
  p_visited_on date default null,
  p_price_paid numeric default null,
  p_visibility public.tasting_visibility default 'public'
)
returns table (visit_id uuid, cafe_id uuid, city_code smallint, cafe_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cafe_id uuid := p_cafe_id;
  v_visit_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_cafe_id is null then
    if nullif(btrim(p_cafe_name), '') is null or p_city_code is null then
      raise exception 'cafe_required' using errcode = '22023';
    end if;
    select c.id into v_cafe_id
    from public.cafes c
    where c.city_code = p_city_code
      and public.fold_tr(c.name) = public.fold_tr(btrim(regexp_replace(p_cafe_name, '\s+', ' ', 'g')))
    order by c.created_at
    limit 1;
    if v_cafe_id is null then
      insert into public.cafes (name, city_code, district, map_url, created_by)
      values (p_cafe_name, p_city_code, p_district, p_map_url, v_user_id)
      returning id into v_cafe_id;
    end if;
  end if;

  insert into public.cafe_visits (
    user_id, cafe_id, drink, drink_name, score, notes, visited_on, price_paid, visibility
  )
  values (
    v_user_id, v_cafe_id, p_drink, p_drink_name, p_score, p_notes,
    coalesce(p_visited_on, current_date), p_price_paid, p_visibility
  )
  returning id into v_visit_id;

  return query
    select v_visit_id, c.id, c.city_code, c.slug from public.cafes c where c.id = v_cafe_id;
end
$$;

comment on function public.log_cafe_visit_v1 is
  'Records a drink at a café for the calling user, creating the café when it is new.';

revoke all on function public.log_cafe_visit_v1 from public, anon;
grant execute on function public.log_cafe_visit_v1 to authenticated, service_role;

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- Every café with its public numbers. Only public, visible visits count, whoever asks.
create view public.cafe_overview
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
  max(v.visited_on) as last_visited_on
from public.cafes c
left join public.cafe_visits v
  on v.cafe_id = c.id and v.visibility = 'public' and v.hidden_at is null
group by c.id;

comment on view public.cafe_overview is
  'Cafés with visit counts and average score from public, visible visits.';

-- One row per visit, with the café and the author: what lists of visits show.
create view public.cafe_visit_feed
with (security_invoker = true)
as
select
  v.id as visit_id,
  v.drink,
  v.drink_name,
  v.score,
  v.notes,
  v.visited_on,
  v.visibility,
  v.created_at,
  (v.hidden_at is not null) as is_hidden,
  p.id as user_id,
  p.username,
  p.display_name,
  c.id as cafe_id,
  c.slug as cafe_slug,
  c.name as cafe_name,
  c.city_code,
  c.district
from public.cafe_visits v
join public.profiles p on p.id = v.user_id
join public.cafes c on c.id = v.cafe_id;

comment on view public.cafe_visit_feed is
  'Café visits with their café and author, as visible to the calling user.';

revoke all on table public.cafe_overview, public.cafe_visit_feed from anon, authenticated;
grant select on table public.cafe_overview, public.cafe_visit_feed
  to anon, authenticated, service_role;

-- ── moderation ──────────────────────────────────────────────────────────────────────────
create or replace function public.check_report_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  new.details := nullif(btrim(new.details), '');
  case new.target_type
    when 'tasting' then
      v_exists := exists (select 1 from public.tastings where id = new.target_id);
    when 'comment' then
      v_exists := exists (select 1 from public.comments where id = new.target_id);
    when 'profile' then
      v_exists := exists (select 1 from public.profiles where id = new.target_id);
    when 'coffee' then
      v_exists := exists (select 1 from public.coffees where id = new.target_id);
    when 'list' then
      v_exists := exists (select 1 from public.lists where id = new.target_id);
    when 'cafe' then
      v_exists := exists (select 1 from public.cafes where id = new.target_id);
    when 'cafe_visit' then
      v_exists := exists (select 1 from public.cafe_visits where id = new.target_id);
  end case;
  if not v_exists then
    raise exception 'report_target_not_found' using errcode = '23503';
  end if;
  return new;
end
$$;

create or replace function public.admin_set_hidden_v1(
  p_target_type public.report_target,
  p_target_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(p_reason), '');
  v_rows integer;
begin
  perform public.log_admin_action(
    case when p_hidden then 'hide' else 'unhide' end, p_target_type::text, p_target_id, v_reason
  );

  if p_target_type = 'tasting' then
    update public.tastings
    set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
        hidden_by = case when p_hidden then (select auth.uid()) end,
        hidden_reason = case when p_hidden then v_reason end
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    update public.comments
    set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
        hidden_by = case when p_hidden then (select auth.uid()) end,
        hidden_reason = case when p_hidden then v_reason end
    where id = p_target_id;
  elsif p_target_type = 'list' then
    update public.lists
    set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
        hidden_by = case when p_hidden then (select auth.uid()) end,
        hidden_reason = case when p_hidden then v_reason end
    where id = p_target_id;
  elsif p_target_type = 'cafe_visit' then
    update public.cafe_visits
    set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
        hidden_by = case when p_hidden then (select auth.uid()) end,
        hidden_reason = case when p_hidden then v_reason end
    where id = p_target_id;
  else
    raise exception 'target_cannot_be_hidden' using errcode = '22023';
  end if;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

create or replace function public.admin_delete_v1(
  p_target_type public.report_target,
  p_target_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform public.log_admin_action('delete', p_target_type::text, p_target_id, p_note);

  if p_target_type = 'tasting' then
    delete from public.tastings where id = p_target_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
  elsif p_target_type = 'comment' then
    perform public.delete_comment_v1(p_target_id);
  elsif p_target_type = 'cafe_visit' then
    delete from public.cafe_visits where id = p_target_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
  elsif p_target_type = 'cafe' then
    -- Only an empty café (spam, a mistake): one with visits is merged into the right one.
    if exists (select 1 from public.cafe_visits v where v.cafe_id = p_target_id) then
      raise exception 'cafe_has_visits' using errcode = '23503';
    end if;
    delete from public.cafes where id = p_target_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
  elsif p_target_type = 'list' then
    delete from public.lists where id = p_target_id;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;
  else
    raise exception 'target_cannot_be_deleted' using errcode = '22023';
  end if;
end
$$;

create function public.admin_review_cafe_v1(p_cafe_id uuid, p_reviewed boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform public.log_admin_action(
    case when p_reviewed then 'review_cafe' else 'unreview_cafe' end, 'cafe', p_cafe_id
  );
  update public.cafes
  set reviewed_at = case when p_reviewed then coalesce(reviewed_at, now()) end,
      reviewed_by = case when p_reviewed then (select auth.uid()) end
  where id = p_cafe_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

-- Two entries for the same café become one: visits and reports move to the one that stays.
create function public.admin_merge_cafes_v1(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_name text;
begin
  select c.name into v_from_name from public.cafes c where c.id = p_from;
  perform public.log_admin_action('merge_cafe', 'cafe', p_into, v_from_name);

  if p_from = p_into then
    raise exception 'merge_same_target' using errcode = '22023';
  end if;
  if v_from_name is null or not exists (select 1 from public.cafes c where c.id = p_into) then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;

  update public.cafe_visits set cafe_id = p_into where cafe_id = p_from;
  update public.reports set target_id = p_into
  where target_type = 'cafe' and target_id = p_from
    and not exists (
      select 1 from public.reports r
      where r.target_type = 'cafe' and r.target_id = p_into
        and r.reporter_id is not distinct from reports.reporter_id
    );
  delete from public.reports where target_type = 'cafe' and target_id = p_from;
  delete from public.cafes where id = p_from;
end
$$;

revoke all on function public.admin_review_cafe_v1, public.admin_merge_cafes_v1 from public, anon;
grant execute on function public.admin_review_cafe_v1, public.admin_merge_cafes_v1 to authenticated;

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
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists, notifications, photos and cafés.';
