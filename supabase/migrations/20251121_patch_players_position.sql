-- Safety patch: ensure roster rows support the position field used by the app.
alter table if exists public.players
  add column if not exists position text;
