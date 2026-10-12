-- People talking to each other, and the means to keep that civil: comments (one level of
-- replies) and likes on tastings, reports, hiding content, restricting an account, and the
-- catalog tools an admin needs once members add coffees.
-- Rollback: supabase/rollbacks/20261012100000_interaction_moderation.down.sql

-- ── rate limits cannot be dodged with a back-dated row ──────────────────────────────────
-- The limits count rows by created_at, and members may insert into these tables directly:
-- a row sent with created_at in the past would not count. Members' rows are therefore
-- stamped with the current time here. (Scripts and admins keep what they send: the import
-- brings its own dates.)
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recent integer;
begin
  if v_user_id is null or public.is_admin() then
    return new;
  end if;

  new.created_at := now();

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, tg_argv[0]
  )
  into v_recent
  using v_user_id, tg_argv[2];

  if v_recent >= tg_argv[1]::integer then
    raise exception 'rate_limited'
      using errcode = 'P0001', detail = tg_table_name, hint = tg_argv[1] || ' / ' || tg_argv[2];
  end if;
  return new;
end
$$;

-- ── hiding tastings ─────────────────────────────────────────────────────────────────────
-- A hidden tasting stays with its author (who sees it, marked) and with admins; for
-- everyone else, and for every number computed from tastings, it does not exist.
alter table public.tastings
  add column hidden_at timestamptz,
  add column hidden_by uuid references public.profiles (id) on delete set null,
  add column hidden_reason text,
  add constraint tastings_hidden_reason_length check (char_length(hidden_reason) between 1 and 500);

alter policy tastings_select_public on public.tastings
  using (visibility = 'public' and hidden_at is null);
alter policy tastings_select_followers on public.tastings
  using (
    visibility = 'followers'
    and hidden_at is null
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = tastings.user_id
    )
  );

-- ── comments ────────────────────────────────────────────────────────────────────────────
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  tasting_id uuid not null references public.tastings (id) on delete cascade,
  -- Null once a comment has been removed but is kept as a placeholder for its replies.
  user_id uuid references public.profiles (id) on delete set null,
  -- Replies go one level deep: a reply's parent is always a top-level comment.
  parent_id uuid references public.comments (id) on delete cascade,
  -- Plain text. Always rendered escaped, never as HTML or markdown.
  body text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text,
  constraint comments_body_length check (char_length(body) between 1 and 2000),
  -- A removed comment keeps its place (its replies hang from it) but not its words.
  constraint comments_deleted_is_blank check ((deleted_at is null) = (body is not null)),
  constraint comments_hidden_reason_length check (char_length(hidden_reason) between 1 and 500)
);

create index comments_tasting_idx on public.comments (tasting_id, created_at);
create index comments_parent_idx on public.comments (parent_id);
create index comments_user_recent_idx on public.comments (user_id, created_at desc);

create function public.prepare_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.comments;
begin
  if tg_op = 'INSERT' then
    new.body := btrim(new.body);
    if new.parent_id is not null then
      select * into v_parent from public.comments c where c.id = new.parent_id;
      if not found or v_parent.tasting_id <> new.tasting_id then
        raise exception 'comment_parent_invalid' using errcode = '23503';
      end if;
      if v_parent.parent_id is not null then
        raise exception 'comment_reply_too_deep' using errcode = '23514';
      end if;
      if v_parent.deleted_at is not null or v_parent.hidden_at is not null then
        raise exception 'comment_parent_gone' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: only the words can change, and only while the comment is still there.
  if new.body is distinct from old.body and new.body is not null then
    if old.deleted_at is not null then
      raise exception 'comment_deleted' using errcode = '23514';
    end if;
    new.body := btrim(new.body);
    new.edited_at := now();
  end if;
  return new;
end
$$;

revoke all on function public.prepare_comment() from public, anon, authenticated;

create trigger comments_prepare
  before insert or update on public.comments
  for each row execute function public.prepare_comment();
create trigger comments_rate_limit_burst
  before insert on public.comments
  for each row execute function public.enforce_rate_limit('user_id', '10', '5 minutes');
create trigger comments_rate_limit_day
  before insert on public.comments
  for each row execute function public.enforce_rate_limit('user_id', '100', '1 day');

alter table public.comments enable row level security;

-- Column grants: a member chooses where a comment goes and what it says, nothing else
-- (not its dates, not whether it is hidden). There is no DELETE: removal goes through
-- delete_comment_v1, which keeps other people's replies.
revoke all on table public.comments from anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (tasting_id, user_id, parent_id, body) on table public.comments to authenticated;
grant update (body) on table public.comments to authenticated;
grant all on table public.comments to service_role;

