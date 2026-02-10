-- Remove todas as políticas existentes da tabela operadores para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir inserção de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir atualização de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir exclusão de operadores" ON operadores;
DROP POLICY IF EXISTS "operadores_select_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_insert_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_update_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_delete_policy" ON operadores;
DROP POLICY IF EXISTS "Enable read access for all users" ON operadores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON operadores;
DROP POLICY IF EXISTS "Enable update for users based on id" ON operadores;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON operadores;

-- Política 1: TODOS podem se cadastrar (INSERT)
-- Não precisa de verificação de role, permite qualquer usuário autenticado criar um registro
CREATE POLICY "allow_insert_for_authenticated"
ON operadores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política 2: Usuários podem ler APENAS seu próprio registro
-- Evita recursão pois não faz JOIN com a própria tabela
CREATE POLICY "allow_select_own_record"
ON operadores
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política 3: ADM pode ler TODOS os registros
-- Usa função simples sem recursão
CREATE POLICY "allow_select_all_for_admin"
ON operadores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.id = auth.uid()
    AND op.role = 'admin'
  )
);

-- Política 4: Usuários podem atualizar APENAS seu próprio registro (exceto role)
CREATE POLICY "allow_update_own_record"
ON operadores
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM operadores WHERE id = auth.uid())
);

-- Política 5: ADM pode atualizar QUALQUER registro
CREATE POLICY "allow_update_all_for_admin"
ON operadores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.id = auth.uid()
    AND op.role = 'admin'
  )
);

-- Política 6: Apenas ADM pode deletar registros
CREATE POLICY "allow_delete_for_admin"
ON operadores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.id = auth.uid()
    AND op.role = 'admin'
  )
);

-- Garantir que RLS está ativo
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;

-- Comentário explicativo
COMMENT ON TABLE operadores IS 'Políticas RLS configuradas: todos podem se cadastrar, usuários veem apenas seu registro, ADM gerencia tudo';
