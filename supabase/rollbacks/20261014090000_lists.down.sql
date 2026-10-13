-- Reverts 20261014090000_lists.sql.
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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports and flavour tags.';

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
  delete from public.coffees where id = p_from;
end
$$;

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
  end case;
  if not v_exists then
    raise exception 'report_target_not_found' using errcode = '23503';
  end if;
  return new;
end
$$;

drop function if exists public.reorder_list_v1(uuid, uuid[]);
drop view if exists public.list_feed;
drop table if exists public.list_items;
drop table if exists public.lists;
drop function if exists public.touch_list();
drop function if exists public.prepare_list_item();
drop function if exists public.prepare_list();

-- An enum cannot lose a value: the type is rebuilt without it. Reports about lists go
-- first (the lists themselves are gone); the two functions that take the type as an
-- argument are dropped with the old type and made again with the new one.
delete from public.reports where target_type = 'list';
drop function if exists public.admin_set_hidden_v1(public.report_target, uuid, boolean, text);
drop function if exists public.admin_delete_v1(public.report_target, uuid, text);

alter type public.report_target rename to report_target_old;
create type public.report_target as enum ('tasting', 'comment', 'profile', 'coffee');
alter table public.reports
  alter column target_type type public.report_target
  using target_type::text::public.report_target;
drop type public.report_target_old;

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

revoke all on function public.admin_set_hidden_v1, public.admin_delete_v1 from public, anon;
grant execute on function public.admin_set_hidden_v1, public.admin_delete_v1 to authenticated;
