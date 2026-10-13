-- Lists (Phase 3B): a member's named, ordered collections of coffees ("En sevdiğim
-- espressolar"), public or private. "Want to try" is not a list: it stays the wishlist
-- status of a tasting.
-- Rollback: supabase/rollbacks/20261014090000_lists.down.sql

-- A list can be reported like a tasting or a comment. The new value is only named inside
-- function bodies below, which are not run here: a value added in a transaction cannot be
-- used before that transaction ends.
alter type public.report_target add value if not exists 'list';

-- ── tables ──────────────────────────────────────────────────────────────────────────────
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  -- Made from the title when the list is created, unique per member, and never rewritten:
  -- a list's address survives a rename.
  slug text not null default '',
  -- Plain text. Always rendered escaped.
  description text,
  is_public boolean not null default true,
  -- Hidden by an admin: only its owner (and admins) still see it.
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lists_title_length check (char_length(title) between 1 and 80),
  constraint lists_description_length check (char_length(description) between 1 and 500),
  constraint lists_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint lists_user_slug_key unique (user_id, slug)
);

create index lists_public_recent_idx
  on public.lists (updated_at desc)
  where is_public and hidden_at is null;

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  coffee_id uuid not null references public.coffees (id) on delete cascade,
  -- 1, 2, 3… in the order the owner gave; a new entry goes to the end.
  position integer not null default 0,
  -- Why it is on the list. Plain text.
  note text,
  created_at timestamptz not null default now(),
  primary key (list_id, coffee_id),
  constraint list_items_note_length check (char_length(note) between 1 and 280)
);

create index list_items_coffee_id_idx on public.list_items (coffee_id);

-- ── keeping rows tidy and within limits ─────────────────────────────────────────────────
-- LISTS_PER_MEMBER_MAX (50) and LIST_ITEMS_MAX (100) in @espressoir/core.
create function public.prepare_list()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  new.title := btrim(regexp_replace(coalesce(new.title, ''), '\s+', ' ', 'g'));
  new.description := nullif(btrim(new.description), '');

  if tg_op = 'UPDATE' then
    new.slug := old.slug;
    return new;
  end if;

  if (select count(*) from public.lists l where l.user_id = new.user_id) >= 50 then
    raise exception 'too_many_lists' using errcode = '23514';
  end if;

  v_base := public.slugify(new.title);
  if v_base = '' then
    v_base := 'liste';
  end if;
  v_slug := v_base;
  while exists (
    select 1 from public.lists l where l.user_id = new.user_id and l.slug = v_slug
  ) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  new.slug := v_slug;
  return new;
end
$$;

create trigger lists_prepare
  before insert or update on public.lists
  for each row execute function public.prepare_list();
create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();
create trigger lists_rate_limit
  before insert on public.lists
  for each row execute function public.enforce_rate_limit('user_id', '10', '1 day');

create function public.prepare_list_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.note := nullif(btrim(new.note), '');
  if tg_op = 'UPDATE' then
    return new;
  end if;

  if (select count(*) from public.list_items i where i.list_id = new.list_id) >= 100 then
    raise exception 'list_full' using errcode = '23514';
  end if;
  new.position := coalesce(
    (select max(i.position) from public.list_items i where i.list_id = new.list_id), 0
  ) + 1;
  return new;
end
$$;

create trigger list_items_prepare
  before insert or update on public.list_items
  for each row execute function public.prepare_list_item();

-- A list is as recent as its last change, entries included.
create function public.touch_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lists set updated_at = now()
  where id = coalesce(new.list_id, old.list_id);
  return null;
end
$$;

create trigger list_items_touch_list
  after insert or update or delete on public.list_items
  for each row execute function public.touch_list();

revoke all on function public.prepare_list, public.prepare_list_item, public.touch_list
  from public, anon, authenticated;

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

revoke all on table public.lists, public.list_items from anon, authenticated;
grant select on table public.lists, public.list_items to anon, authenticated;
-- Members write only what is theirs to decide; slug, order and the admin columns are not.
grant insert (user_id, title, description, is_public) on table public.lists to authenticated;
grant update (title, description, is_public) on table public.lists to authenticated;
grant delete on table public.lists to authenticated;
grant insert (list_id, coffee_id, note) on table public.list_items to authenticated;
grant update (note) on table public.list_items to authenticated;
grant delete on table public.list_items to authenticated;
grant all on table public.lists, public.list_items to service_role;

