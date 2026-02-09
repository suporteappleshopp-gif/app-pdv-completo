-- Adicionar coluna de última atividade para rastreamento de uso do sistema
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE operadores
ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMP DEFAULT NOW();

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_operadores_ultima_atividade ON operadores(ultima_atividade);

-- Comentário na coluna
COMMENT ON COLUMN operadores.ultima_atividade IS 'Última vez que o usuário usou o sistema (vendas, consultas, etc)';
