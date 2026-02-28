-- Adicionar coluna exclusoes à tabela vendas se não existir
-- Esta coluna armazenará um array JSONB com o histórico de exclusões

DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vendas'
        AND column_name = 'exclusoes'
    ) THEN
        -- Adicionar coluna exclusoes como JSONB array
        ALTER TABLE vendas
        ADD COLUMN exclusoes JSONB DEFAULT '[]'::jsonb;

        -- Criar índice GIN para buscas eficientes no JSONB
        CREATE INDEX IF NOT EXISTS idx_vendas_exclusoes ON vendas USING GIN (exclusoes);

        RAISE NOTICE 'Coluna exclusoes adicionada com sucesso à tabela vendas';
    ELSE
        RAISE NOTICE 'Coluna exclusoes já existe na tabela vendas';
    END IF;
END $$;

-- Comentário explicativo
COMMENT ON COLUMN vendas.exclusoes IS 'Histórico de exclusões de itens e vendas - array JSONB com tipo, produto, quantidade, valor e data/hora';
