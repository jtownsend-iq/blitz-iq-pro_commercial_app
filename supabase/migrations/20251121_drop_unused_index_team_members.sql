-- Intentionally retain index flagged as unused; no-op migration to avoid drop
do $$ begin null; end $$;
