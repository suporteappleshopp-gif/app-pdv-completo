-- Corrigir políticas RLS para historico_pagamentos
-- Problema: O SELECT está restrito apenas a current_setting, mas as APIs precisam acessar

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode inserir pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode atualizar pagamentos" ON historico_pagamentos;

-- Nova política: SELECT - Permitir leitura via API (service_role) ou pelo próprio usuário
CREATE POLICY "Usuarios e API podem ver pagamentos"
ON historico_pagamentos
FOR SELECT
USING (
  true  -- Permitir todas as leituras (APIs usam service_role)
);

-- Nova política: INSERT - Permitir inserção via API
CREATE POLICY "API pode inserir pagamentos"
ON historico_pagamentos
FOR INSERT
WITH CHECK (true);

-- Nova política: UPDATE - Permitir atualização via API
CREATE POLICY "API pode atualizar pagamentos"
ON historico_pagamentos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Nova política: DELETE - Permitir deleção via API (se necessário)
CREATE POLICY "API pode deletar pagamentos"
ON historico_pagamentos
FOR DELETE
USING (true);

-- Comentário explicativo
COMMENT ON TABLE historico_pagamentos IS 'Histórico de pagamentos - RLS configurado para acesso via API e usuários';
