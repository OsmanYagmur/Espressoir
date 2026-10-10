-- Catalog: brands, coffees and the reference lists (brew methods, flavor tags).
-- A coffee is a product (brand + name); what someone thought of it lives in `tastings`.
-- Rollback: supabase/rollbacks/20261010133100_catalog.down.sql

-- URL slug with Turkish-aware folding: "Ristretto (Siyah Kapsül)" -> "ristretto-siyah-kapsul".
-- Apostrophes are dropped so "Jacob's" and "Jacobs" share a slug.
-- Must stay in sync with slugify() in @espressoir/core. The database is the authority:
-- clients read slugs, they never write their own.
create function public.slugify(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select btrim(
    left(
      regexp_replace(
        regexp_replace(public.fold_tr(input), '[''’‘`´]', '', 'g'),
        '[^a-z0-9]+', '-', 'g'
      ),
      80
    ),
    '-'
  )
$$;

comment on function public.slugify(text) is 'URL slug with Turkish-aware folding.';

-- Shared by every table with a human-entered name: collapses stray whitespace and derives
-- the slug on insert. Slugs are not touched on update, so fixing a typo never breaks a URL.
create function public.prepare_named_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  if tg_op = 'INSERT' and coalesce(new.slug, '') = '' then
    new.slug := public.slugify(new.name);
  end if;
  return new;
end
$$;

create type public.coffee_form as enum ('whole_bean', 'ground', 'capsule');
create type public.capsule_system as enum ('nespresso_original', 'vertuo', 'dolce_gusto');
create type public.coffee_process as enum (
  'washed', 'natural', 'honey', 'anaerobic', 'wet_hulled', 'other'
);
create type public.roast_level as enum ('light', 'medium_light', 'medium', 'medium_dark', 'dark');
create type public.brew_category as enum ('espresso', 'filter', 'immersion', 'capsule', 'turkish');
create type public.flavor_group as enum (
  'fruity', 'floral', 'chocolate', 'nutty', 'spice', 'sweet', 'other'
);

-- ── brands ──────────────────────────────────────────────────────────────────────────────
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Filled in by the prepare trigger when left empty.
  slug text not null default '',
  -- Other spellings seen for this brand ("Starbuck", "Jacob's"); used to match new entries.
  aliases text[] not null default '{}',
  -- ISO 3166-1 alpha-2, e.g. 'TR'.
  country text,
  website text,
  is_specialty_roaster boolean,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_key unique (slug),
  constraint brands_name_length check (char_length(name) between 1 and 80),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint brands_country_format check (country ~ '^[A-Z]{2}$'),
  constraint brands_website_format check (website ~ '^https?://')
);

