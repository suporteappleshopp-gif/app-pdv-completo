-- Permitir que administradores leiam todas as vendas de todos os usuários
-- Isso é necessário para o painel de análise de lojas funcionar

-- Remover política antiga se existir e criar nova
DROP POLICY IF EXISTS "Admins podem ler todas as vendas" ON vendas;
CREATE POLICY "Admins podem ler todas as vendas"
ON vendas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);

-- Remover política antiga se existir e criar nova
DROP POLICY IF EXISTS "Admins podem ler todos os itens de venda" ON itens_venda;
CREATE POLICY "Admins podem ler todos os itens de venda"
ON itens_venda
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);
