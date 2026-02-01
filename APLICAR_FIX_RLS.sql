-- ============================================================================
-- FIX: Corrigir RLS para historico_pagamentos
-- ============================================================================
-- PROBLEMA: Pagamentos salvos via API não aparecem na listagem do usuário
-- SOLUÇÃO: Permitir leitura completa da tabela (APIs usam service_role)
-- ============================================================================

-- 1. Remover políticas antigas que estão bloqueando
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode inserir pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode atualizar pagamentos" ON historico_pagamentos;

-- 2. Criar novas políticas mais permissivas
CREATE POLICY "Usuarios e API podem ver pagamentos"
ON historico_pagamentos
FOR SELECT
USING (true);  -- Permitir todas as leituras

CREATE POLICY "API pode inserir pagamentos"
ON historico_pagamentos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "API pode atualizar pagamentos"
ON historico_pagamentos
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "API pode deletar pagamentos"
ON historico_pagamentos
FOR DELETE
USING (true);

-- ============================================================================
-- COMO APLICAR ESTA CORREÇÃO:
-- ============================================================================
-- Opção 1: Copie todo este conteúdo e cole no SQL Editor do Supabase
-- Opção 2: Execute: psql <sua_connection_string> -f APLICAR_FIX_RLS.sql
-- ============================================================================
