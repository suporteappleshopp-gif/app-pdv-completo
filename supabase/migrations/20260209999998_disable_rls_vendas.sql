-- Desabilitar RLS temporariamente para permitir que admins vejam todas as vendas
-- O controle de acesso será feito na camada de aplicação

-- Desabilitar RLS em vendas
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS em itens_venda
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;

-- Nota: Isso permite que qualquer usuário autenticado veja todas as vendas
-- Em produção, você deve manter RLS e criar políticas adequadas
