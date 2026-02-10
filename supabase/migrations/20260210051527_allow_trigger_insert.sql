-- Remover política INSERT restritiva
DROP POLICY IF EXISTS "permitir_cadastro_novos_usuarios" ON operadores;

-- Nova política INSERT muito simples: sempre permite inserção
-- As validações de negócio ficam no app/trigger
-- RLS vai controlar SELECT/UPDATE/DELETE, não INSERT
CREATE POLICY "permitir_todos_inserts"
ON operadores
FOR INSERT
WITH CHECK (true);

-- Comentário
COMMENT ON POLICY "permitir_todos_inserts" ON operadores IS
'Permite qualquer INSERT (validações no app). RLS protege SELECT/UPDATE/DELETE.';
