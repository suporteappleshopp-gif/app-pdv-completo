-- ============================================
-- HABILITAR REALTIME - SCRIPT DEFINITIVO
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a publicação existe
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Se não existir, criar (normalmente já existe)
-- CREATE PUBLICATION supabase_realtime;

-- 3. Remover tabelas da publicação (caso já estejam)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS vendas;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS itens_venda;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS produtos;

-- 4. Configurar REPLICA IDENTITY
ALTER TABLE vendas REPLICA IDENTITY FULL;
ALTER TABLE itens_venda REPLICA IDENTITY FULL;
ALTER TABLE produtos REPLICA IDENTITY FULL;

-- 5. Adicionar tabelas à publicação
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;

-- 6. Verificar se funcionou
SELECT
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 7. Verificar replicação
SELECT
    schemaname,
    tablename,
    relreplident
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE relname IN ('vendas', 'itens_venda', 'produtos')
AND nspname = 'public';

-- Resultado esperado:
-- - vendas deve estar na lista
-- - itens_venda deve estar na lista
-- - produtos deve estar na lista
-- - relreplident deve ser 'f' (FULL)
