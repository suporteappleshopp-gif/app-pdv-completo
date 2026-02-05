-- =========================================================================
-- CORRIGIR FOREIGN KEY DA TABELA ganhos_admin
-- Remove restrição ON DELETE CASCADE que impede inserção de ganhos
-- quando usuário é criado mas ainda não confirmado
-- =========================================================================

-- 1. Remover a constraint de foreign key existente (se houver)
DO $$
BEGIN
    -- Buscar e remover todas as foreign keys da coluna usuario_id
    EXECUTE (
        SELECT string_agg('ALTER TABLE ganhos_admin DROP CONSTRAINT IF EXISTS ' || conname || ';', ' ')
        FROM pg_constraint
        WHERE conrelid = 'ganhos_admin'::regclass
        AND contype = 'f'
        AND conkey = (SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid = 'ganhos_admin'::regclass AND attname = 'usuario_id')
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Nenhuma constraint encontrada ou erro ao remover: %', SQLERRM;
END $$;

-- 2. Alterar a coluna usuario_id para permitir referências temporárias
-- Remove a constraint de foreign key completamente
-- Isso permite registrar ganhos mesmo se o usuário não existir ainda no momento do registro

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN ganhos_admin.usuario_id IS 'ID do usuário (operador) - permite registro mesmo se usuário for deletado posteriormente';

-- 4. Garantir que a coluna dias_comprados existe
ALTER TABLE ganhos_admin
ADD COLUMN IF NOT EXISTS dias_comprados INTEGER;

COMMENT ON COLUMN ganhos_admin.dias_comprados IS 'Quantidade de dias comprados nesta transação (60 para PIX, 180 para cartão)';

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
