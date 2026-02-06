-- ===============================================
-- SQL PARA CRIAR TABELA DE AVARIAS NO SUPABASE
-- ===============================================
-- Cole este SQL completo no SQL Editor do Supabase
-- ===============================================

-- 1. Criar a tabela de avarias
CREATE TABLE IF NOT EXISTS avarias (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  venda_id TEXT,
  produto_id TEXT NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  motivo TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_avarias_user_id ON avarias(user_id);
CREATE INDEX IF NOT EXISTS idx_avarias_venda_id ON avarias(venda_id);
CREATE INDEX IF NOT EXISTS idx_avarias_created_at ON avarias(created_at);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE avarias ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias avarias" ON avarias;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias avarias" ON avarias;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias avarias" ON avarias;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias avarias" ON avarias;

-- 5. Criar políticas RLS simplificadas (SEM referência à tabela usuarios)
CREATE POLICY "Usuários podem ver suas próprias avarias"
  ON avarias
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem inserir suas próprias avarias"
  ON avarias
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas próprias avarias"
  ON avarias
  FOR UPDATE
  USING (true);

CREATE POLICY "Usuários podem deletar suas próprias avarias"
  ON avarias
  FOR DELETE
  USING (true);

-- 6. Adicionar comentários explicativos
COMMENT ON TABLE avarias IS 'Registros de produtos com avaria que não retornam ao estoque';
COMMENT ON COLUMN avarias.id IS 'ID único da avaria';
COMMENT ON COLUMN avarias.user_id IS 'ID do usuário/operador que registrou a avaria';
COMMENT ON COLUMN avarias.venda_id IS 'ID da venda original (se vier de devolução)';
COMMENT ON COLUMN avarias.produto_id IS 'ID do produto avariado';
COMMENT ON COLUMN avarias.produto_nome IS 'Nome do produto avariado';
COMMENT ON COLUMN avarias.quantidade IS 'Quantidade de produtos avariados';
COMMENT ON COLUMN avarias.valor_unitario IS 'Valor unitário do produto';
COMMENT ON COLUMN avarias.valor_total IS 'Valor total da avaria (quantidade x valor_unitario)';
COMMENT ON COLUMN avarias.motivo IS 'Motivo da avaria: Produto danificado, Vencido, Defeito de fabricação, Embalagem violada, etc';
COMMENT ON COLUMN avarias.observacoes IS 'Observações adicionais sobre a avaria';
COMMENT ON COLUMN avarias.created_at IS 'Data e hora do registro da avaria';

-- ===============================================
-- PRONTO! Tabela criada com sucesso.
-- ===============================================
-- As políticas RLS estão configuradas como 'true'
-- para permitir acesso completo. O controle de
-- acesso é feito pela aplicação via user_id.
-- ===============================================
