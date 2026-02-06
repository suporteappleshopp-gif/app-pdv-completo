-- ============================================
-- VERIFICAR PERMISSÕES E RLS
-- ============================================

-- 1. Verificar se RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('vendas', 'itens_venda', 'produtos')
AND schemaname = 'public';

-- 2. Verificar políticas RLS existentes
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('vendas', 'itens_venda', 'produtos')
AND schemaname = 'public';

-- 3. Verificar grants (permissões)
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('vendas', 'itens_venda', 'produtos')
AND table_schema = 'public';

-- ============================================
-- SOLUÇÃO: Se RLS estiver bloqueando realtime
-- ============================================

-- OPÇÃO 1: Desabilitar RLS temporariamente (para testar)
-- ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;

-- OPÇÃO 2: Criar política permissiva para realtime
-- CREATE POLICY "Permitir realtime para todos" ON vendas
--   FOR SELECT USING (true);

-- CREATE POLICY "Permitir realtime para todos" ON itens_venda
--   FOR SELECT USING (true);

-- CREATE POLICY "Permitir realtime para todos" ON produtos
--   FOR SELECT USING (true);
