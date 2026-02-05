-- =========================================================================
-- CORREÇÃO URGENTE: Remover Foreign Key da tabela ganhos_admin
-- =========================================================================
-- PROBLEMA: A foreign key usuario_id -> operadores(id) com ON DELETE CASCADE
-- impede o registro de ganhos quando há problemas de sincronização
--
-- SOLUÇÃO: Remover a constraint de foreign key para permitir registro
-- independente do estado da tabela operadores
-- =========================================================================

-- Passo 1: Identificar e remover todas as constraints de foreign key
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar todas as constraints de foreign key na coluna usuario_id
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'ganhos_admin'::regclass
        AND contype = 'f'
        AND conkey @> (SELECT ARRAY[attnum] FROM pg_attribute WHERE attrelid = 'ganhos_admin'::regclass AND attname = 'usuario_id')
    LOOP
        EXECUTE format('ALTER TABLE ganhos_admin DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint removida: %', constraint_name;
    END LOOP;
END $$;

-- Passo 2: Garantir que a coluna dias_comprados existe
ALTER TABLE ganhos_admin
ADD COLUMN IF NOT EXISTS dias_comprados INTEGER;

-- Passo 3: Atualizar comentários da tabela
COMMENT ON COLUMN ganhos_admin.usuario_id IS 'ID do usuário (permite registro mesmo se usuário for deletado)';
COMMENT ON COLUMN ganhos_admin.dias_comprados IS 'Dias comprados: 60 (PIX) ou 180 (Cartão)';

-- Passo 4: Verificar estrutura final
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ganhos_admin'
ORDER BY ordinal_position;

-- =========================================================================
-- INSTRUÇÕES PARA EXECUTAR:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em "SQL Editor"
-- 3. Copie e cole este SQL completo
-- 4. Clique em "Run"
-- 5. Verifique se aparece a mensagem de sucesso
-- =========================================================================
