-- Remover apenas triggers CUSTOMIZADOS (não os do sistema Supabase)
-- Ignora triggers de constraint que começam com "RI_ConstraintTrigger"

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND tgname NOT LIKE 'RI_ConstraintTrigger%'  -- Ignora triggers do sistema
          AND tgname NOT LIKE 'pg_%'                    -- Ignora triggers do PostgreSQL
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users CASCADE';
        RAISE NOTICE 'Trigger customizado removido: %', r.tgname;
    END LOOP;
END $$;

-- Remover a função handle_new_user se existir
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Listar triggers customizados restantes (para verificação)
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'RI_ConstraintTrigger%'
  AND tgname NOT LIKE 'pg_%';