create trigger brands_prepare
  before insert or update on public.brands
  for each row execute function public.prepare_named_row();
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- Finds a brand by name or by any recorded alias, ignoring case, accents and apostrophes.
create function public.find_brand_id(p_name text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select b.id
  from public.brands b
  where b.slug = public.slugify(p_name)
     or exists (
       select 1 from unnest(b.aliases) as alias
       where public.slugify(alias) = public.slugify(p_name)
     )
  order by (b.slug = public.slugify(p_name)) desc
  limit 1
$$;

-- ── coffees ─────────────────────────────────────────────────────────────────────────────
create table public.coffees (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null,
  -- Filled in by the prepare trigger when left empty.
  slug text not null default '',
  form public.coffee_form,
  capsule_system public.capsule_system,
  -- The brand's own strength scale (Nespresso 1-13, others differ): never compared across brands.
  brand_intensity smallint,
  -- ISO 3166-1 alpha-2, only when the coffee is clearly from one country.
  origin_country text,
  region text,
  process public.coffee_process,
  roast_level public.roast_level,
  is_blend boolean,
  description text,
  image_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coffees_brand_slug_key unique (brand_id, slug),
  constraint coffees_name_length check (char_length(name) between 1 and 120),
  constraint coffees_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint coffees_capsule_system_needs_capsule
    check (capsule_system is null or form = 'capsule'),
  constraint coffees_brand_intensity_range check (brand_intensity between 1 and 20),
  constraint coffees_origin_country_format check (origin_country ~ '^[A-Z]{2}$'),
  constraint coffees_region_length check (char_length(region) between 1 and 80),
  constraint coffees_description_length check (char_length(description) <= 2000),
  constraint coffees_image_url_format check (image_url ~ '^https://')
);

create trigger coffees_prepare
  before insert or update on public.coffees
  for each row execute function public.prepare_named_row();
create trigger coffees_set_updated_at
  before update on public.coffees
  for each row execute function public.set_updated_at();

-- ── brew methods (reference list) ───────────────────────────────────────────────────────
create table public.brew_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Filled in by the prepare trigger when left empty.
  slug text not null default '',
  category public.brew_category not null,
  sort_order smallint not null default 0,
  constraint brew_methods_slug_key unique (slug),
  constraint brew_methods_name_length check (char_length(name) between 1 and 60),
  constraint brew_methods_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger brew_methods_prepare
  before insert or update on public.brew_methods
  for each row execute function public.prepare_named_row();

-- ── flavor tags (reference list) ────────────────────────────────────────────────────────
create table public.flavor_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Filled in by the prepare trigger when left empty.
  slug text not null default '',
  tag_group public.flavor_group not null,
  sort_order smallint not null default 0,
  constraint flavor_tags_slug_key unique (slug),
  constraint flavor_tags_name_length check (char_length(name) between 1 and 40),
  constraint flavor_tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger flavor_tags_prepare
  before insert or update on public.flavor_tags
  for each row execute function public.prepare_named_row();

-- ── reference data ──────────────────────────────────────────────────────────────────────
-- Needed in every environment (prod included), so it ships with the schema, not the dev seed.
insert into public.brew_methods (name, category, sort_order) values
  ('V60', 'filter', 10),
  ('Filtre Kahve Makinesi', 'filter', 20),
  ('Chemex', 'filter', 30),
  ('French Press', 'immersion', 40),
  ('AeroPress', 'immersion', 50),
  ('Kapsül Makinesi', 'capsule', 60),
  ('Espresso Makinesi', 'espresso', 70),
  ('Taşınabilir Espresso', 'espresso', 80),
  ('Moka Pot', 'espresso', 90),
  ('Türk Kahvesi', 'turkish', 100);

insert into public.flavor_tags (name, tag_group, sort_order) values
  ('Meyvemsi', 'fruity', 10),
  ('Narenciye', 'fruity', 11),
  ('Orman Meyveleri', 'fruity', 12),
  ('Kuru Meyve', 'fruity', 13),
  ('Çiçeksi', 'floral', 20),
  ('Yasemin', 'floral', 21),
  ('Bitter Çikolata', 'chocolate', 30),
  ('Sütlü Çikolata', 'chocolate', 31),
  ('Kakao', 'chocolate', 32),
  ('Fındık', 'nutty', 40),
  ('Badem', 'nutty', 41),
  ('Ceviz', 'nutty', 42),
  ('Baharatlı', 'spice', 50),
  ('Tarçın', 'spice', 51),
  ('Karamel', 'sweet', 60),
  ('Vanilya', 'sweet', 61),
  ('Bal', 'sweet', 62),
  ('Tütsülü', 'other', 70),
  ('Topraksı', 'other', 71),
  ('Odunsu', 'other', 72);

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.brands enable row level security;
alter table public.coffees enable row level security;
alter table public.brew_methods enable row level security;
alter table public.flavor_tags enable row level security;

revoke all on table public.brands, public.coffees, public.brew_methods, public.flavor_tags
  from anon, authenticated;
grant select on table public.brands, public.coffees, public.brew_methods, public.flavor_tags
  to anon, authenticated;
grant insert, update, delete
  on table public.brands, public.coffees, public.brew_methods, public.flavor_tags
  to authenticated;
grant all on table public.brands, public.coffees, public.brew_methods, public.flavor_tags
  to service_role;

-- The catalog is public. Signed-in users may add brands and coffees (as themselves);
-- correcting or removing shared entries is left to admins.
create policy brands_select_all on public.brands
  for select to anon, authenticated using (true);
create policy brands_insert_own on public.brands
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy brands_update_admin on public.brands
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy brands_delete_admin on public.brands
  for delete to authenticated using ((select public.is_admin()));

create policy coffees_select_all on public.coffees
  for select to anon, authenticated using (true);
create policy coffees_insert_own on public.coffees
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy coffees_update_admin on public.coffees
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy coffees_delete_admin on public.coffees
  for delete to authenticated using ((select public.is_admin()));

create policy brew_methods_select_all on public.brew_methods
  for select to anon, authenticated using (true);
create policy brew_methods_write_admin on public.brew_methods
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy flavor_tags_select_all on public.flavor_tags
  for select to anon, authenticated using (true);
create policy flavor_tags_write_admin on public.flavor_tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
