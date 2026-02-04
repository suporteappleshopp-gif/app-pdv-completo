-- ============================================
-- LIMPAR E CORRIGIR TABELA ITENS_VENDA
-- ============================================
-- Remove coluna duplicada 'produto_nome' e mantém apenas 'nome'
-- Limpa vendas antigas para evitar inconsistências
-- ============================================

-- 1. Limpar todas as vendas antigas (para evitar conflitos)
DELETE FROM itens_venda;
DELETE FROM vendas;

-- 2. Resetar a coluna nome (remover NOT NULL temporariamente)
ALTER TABLE itens_venda
ALTER COLUMN nome DROP NOT NULL;

-- 3. Copiar dados de produto_nome para nome (se houver)
UPDATE itens_venda
SET nome = COALESCE(nome, produto_nome, 'Produto');

-- 4. Remover coluna produto_nome
ALTER TABLE itens_venda
DROP COLUMN IF EXISTS produto_nome;

-- 5. Tornar nome obrigatória novamente
ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;

-- 6. Comentário
COMMENT ON COLUMN itens_venda.nome IS 'Nome do produto no momento da venda';
COMMENT ON TABLE itens_venda IS 'Itens de venda - limpos e prontos para uso';
COMMENT ON TABLE vendas IS 'Vendas - limpas e prontas para uso';