-- A comment is visible where its tasting is (the subquery is itself filtered by the
-- tastings policies), unless it was hidden: then only its author and admins see it.
create policy comments_select_visible on public.comments
  for select to anon, authenticated
  using (
    exists (select 1 from public.tastings t where t.id = tasting_id)
    and (
      hidden_at is null
      or user_id = (select auth.uid())
      or (select public.is_admin())
    )
  );
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.can_post())
    and exists (
      select 1 from public.tastings t where t.id = tasting_id and t.status = 'logged'
    )
  );
create policy comments_update_own on public.comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.can_post()));

-- Removes a comment: outright when nothing hangs from it, otherwise its words and its
-- author are wiped and the placeholder stays, so replies by others keep their context.
-- For the author, or an admin. SECURITY DEFINER because members hold no DELETE right.
create function public.delete_comment_v1(p_comment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner uuid;
  v_has_replies boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select c.user_id, exists (select 1 from public.comments r where r.parent_id = c.id)
  into v_owner, v_has_replies
  from public.comments c
  where c.id = p_comment_id
  for update;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
  if v_owner is distinct from v_user_id and not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if v_has_replies then
    update public.comments
    set body = null, user_id = null, deleted_at = coalesce(deleted_at, now())
    where id = p_comment_id;
    return 'blanked';
  end if;
  delete from public.comments where id = p_comment_id;
  return 'deleted';
end
$$;

revoke all on function public.delete_comment_v1 from public, anon;
grant execute on function public.delete_comment_v1 to authenticated;

-- When an account goes (by its owner's choice or from the dashboard), its comments go the
-- same way: replies and unanswered comments are deleted, answered ones are blanked.
create function public.scrub_member_comments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.comments c where c.user_id = old.id and c.parent_id is not null;
  delete from public.comments c
  where c.user_id = old.id
    and not exists (select 1 from public.comments r where r.parent_id = c.id);
  update public.comments
  set body = null, user_id = null, deleted_at = coalesce(deleted_at, now())
  where user_id = old.id;
  return old;
end
$$;

revoke all on function public.scrub_member_comments() from public, anon, authenticated;

create trigger profiles_scrub_comments
  before delete on public.profiles
  for each row execute function public.scrub_member_comments();

-- ── likes ───────────────────────────────────────────────────────────────────────────────
create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tasting_id uuid not null references public.tastings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tasting_id)
);

create index likes_tasting_idx on public.likes (tasting_id);

create trigger likes_rate_limit
  before insert on public.likes
  for each row execute function public.enforce_rate_limit('user_id', '500', '1 day');

alter table public.likes enable row level security;

revoke all on table public.likes from anon, authenticated;
grant select on table public.likes to anon, authenticated;
grant insert (user_id, tasting_id) on table public.likes to authenticated;
grant delete on table public.likes to authenticated;
grant all on table public.likes to service_role;

create policy likes_select_visible on public.likes
  for select to anon, authenticated
  using (exists (select 1 from public.tastings t where t.id = tasting_id));
-- You like other people's logged tastings, as yourself.
create policy likes_insert_own on public.likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.can_post())
    and exists (
      select 1 from public.tastings t
      where t.id = tasting_id and t.status = 'logged' and t.user_id <> (select auth.uid())
    )
  );
create policy likes_delete_own on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── read models ─────────────────────────────────────────────────────────────────────────
-- Numbers ignore hidden tastings (the definitions are otherwise unchanged).
create or replace view public.coffee_stats
with (security_invoker = true)
as
select
  c.id as coffee_id,
  count(t.id)::integer as tasting_count,
  count(t.score)::integer as rated_count,
  round(avg(t.score), 2) as avg_score,
  array[
    count(*) filter (where t.score = 1),
    count(*) filter (where t.score = 2),
    count(*) filter (where t.score = 3),
    count(*) filter (where t.score = 4),
    count(*) filter (where t.score = 5),
    count(*) filter (where t.score = 6),
    count(*) filter (where t.score = 7),
    count(*) filter (where t.score = 8),
    count(*) filter (where t.score = 9),
    count(*) filter (where t.score = 10)
  ]::integer[] as score_distribution,
  min(t.tasted_at) as first_tasted_at,
  max(t.tasted_at) as last_tasted_at,
  coalesce(array_agg(distinct m.slug) filter (where m.slug is not null), '{}') as brew_method_slugs
from public.coffees c
left join public.tastings t
  on t.coffee_id = c.id and t.visibility = 'public' and t.status = 'logged'
  and t.hidden_at is null
left join public.brew_methods m on m.id = t.brew_method_id
group by c.id;

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
  (select count(*) from public.follows f where f.follower_id = p.id)::integer as following_count
