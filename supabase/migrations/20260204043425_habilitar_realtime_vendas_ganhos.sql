-- ============================================
-- HABILITAR REALTIME PARA VENDAS E GANHOS
-- ============================================
-- Permite que o histórico de vendas e painel de ganhos
-- atualizem em tempo real sem precisar recarregar a página
-- ============================================

-- Habilitar Realtime para tabela de vendas
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

-- Habilitar Realtime para tabela de itens_venda
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;

-- Habilitar Realtime para tabela de ganhos_admin
ALTER PUBLICATION supabase_realtime ADD TABLE ganhos_admin;

-- Habilitar Realtime para tabela de produtos (para sincronização de estoque)
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;

-- Comentários
COMMENT ON TABLE vendas IS 'Vendas com sincronização em tempo real habilitada';
COMMENT ON TABLE ganhos_admin IS 'Ganhos do admin com sincronização em tempo real habilitada';
COMMENT ON TABLE produtos IS 'Produtos com sincronização de estoque em tempo real habilitada';
