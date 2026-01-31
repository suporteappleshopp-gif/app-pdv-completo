-- Habilitar RLS na tabela ganhos_admin
ALTER TABLE ganhos_admin ENABLE ROW LEVEL SECURITY;

-- Política: Permitir SELECT para todos (leitura pública)
CREATE POLICY "Permitir leitura de ganhos_admin para todos"
ON ganhos_admin
FOR SELECT
USING (true);

-- Política: Permitir INSERT para todos (gravação pública)
CREATE POLICY "Permitir inserção de ganhos_admin para todos"
ON ganhos_admin
FOR INSERT
WITH CHECK (true);

-- Política: Permitir UPDATE para todos (atualização pública)
CREATE POLICY "Permitir atualização de ganhos_admin para todos"
ON ganhos_admin
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política: Permitir DELETE para todos (exclusão pública)
CREATE POLICY "Permitir exclusão de ganhos_admin para todos"
ON ganhos_admin
FOR DELETE
USING (true);
