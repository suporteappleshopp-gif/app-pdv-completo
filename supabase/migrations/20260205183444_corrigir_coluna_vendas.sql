-- Correção: Renomear tipo_pagamento para forma_pagamento (nome correto usado no banco)
-- A tabela vendas já existe com forma_pagamento, mas a migration anterior tinha tipo_pagamento
-- Esta migration garante consistência entre código e banco de dados

-- Verificar se a coluna tipo_pagamento existe e renomear para forma_pagamento
DO $$
BEGIN
    -- Se tipo_pagamento existe, renomear para forma_pagamento
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vendas'
        AND column_name = 'tipo_pagamento'
    ) THEN
        ALTER TABLE vendas RENAME COLUMN tipo_pagamento TO forma_pagamento;
        RAISE NOTICE 'Coluna tipo_pagamento renomeada para forma_pagamento';
    END IF;

    -- Se forma_pagamento não existe, criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vendas'
        AND column_name = 'forma_pagamento'
    ) THEN
        ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT;
        RAISE NOTICE 'Coluna forma_pagamento criada';
    END IF;

    -- Adicionar coluna updated_at se não existir (para consistência)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vendas'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE vendas ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at criada';
    END IF;
END $$;

-- Comentário explicativo
COMMENT ON COLUMN vendas.forma_pagamento IS 'Forma de pagamento: dinheiro, pix, cartao_debito, cartao_credito';
