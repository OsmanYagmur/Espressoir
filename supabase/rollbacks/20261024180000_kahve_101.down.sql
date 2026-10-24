-- Reverts 20261024180000_kahve_101.sql: the introductory workshop goes back to its old
-- name, again only where it still carries the default.
update public.workshops
set title = 'Kahveye giriş atölyesi'
where program = 'kahveye-giris'
  and title = 'Kahve 101';
