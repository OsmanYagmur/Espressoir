-- In-app notifications (Phase 3C): someone liked your tasting, commented under it, replied
-- to your comment, or started following you. Rows are made by triggers, because likes,
-- comments and follows are written by the browser straight to this database: this is the
-- one place that sees them all. Nobody writes this table through the API.
-- Rollback: supabase/rollbacks/20261014120000_notifications.down.sql

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who is told.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Who did it.
  actor_id uuid not null references public.profiles (id) on delete cascade,
  -- A text with a check, not an enum: a new kind is then a constraint to swap, and a
  -- rollback does not have to rebuild a type (NOTIFICATION_TYPES in @espressoir/core).
  type text not null,
  tasting_id uuid references public.tastings (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_type_known check (type in ('like', 'comment', 'reply', 'follow')),
  constraint notifications_not_self check (user_id <> actor_id),
  -- What each kind points at.
  constraint notifications_shape check (
    (type = 'follow' and tasting_id is null and comment_id is null)
    or (type = 'like' and tasting_id is not null and comment_id is null)
    or (type in ('comment', 'reply') and tasting_id is not null and comment_id is not null)
  )
);

create index notifications_user_recent_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_tasting_idx on public.notifications (tasting_id);
create index notifications_comment_idx on public.notifications (comment_id);
-- One notification per like and per follow: liking, unliking and liking again does not
-- tell the same person three times.
create unique index notifications_like_once
  on public.notifications (user_id, actor_id, tasting_id) where type = 'like';
create unique index notifications_follow_once
  on public.notifications (user_id, actor_id) where type = 'follow';

-- ── access: the recipient reads; nobody writes ──────────────────────────────────────────
alter table public.notifications enable row level security;

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── making them ─────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER throughout: the row belongs to someone other than whoever caused it.

create function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  if tg_op = 'DELETE' then
    -- Taken back before it was seen: as if it never happened. Once read it stays (and
    -- stays the only one: liking again does not notify again).
    delete from public.notifications n
    where n.type = 'like' and n.actor_id = old.user_id and n.tasting_id = old.tasting_id
      and n.read_at is null;
    return null;
  end if;

  select t.user_id into v_author
  from public.tastings t
  where t.id = new.tasting_id and t.hidden_at is null;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, tasting_id)
    values (v_author, new.user_id, 'like', new.tasting_id)
    on conflict do nothing;
  end if;
  return null;
end
$$;

create trigger likes_notify
  after insert or delete on public.likes
  for each row execute function public.notify_like();

create function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications n
    where n.type = 'follow' and n.actor_id = old.follower_id and n.user_id = old.following_id
      and n.read_at is null;
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow')
  on conflict do nothing;
  return null;
end
$$;

create trigger follows_notify
  after insert or delete on public.follows
  for each row execute function public.notify_follow();

-- A comment tells the tasting's author; a reply tells the author of the comment it answers
-- and, when that is someone else, the tasting's author too (it is their page).
create function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tasting_author uuid;
  v_parent_author uuid;
begin
  if new.user_id is null then
    return null;
  end if;

  select t.user_id into v_tasting_author
  from public.tastings t
  where t.id = new.tasting_id and t.hidden_at is null;
  -- Nothing is said about a hidden tasting.
  if v_tasting_author is null then
    return null;
  end if;

  if new.parent_id is not null then
    select k.user_id into v_parent_author
    from public.comments k
    where k.id = new.parent_id and k.deleted_at is null and k.hidden_at is null;
    if v_parent_author is not null and v_parent_author <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, tasting_id, comment_id)
      values (v_parent_author, new.user_id, 'reply', new.tasting_id, new.id);
    end if;
  end if;

  if v_tasting_author <> new.user_id
    and v_tasting_author is distinct from v_parent_author
  then
    insert into public.notifications (user_id, actor_id, type, tasting_id, comment_id)
    values (v_tasting_author, new.user_id, 'comment', new.tasting_id, new.id);
  end if;
  return null;
end
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- What a notification points at can be withdrawn afterwards: a comment removed or hidden,
-- a tasting hidden. (Deleted rows take theirs along through the foreign keys.)
create function public.withdraw_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'comments' then
    delete from public.notifications n where n.comment_id = new.id;
  else
    delete from public.notifications n where n.tasting_id = new.id;
  end if;
  return null;
end
$$;

create trigger comments_withdraw_notifications
  after update of deleted_at, hidden_at on public.comments
  for each row
  when (
    (new.deleted_at is not null and old.deleted_at is null)
    or (new.hidden_at is not null and old.hidden_at is null)
  )
  execute function public.withdraw_notifications();
create trigger tastings_withdraw_notifications
  after update of hidden_at on public.tastings
  for each row
  when (new.hidden_at is not null and old.hidden_at is null)
  execute function public.withdraw_notifications();

-- The newest 200 per member are kept (NOTIFICATIONS_KEPT in @espressoir/core).
create function public.trim_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.id in (
    select x.id from public.notifications x
    where x.user_id = new.user_id
    order by x.created_at desc, x.id
    offset 200
  );
  return null;
end
$$;

create trigger notifications_trim
  after insert on public.notifications
  for each row execute function public.trim_notifications();

revoke all on function
  public.notify_like, public.notify_follow, public.notify_comment,
  public.withdraw_notifications, public.trim_notifications
  from public, anon, authenticated;

-- ── reading and marking as read ─────────────────────────────────────────────────────────
-- One row per notification with what is needed to print it. Runs with the caller's
-- rights: a member only ever gets their own, and only while what it points at is still
-- visible to them.
create view public.notification_feed
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
  left(k.body, 140) as comment_excerpt
from public.notifications n
join public.profiles a on a.id = n.actor_id
left join public.tastings t on t.id = n.tasting_id
left join public.coffees c on c.id = t.coffee_id
left join public.brands b on b.id = c.brand_id
left join public.comments k on k.id = n.comment_id
where (n.tasting_id is null or t.id is not null)
  and (
    n.comment_id is null
    or (k.id is not null and k.deleted_at is null and k.hidden_at is null)
  );

comment on view public.notification_feed is
  'The calling member''s notifications, with the names needed to print them.';

revoke all on table public.notification_feed from anon, authenticated;
grant select on table public.notification_feed to authenticated, service_role;

-- Marks the caller's notifications up to a moment as read; returns how many. "Up to" so
-- that one arriving while the list is on screen is not swallowed unseen.
create function public.mark_notifications_read_v1(p_before timestamptz default null)
returns integer
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
  update public.notifications n
  set read_at = now()
  where n.user_id = v_user_id
    and n.read_at is null
    and n.created_at <= coalesce(p_before, now());
  get diagnostics v_rows = row_count;
  return v_rows;
end
$$;

comment on function public.mark_notifications_read_v1 is
  'Marks the calling member''s unread notifications (up to a moment) as read.';

revoke all on function public.mark_notifications_read_v1 from public, anon;
grant execute on function public.mark_notifications_read_v1 to authenticated;

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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists and notifications.';