from public.profiles p
left join public.tastings t
  on t.user_id = p.id and t.visibility = 'public' and t.hidden_at is null
where p.onboarded_at is not null
group by p.id;

-- The feed row gains what lists show under a tasting (new columns can only be appended).
-- Counts leave out removed and hidden comments, whoever is asking.
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
  (t.hidden_at is not null) as is_hidden
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

-- ── reports ─────────────────────────────────────────────────────────────────────────────
create type public.report_target as enum ('tasting', 'comment', 'profile', 'coffee');
create type public.report_reason as enum ('spam', 'abuse', 'wrong_info', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  constraint reports_details_length check (char_length(details) between 1 and 1000),
  constraint reports_resolution_note_length check (char_length(resolution_note) between 1 and 500),
  -- One report per person per thing: reporting again adds nothing.
  constraint reports_once_per_target unique (reporter_id, target_type, target_id)
);

create index reports_open_idx on public.reports (created_at) where status = 'open';
create index reports_target_idx on public.reports (target_type, target_id);

-- The target is one of four tables, so no foreign key can check it: this does.
create function public.check_report_target()
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
  end case;
  if not v_exists then
    raise exception 'report_target_not_found' using errcode = '23503';
  end if;
  return new;
end
$$;

revoke all on function public.check_report_target() from public, anon, authenticated;

create trigger reports_check_target
  before insert on public.reports
  for each row execute function public.check_report_target();
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '20', '1 day');

alter table public.reports enable row level security;

revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details)
  on table public.reports to authenticated;
grant all on table public.reports to service_role;

create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy reports_select_admin on public.reports
  for select to authenticated
  using ((select public.is_admin()));
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.can_post()));

-- ── moderation ──────────────────────────────────────────────────────────────────────────
-- What admins did, when, to what. Written only by the functions below.
create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  note text,
  created_at timestamptz not null default now(),
  constraint moderation_log_note_length check (char_length(note) <= 500)
);

create index moderation_log_recent_idx on public.moderation_log (created_at desc);

alter table public.moderation_log enable row level security;

revoke all on table public.moderation_log from anon, authenticated;
grant select on table public.moderation_log to authenticated;
grant all on table public.moderation_log to service_role;

create policy moderation_log_select_admin on public.moderation_log
  for select to authenticated
  using ((select public.is_admin()));

-- Every admin function starts here: refuses anyone else, then records the act.
create function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.moderation_log (admin_id, action, target_type, target_id, note)
  values (
    (select auth.uid()), p_action, p_target_type, p_target_id,
    nullif(left(btrim(p_note), 500), '')
  );
end
$$;

revoke all on function public.log_admin_action from public, anon, authenticated;

