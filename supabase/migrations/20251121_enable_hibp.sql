do $$
declare
  has_set_config boolean := to_regprocedure('auth.set_config(text,text)') is not null;
  has_config boolean := to_regclass('auth.config') is not null;
  has_settings boolean := (
    to_regclass('auth.settings') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'settings'
        and column_name = 'hibp_enabled'
    )
  );
begin
  -- Prefer the official setter when present (hosted Supabase).
  if has_set_config then
    perform auth.set_config('HIBP_ENABLED', 'true');
  elsif has_config then
    update auth.config set hibp_enabled = true;
  elsif has_settings then
    update auth.settings set hibp_enabled = true;
  else
    raise notice 'HIBP enable skipped: auth config table not present. Enable via dashboard if available.';
  end if;
end
$$;
