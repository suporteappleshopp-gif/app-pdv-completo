-- Adicionar colunas de CPF do cliente na tabela vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_cpf TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