-- Hides a tasting or a comment from everyone but its author and admins, or shows it again.
create function public.admin_set_hidden_v1(
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
  else
    raise exception 'target_cannot_be_hidden' using errcode = '22023';
  end if;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

-- Deletes a tasting, or removes a comment the way its author could.
create function public.admin_delete_v1(
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
  else
    raise exception 'target_cannot_be_deleted' using errcode = '22023';
  end if;
end
$$;

-- Stops a member from posting for a number of days (they can still read, and delete their
-- own things), or lifts the restriction when p_days is null. Admins cannot be restricted.
create function public.admin_restrict_user_v1(
  p_user_id uuid,
  p_days integer default null,
  p_reason text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
  v_role public.user_role;
begin
  perform public.log_admin_action(
    case when p_days is null then 'unrestrict' else 'restrict' end, 'profile', p_user_id,
    coalesce(p_days::text || ' days. ', '') || coalesce(p_reason, '')
  );

  select p.role into v_role from public.profiles p where p.id = p_user_id;
  if not found then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  if v_role = 'admin' then
    raise exception 'admin_cannot_be_restricted' using errcode = '22023';
  end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then
    raise exception 'restriction_length_invalid' using errcode = '22023';
  end if;

  v_until := case when p_days is null then null else now() + make_interval(days => p_days) end;
  insert into public.profile_private (profile_id, restricted_until, restricted_reason)
  values (p_user_id, v_until, case when p_days is null then null else nullif(btrim(p_reason), '') end)
  on conflict (profile_id) do update
    set restricted_until = excluded.restricted_until,
        restricted_reason = excluded.restricted_reason;
  return v_until;
end
$$;

-- Closes a report as acted on ('resolved') or as nothing to act on ('dismissed').
create function public.admin_resolve_report_v1(
  p_report_id uuid,
  p_status public.report_status,
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
  perform public.log_admin_action('report_' || p_status::text, 'report', p_report_id, p_note);
  if p_status = 'open' then
    raise exception 'report_status_invalid' using errcode = '22023';
  end if;

  update public.reports
  set status = p_status,
      resolved_by = (select auth.uid()),
      resolved_at = now(),
      resolution_note = nullif(btrim(p_note), '')
  where id = p_report_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

-- ── catalog upkeep ──────────────────────────────────────────────────────────────────────
-- Marks a member's coffee as checked (or takes the mark back).
create function public.admin_review_coffee_v1(p_coffee_id uuid, p_reviewed boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform public.log_admin_action(
    case when p_reviewed then 'review_coffee' else 'unreview_coffee' end, 'coffee', p_coffee_id
  );
  update public.coffees
  set reviewed_at = case when p_reviewed then coalesce(reviewed_at, now()) end,
      reviewed_by = case when p_reviewed then (select auth.uid()) end
  where id = p_coffee_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
end
$$;

-- Moves every tasting of one coffee to another and deletes the first. Not exposed: the two
-- admin functions below call it. Where someone has both coffees on their wishlist, the
-- duplicate entry is dropped (one wishlist entry per person per coffee).
create function public.merge_coffee_into(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tastings t
  where t.coffee_id = p_from
    and t.status = 'wishlist'
    and exists (
      select 1 from public.tastings x
      where x.coffee_id = p_into and x.user_id = t.user_id and x.status = 'wishlist'
    );
  update public.tastings set coffee_id = p_into where coffee_id = p_from;
  update public.reports set target_id = p_into
  where target_type = 'coffee' and target_id = p_from
    and not exists (
      select 1 from public.reports r
      where r.target_type = 'coffee' and r.target_id = p_into
        and r.reporter_id is not distinct from reports.reporter_id
    );
  delete from public.reports where target_type = 'coffee' and target_id = p_from;
  delete from public.coffees where id = p_from;
end
$$;

revoke all on function public.merge_coffee_into from public, anon, authenticated;

-- Two entries for the same coffee become one: p_from's tastings move to p_into, p_from goes.
create function public.admin_merge_coffees_v1(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_name text;
begin
  select c.name into v_from_name from public.coffees c where c.id = p_from;
  perform public.log_admin_action('merge_coffee', 'coffee', p_into, v_from_name);

  if p_from = p_into then
    raise exception 'merge_same_target' using errcode = '22023';
  end if;
  if v_from_name is null
     or not exists (select 1 from public.coffees c where c.id = p_into) then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  perform public.merge_coffee_into(p_from, p_into);
end
$$;

-- Two entries for the same brand become one. Coffees move over; where both brands have a
-- coffee of the same name those are merged too. The old spelling is kept as an alias, so
-- typing it later still finds the brand.
create function public.admin_merge_brands_v1(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.brands;
  v_coffee record;
  v_twin uuid;
begin
  select * into v_from from public.brands b where b.id = p_from;
  perform public.log_admin_action('merge_brand', 'brand', p_into, v_from.name);

  if p_from = p_into then
    raise exception 'merge_same_target' using errcode = '22023';
  end if;
  if v_from.id is null or not exists (select 1 from public.brands b where b.id = p_into) then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;

  for v_coffee in select c.id, c.slug from public.coffees c where c.brand_id = p_from loop
    select c.id into v_twin
    from public.coffees c
    where c.brand_id = p_into and c.slug = v_coffee.slug;
    if found then
      perform public.merge_coffee_into(v_coffee.id, v_twin);
    else
      update public.coffees set brand_id = p_into where id = v_coffee.id;
    end if;
  end loop;

  update public.brands b
  set aliases = (
    select coalesce(array_agg(distinct alias), '{}')
    from unnest(b.aliases || v_from.name || v_from.aliases) as alias
    where alias <> b.name
  )
  where b.id = p_into;
  delete from public.brands where id = p_from;
end
$$;

revoke all on function
  public.admin_set_hidden_v1, public.admin_delete_v1, public.admin_restrict_user_v1,
  public.admin_resolve_report_v1, public.admin_review_coffee_v1,
  public.admin_merge_coffees_v1, public.admin_merge_brands_v1
  from public, anon;
grant execute on function
  public.admin_set_hidden_v1, public.admin_delete_v1, public.admin_restrict_user_v1,
  public.admin_resolve_report_v1, public.admin_review_coffee_v1,
  public.admin_merge_coffees_v1, public.admin_merge_brands_v1
  to authenticated;

-- ── data export, with what this step added ──────────────────────────────────────────────
create function public.export_my_data_v2()
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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes and reports.';

revoke all on function public.export_my_data_v2 from public, anon;
grant execute on function public.export_my_data_v2 to authenticated;
