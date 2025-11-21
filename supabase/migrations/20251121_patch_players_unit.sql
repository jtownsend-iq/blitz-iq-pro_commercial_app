-- Safety patch: ensure roster rows can store the unit (OFFENSE/DEFENSE/ST) used in the app.
alter table if exists public.players
  add column if not exists unit text;
