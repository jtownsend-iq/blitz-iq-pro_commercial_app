-- Intentionally retain indexes flagged as unused; no-op migration to avoid drops
do $$ begin null; end $$;
