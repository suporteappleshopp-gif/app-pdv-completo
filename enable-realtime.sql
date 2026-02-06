-- Script para habilitar Realtime no Supabase
-- Execute este SQL no Supabase SQL Editor

-- 1. Habilitar replicação na tabela vendas
ALTER TABLE vendas REPLICA IDENTITY FULL;

-- 2. Publicar mudanças para o realtime
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

-- 3. Habilitar replicação na tabela itens_venda
ALTER TABLE itens_venda REPLICA IDENTITY FULL;

-- 4. Publicar mudanças de itens_venda
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;

-- 5. Verificar se funcionou
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
