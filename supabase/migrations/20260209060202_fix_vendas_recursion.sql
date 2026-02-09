-- =========================================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS de Vendas
-- Data: 2026-02-09
-- Problema: Políticas causam recursão ao consultar tabela operadores
-- Solução: Usar auth.uid() com IN evitando recursão
-- =========================================================================

-- Remover política antiga de vendas
DROP POLICY IF EXISTS "Admins podem ler todas as vendas" ON vendas;

-- Criar política corrigida para vendas (SEM RECURSÃO)
CREATE POLICY "Admins podem ler todas as vendas"
  ON vendas
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM operadores
      WHERE is_admin = true
      LIMIT 1
    )
    OR operador_id IN (
      SELECT id FROM operadores
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Remover política antiga de itens_venda
DROP POLICY IF EXISTS "Admins podem ler todos os itens de venda" ON itens_venda;

-- Criar política corrigida para itens_venda (SEM RECURSÃO)
CREATE POLICY "Admins podem ler todos os itens de venda"
  ON itens_venda
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM operadores
      WHERE is_admin = true
      LIMIT 1
    )
    OR venda_id IN (
      SELECT id FROM vendas
      WHERE operador_id IN (
        SELECT id FROM operadores
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- Comentários
COMMENT ON POLICY "Admins podem ler todas as vendas" ON vendas IS 'Permite admins lerem todas vendas sem recursão infinita';
COMMENT ON POLICY "Admins podem ler todos os itens de venda" ON itens_venda IS 'Permite admins lerem todos itens sem recursão infinita';
