-- Remover TODOS os triggers relacionados a auth.users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users';
        RAISE NOTICE 'Trigger removido: %', r.tgname;
    END LOOP;
END $$;

-- Listar triggers restantes (para verificação)
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;
