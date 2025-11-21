-- Add optional timezone columns for teams and users to support localized rendering
alter table if exists public.team_settings
  add column if not exists default_timezone text not null default 'UTC';

alter table if exists public.users
  add column if not exists timezone text;
