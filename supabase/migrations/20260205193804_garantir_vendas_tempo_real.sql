-- ============================================
-- GARANTIR QUE VENDAS FUNCIONE EM TEMPO REAL
-- ============================================
-- Garante que a tabela vendas e itens_venda estejam corretas
-- e com realtime habilitado
-- ============================================

-- 1. Verificar e corrigir estrutura da tabela vendas
DO $$
BEGIN
    -- Garantir que forma_pagamento existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vendas' AND column_name = 'forma_pagamento'
    ) THEN
        ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT;
    END IF;

    -- Garantir que motivo_cancelamento existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vendas' AND column_name = 'motivo_cancelamento'
    ) THEN
        ALTER TABLE vendas ADD COLUMN motivo_cancelamento TEXT;
    END IF;

    -- Garantir que created_at tem valor padrão
    ALTER TABLE vendas ALTER COLUMN created_at SET DEFAULT NOW();
END $$;

-- 2. Garantir que itens_venda tenha a estrutura correta
DO $$
BEGIN
    -- Garantir que a coluna 'nome' existe (nome do produto)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'itens_venda' AND column_name = 'nome'
    ) THEN
        ALTER TABLE itens_venda ADD COLUMN nome TEXT NOT NULL DEFAULT 'Produto';
    END IF;

    -- Remover NOT NULL temporariamente se já existir
    ALTER TABLE itens_venda ALTER COLUMN nome DROP NOT NULL;
    
    -- Garantir que todos os registros tenham nome
    UPDATE itens_venda SET nome = 'Produto' WHERE nome IS NULL OR nome = '';
    
    -- Adicionar NOT NULL novamente
    ALTER TABLE itens_venda ALTER COLUMN nome SET NOT NULL;
END $$;

-- 3. Habilitar Realtime para vendas e itens_venda
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;

-- 4. Comentários
COMMENT ON TABLE vendas IS 'Vendas realizadas pelos operadores - com realtime habilitado';
COMMENT ON TABLE itens_venda IS 'Itens das vendas - com realtime habilitado';
COMMENT ON COLUMN vendas.forma_pagamento IS 'Forma de pagamento: dinheiro, pix, cartao_debito, cartao_credito';
COMMENT ON COLUMN itens_venda.nome IS 'Nome do produto no momento da venda';

-- 5. Verificação final
DO $$
DECLARE
    vendas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vendas_count FROM vendas;
    RAISE NOTICE '✅ Tabela vendas está pronta. Total de vendas: %', vendas_count;
END $$;
