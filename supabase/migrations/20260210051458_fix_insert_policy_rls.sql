-- Corrigir política INSERT para permitir que triggers e service_role criem usuários
-- O problema: a política atual exige auth.uid() = auth_user_id, mas no momento do cadastro
-- o usuário ainda não está autenticado (ou é criado via trigger/service_role)

-- Remover política INSERT atual
DROP POLICY IF EXISTS "novo_cadastro_permitido" ON operadores;

-- Nova política INSERT: permite inserção se:
-- 1. O auth_user_id corresponde ao auth.uid() (usuário autenticado se cadastrando)
-- 2. OU se não há auth.uid() (inserção via service_role ou trigger)
CREATE POLICY "permitir_cadastro_novos_usuarios"
ON operadores
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Permite se for service_role (sempre tem permissão)
  current_setting('role') = 'service_role'
  OR
  -- Permite se o usuário autenticado está criando seu próprio registro
  auth.uid() = auth_user_id
  OR
  -- Permite se não há usuário autenticado (trigger automático)
  auth.uid() IS NULL
);

-- Comentário explicativo
COMMENT ON POLICY "permitir_cadastro_novos_usuarios" ON operadores IS
'Permite cadastro via: (1) usuário autenticado, (2) service_role admin, (3) triggers automáticos';
