-- Tabela de Avarias
-- Registra produtos com avaria (não retornam ao estoque)

CREATE TABLE IF NOT EXISTS avarias (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_avarias_user_id ON avarias(user_id);
CREATE INDEX IF NOT EXISTS idx_avarias_venda_id ON avarias(venda_id);
CREATE INDEX IF NOT EXISTS idx_avarias_created_at ON avarias(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE avarias ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias avarias
CREATE POLICY "Usuários podem ver suas próprias avarias"
  ON avarias
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Política: Usuários podem inserir suas próprias avarias
CREATE POLICY "Usuários podem inserir suas próprias avarias"
  ON avarias
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Política: Usuários podem atualizar suas próprias avarias
CREATE POLICY "Usuários podem atualizar suas próprias avarias"
  ON avarias
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Política: Usuários podem deletar suas próprias avarias
CREATE POLICY "Usuários podem deletar suas próprias avarias"
  ON avarias
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Comentários
COMMENT ON TABLE avarias IS 'Registros de produtos com avaria que não retornam ao estoque';
COMMENT ON COLUMN avarias.user_id IS 'ID do usuário/operador que registrou a avaria';
COMMENT ON COLUMN avarias.venda_id IS 'ID da venda original (se vier de devolução)';
COMMENT ON COLUMN avarias.motivo IS 'Motivo da avaria: Produto danificado, Vencido, Defeito de fabricação, etc';
