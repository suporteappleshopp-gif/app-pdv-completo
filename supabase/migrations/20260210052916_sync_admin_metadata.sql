-- =====================================================
-- SINCRONIZAR is_admin entre operadores e auth.users
-- =====================================================
--
-- Quando is_admin é alterado em operadores, atualiza
-- o metadata em auth.users para que as políticas RLS funcionem
-- =====================================================

-- Função que sincroniza is_admin para auth.users metadata
CREATE OR REPLACE FUNCTION sync_admin_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar metadata em auth.users quando is_admin mudar
  IF NEW.is_admin != OLD.is_admin OR (OLD.is_admin IS NULL AND NEW.is_admin IS NOT NULL) THEN
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('is_admin', NEW.is_admin)
    WHERE id = NEW.auth_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_admin_metadata ON operadores;

CREATE TRIGGER trigger_sync_admin_metadata
AFTER UPDATE OF is_admin ON operadores
FOR EACH ROW
EXECUTE FUNCTION sync_admin_metadata();

-- Sincronizar todos os admins existentes
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
WHERE id IN (
  SELECT auth_user_id FROM operadores WHERE is_admin = true
);

-- Comentário
COMMENT ON FUNCTION sync_admin_metadata() IS
'Sincroniza campo is_admin de operadores para metadata em auth.users automaticamente';
