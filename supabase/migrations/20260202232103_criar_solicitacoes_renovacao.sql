-- Migration: Criar tabela de solicitações de renovação
-- Permite que usuários solicitem renovação e admins aprovem/recusem

CREATE TABLE IF NOT EXISTS solicitacoes_renovacao (
  id TEXT PRIMARY KEY DEFAULT ('sol_' || substr(md5(random()::text), 1, 16)),
  operador_id TEXT NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_solicitados INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  mensagem_admin TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  admin_responsavel_id TEXT REFERENCES operadores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes_renovacao(data_solicitacao DESC);

-- RLS (Row Level Security)
ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas suas próprias solicitações
CREATE POLICY "Usuarios podem ver suas solicitacoes"
  ON solicitacoes_renovacao
  FOR SELECT
  USING (
    operador_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.id = solicitacoes_renovacao.operador_id
    )
  );

-- Política: Admins podem ver todas as solicitações
CREATE POLICY "Admins podem ver todas solicitacoes"
  ON solicitacoes_renovacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- Política: Usuários podem criar solicitações
CREATE POLICY "Usuarios podem criar solicitacoes"
  ON solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (
    operador_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.id = operador_id
    )
  );

-- Política: Apenas admins podem atualizar solicitações (aprovar/recusar)
CREATE POLICY "Admins podem atualizar solicitacoes"
  ON solicitacoes_renovacao
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_solicitacoes_renovacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER solicitacoes_renovacao_updated_at
  BEFORE UPDATE ON solicitacoes_renovacao
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_renovacao_updated_at();

COMMENT ON TABLE solicitacoes_renovacao IS 'Solicitações de renovação de assinatura dos usuários';
