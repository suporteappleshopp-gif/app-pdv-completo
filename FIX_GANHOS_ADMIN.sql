-- ============================================
-- FIX PARA TABELA GANHOS_ADMIN
-- ============================================
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- para corrigir o acesso à tabela ganhos_admin
--
-- Como executar:
-- 1. Acesse: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new
-- 2. Cole este código completo
-- 3. Clique em "Run" ou pressione Ctrl+Enter
-- ============================================

-- Desabilitar RLS temporariamente para permitir acesso total
ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;

-- Verificar se a tabela está acessível
SELECT COUNT(*) as total_ganhos FROM ganhos_admin;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ RLS desabilitado com sucesso!';
  RAISE NOTICE '🎉 A tabela ganhos_admin agora está acessível!';
END $$;
