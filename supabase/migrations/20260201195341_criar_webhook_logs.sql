-- Tabela para registrar todos os webhooks do Mercado Pago
-- Permite rastreamento completo e debug de pagamentos

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- "recebimento", "sucesso", "erro", "duplicado", etc
  payment_id TEXT, -- ID do pagamento no Mercado Pago
  usuario_id TEXT, -- ID do usuário relacionado
  status TEXT NOT NULL, -- "recebido", "processado", "erro", etc
  dados_completos JSONB NOT NULL, -- Todos os dados da requisição/resposta
  erro TEXT, -- Mensagem de erro se houver
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_usuario_id ON webhook_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tipo ON webhook_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Permitir que o service role insira logs (webhook não autentica usuário)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode inserir (webhook público)
CREATE POLICY "Permitir inserção de logs de webhook"
  ON webhook_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política: Apenas operadores autenticados podem ver os logs
CREATE POLICY "Operadores podem ver logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Comentários para documentação
COMMENT ON TABLE webhook_logs IS 'Registro de todos os webhooks recebidos do Mercado Pago para auditoria e debug';
COMMENT ON COLUMN webhook_logs.tipo IS 'Tipo do log: recebimento, sucesso, erro, duplicado, pagamento_obtido, etc';
COMMENT ON COLUMN webhook_logs.payment_id IS 'ID do pagamento no Mercado Pago';
COMMENT ON COLUMN webhook_logs.usuario_id IS 'ID do usuário relacionado ao pagamento';
COMMENT ON COLUMN webhook_logs.status IS 'Status do processamento: recebido, processado, erro, etc';
COMMENT ON COLUMN webhook_logs.dados_completos IS 'Dados completos da requisição/resposta em formato JSON';
COMMENT ON COLUMN webhook_logs.erro IS 'Mensagem de erro se o processamento falhou';