create policy lists_select_visible on public.lists
  for select to anon, authenticated
  using (
    (is_public and hidden_at is null)
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy lists_insert_own on public.lists
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.can_post()));
create policy lists_update_own on public.lists
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.can_post()));
-- Like everything else of one's own: deleting stays possible while restricted.
create policy lists_delete_own on public.lists
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Entries follow their list: visible when the list is (the subquery is itself filtered by
-- the policies above), editable by the list's owner.
create policy list_items_select_visible on public.list_items
  for select to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id));
create policy list_items_insert_own on public.list_items
  for insert to authenticated
  with check (
    (select public.can_post())
    and exists (
      select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())
    )
  );
create policy list_items_update_own on public.list_items
  for update to authenticated
  using (
    exists (
      select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())
    )
  )
  with check ((select public.can_post()));
create policy list_items_delete_own on public.list_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())
    )
  );

-- ── the order of a list ─────────────────────────────────────────────────────────────────
-- Takes the list's coffees in their new order. SECURITY DEFINER because `position` is not
-- writable through the API; the function checks the owner itself.
create function public.reorder_list_v1(p_list_id uuid, p_coffee_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_ids uuid[] := coalesce(p_coffee_ids, '{}'::uuid[]);
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.lists l where l.id = p_list_id and l.user_id = v_user_id
  ) then
    raise exception 'list_not_found' using errcode = 'P0002';
  end if;
  if not public.can_post() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Every entry exactly once: nothing added, nothing dropped, nothing twice.
  if (select count(*) from public.list_items i where i.list_id = p_list_id) <> cardinality(v_ids)
    or (select count(distinct x) from unnest(v_ids) as x) <> cardinality(v_ids)
    or exists (
      select 1 from public.list_items i
      where i.list_id = p_list_id and not (i.coffee_id = any (v_ids))
    )
  then
    raise exception 'list_order_mismatch' using errcode = '22023';
  end if;

  update public.list_items i
  set position = o.ord
  from unnest(v_ids) with ordinality as o(coffee_id, ord)
  where i.list_id = p_list_id and i.coffee_id = o.coffee_id;
end
$$;

comment on function public.reorder_list_v1 is
  'Puts the entries of one of the caller''s lists in the given order.';

revoke all on function public.reorder_list_v1 from public, anon;
grant execute on function public.reorder_list_v1 to authenticated;

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- One row per list with its entries in order, as the apps read it. The entries are a JSON
-- array so that a list arrives whole in one row.
create view public.list_feed
with (security_invoker = true)
as
select
  l.id as list_id,
  l.slug,
  l.title,
  l.description,
  l.is_public,
  (l.hidden_at is not null) as is_hidden,
  l.created_at,
  l.updated_at,
  p.id as user_id,
  p.username,
  p.display_name,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('coffee_id', i.coffee_id, 'note', i.note)
        order by i.position, i.created_at
      )
      from public.list_items i
      where i.list_id = l.id
    ),
    '[]'::jsonb
  ) as items
from public.lists l
join public.profiles p on p.id = l.user_id;

comment on view public.list_feed is
  'Lists with their entries in order, as visible to the calling user.';

revoke all on table public.list_feed from anon, authenticated;
grant select on table public.list_feed to anon, authenticated, service_role;

-- ── moderation: a list is a target like any other ───────────────────────────────────────
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

-- ── merging coffees takes list entries along ────────────────────────────────────────────
create or replace function public.merge_coffee_into(p_from uuid, p_into uuid)
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
  -- Lists: an entry moves to the surviving coffee, unless that list already holds it (what
  -- is left would be a duplicate, and goes with the coffee below).
  update public.list_items i set coffee_id = p_into
  where i.coffee_id = p_from
    and not exists (
      select 1 from public.list_items x where x.list_id = i.list_id and x.coffee_id = p_into
    );
  delete from public.coffees where id = p_from;
end
$$;

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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags and lists.';
