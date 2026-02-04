-- ============================================
-- ADICIONAR COLUNA NOME EM ITENS_VENDA
-- ============================================
-- A coluna 'nome' é necessária para armazenar o nome do produto
-- no momento da venda (histórico imutável)
-- ============================================

-- Adicionar coluna nome se não existir
ALTER TABLE itens_venda
ADD COLUMN IF NOT EXISTS nome TEXT;

-- Atualizar valores NULL com nome do produto (se houver relação)
UPDATE itens_venda
SET nome = COALESCE(nome, 'Produto')
WHERE nome IS NULL;

-- Tornar coluna obrigatória após preencher valores
ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;

-- Comentário
COMMENT ON COLUMN itens_venda.nome IS 'Nome do produto no momento da venda (histórico imutável)';
