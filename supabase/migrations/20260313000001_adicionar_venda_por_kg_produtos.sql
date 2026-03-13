-- =====================================================
-- ADICIONAR COLUNA venda_por_kg NA TABELA PRODUTOS
-- =====================================================
-- Permite identificar produtos vendidos por peso (KG)
-- O caixa solicitará o peso ao passar este produto
-- =====================================================

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS venda_por_kg BOOLEAN NOT NULL DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN produtos.venda_por_kg IS 'TRUE = Produto vendido por KG (o caixa pedirá o peso na hora da venda)';

-- =====================================================
-- ✅ MIGRATION COMPLETA
-- =====================================================
