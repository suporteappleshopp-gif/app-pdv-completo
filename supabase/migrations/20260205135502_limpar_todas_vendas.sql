-- =====================================================
-- LIMPAR TODAS AS VENDAS E ITENS DE VENDA
-- Deixa o sistema zerado para começar a usar
-- =====================================================

-- Deletar todos os itens de venda primeiro (por causa da foreign key)
DELETE FROM itens_venda;

-- Deletar todas as vendas
DELETE FROM vendas;

-- Comentário
COMMENT ON TABLE vendas IS 'Vendas limpas - sistema pronto para uso';
COMMENT ON TABLE itens_venda IS 'Itens de venda limpos - sistema pronto para uso';
