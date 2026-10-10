-- Reverts 20261010124909_extensions_and_text_helpers.sql.
-- The extensions stay installed: they are harmless and later objects may depend on them.
drop function if exists public.fold_tr(text);
drop function if exists public.immutable_unaccent(text);
