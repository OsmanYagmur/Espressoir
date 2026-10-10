-- Extensions and text helpers shared by search, slugs and duplicate detection.
-- Rollback: supabase/rollbacks/20261010124909_extensions_and_text_helpers.down.sql

-- Supabase keeps extensions in their own schema, out of the exposed `public` API.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() is only STABLE (its dictionary could change), so it cannot be used in
-- indexes or generated columns. Pinning the dictionary makes this wrapper safe to
-- mark IMMUTABLE.
create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, input)
$$;

comment on function public.immutable_unaccent(text) is
  'unaccent() with a pinned dictionary, usable in indexes.';

-- Folds text for matching: "Kahve Dünyası" -> "kahve dunyasi", "İntenso" -> "intenso".
-- Turkish letters are mapped explicitly because lower() would turn "İ" into "i̇"
-- (i + combining dot). Must stay in sync with foldTurkish() in @espressoir/core.
create or replace function public.fold_tr(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(public.immutable_unaccent(translate(input, 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc')))
$$;

comment on function public.fold_tr(text) is
  'Lowercase, accent-free, Turkish-aware folding for search and slugs.';
