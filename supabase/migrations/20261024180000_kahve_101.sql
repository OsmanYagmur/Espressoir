-- The introductory workshop is called "Kahve 101" (2026-10-24). The first workshop row
-- was seeded with the old name; it is renamed only while it still carries that default,
-- so a title the admin has already changed stays as it is. Data only, no schema change.
update public.workshops
set title = 'Kahve 101'
where program = 'kahveye-giris'
  and title = 'Kahveye giriş atölyesi';
