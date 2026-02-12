-- Migration: Criar tabelas de histórico de pagamentos e solicitações de renovação
-- Permite rastreamento completo de pagamentos e renovações com atualização em tempo real

-- ========================================
-- TABELA: historico_pagamentos
-- ========================================
CREATE TABLE IF NOT EXISTS historico_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  tipo_pagamento TEXT NOT NULL, -- 'inicial', 'renovacao-60', 'renovacao-180'
  forma_pagamento TEXT NOT NULL, -- 'pix', 'cartao'
  valor DECIMAL(10,2) NOT NULL,
  dias_comprados INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'recusado'
  data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
  data_aprovacao TIMESTAMPTZ,
  aprovado_por UUID REFERENCES operadores(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_operador_id ON historico_pagamentos(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_status ON historico_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_data_solicitacao ON historico_pagamentos(data_solicitacao DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_historico_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS historico_pagamentos_updated_at ON historico_pagamentos;
CREATE TRIGGER historico_pagamentos_updated_at
BEFORE UPDATE ON historico_pagamentos
FOR EACH ROW EXECUTE FUNCTION update_historico_pagamentos_updated_at();

-- ========================================
-- TABELA: solicitacoes_renovacao
-- ========================================
CREATE TABLE IF NOT EXISTS solicitacoes_renovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL, -- 'pix', 'cartao'
  valor DECIMAL(10,2) NOT NULL,
  dias_solicitados INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'recusado'
  comprovante_url TEXT,
  observacoes TEXT,
  data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
  data_aprovacao TIMESTAMPTZ,
  aprovado_por UUID REFERENCES operadores(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_renovacao_operador_id ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_renovacao_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_renovacao_data ON solicitacoes_renovacao(data_solicitacao DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_solicitacoes_renovacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS solicitacoes_renovacao_updated_at ON solicitacoes_renovacao;
CREATE TRIGGER solicitacoes_renovacao_updated_at
BEFORE UPDATE ON solicitacoes_renovacao
FOR EACH ROW EXECUTE FUNCTION update_solicitacoes_renovacao_updated_at();

-- ========================================
-- RLS POLICIES - historico_pagamentos
-- ========================================
ALTER TABLE historico_pagamentos ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments"
ON historico_pagamentos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);

-- Usuários podem ver seus próprios pagamentos
CREATE POLICY "Users can view own payments"
ON historico_pagamentos FOR SELECT
TO authenticated
USING (
  operador_id IN (
    SELECT id FROM operadores WHERE auth_user_id = auth.uid()
  )
);

-- Permitir inserção pública (para cadastro sem auth)
CREATE POLICY "Allow public insert payments"
ON historico_pagamentos FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Apenas admins podem atualizar pagamentos
CREATE POLICY "Admins can update payments"
ON historico_pagamentos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);

-- ========================================
-- RLS POLICIES - solicitacoes_renovacao
-- ========================================
ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as solicitações
CREATE POLICY "Admins can view all renewal requests"
ON solicitacoes_renovacao FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);

-- Usuários podem ver suas próprias solicitações
CREATE POLICY "Users can view own renewal requests"
ON solicitacoes_renovacao FOR SELECT
TO authenticated
USING (
  operador_id IN (
    SELECT id FROM operadores WHERE auth_user_id = auth.uid()
  )
);

-- Usuários autenticados podem criar solicitações
CREATE POLICY "Authenticated users can create renewal requests"
ON solicitacoes_renovacao FOR INSERT
TO authenticated
WITH CHECK (
  operador_id IN (
    SELECT id FROM operadores WHERE auth_user_id = auth.uid()
  )
);

-- Apenas admins podem atualizar solicitações
CREATE POLICY "Admins can update renewal requests"
ON solicitacoes_renovacao FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM operadores
    WHERE operadores.auth_user_id = auth.uid()
    AND operadores.is_admin = true
  )
);

-- ========================================
-- FUNÇÃO: Aprovar Renovação
-- ========================================
-- Esta função é chamada quando admin aprova uma renovação
-- Atualiza os dias do operador e marca como aprovado
CREATE OR REPLACE FUNCTION aprovar_renovacao(
  p_solicitacao_id UUID,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_solicitacao RECORD;
  v_operador RECORD;
  v_novos_dias INTEGER;
  v_nova_data_vencimento TIMESTAMPTZ;
BEGIN
  -- Buscar a solicitação
  SELECT * INTO v_solicitacao
  FROM solicitacoes_renovacao
  WHERE id = p_solicitacao_id
  AND status = 'pendente';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada ou já processada');
  END IF;

  -- Buscar o operador
  SELECT * INTO v_operador
  FROM operadores
  WHERE id = v_solicitacao.operador_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Operador não encontrado');
  END IF;

  -- Calcular novos dias
  -- Se data_proximo_vencimento é no futuro, somar a partir dela
  -- Se é no passado ou nula, somar a partir de hoje
  IF v_operador.data_proximo_vencimento IS NULL OR v_operador.data_proximo_vencimento < NOW() THEN
    v_nova_data_vencimento := NOW() + (v_solicitacao.dias_solicitados || ' days')::INTERVAL;
    v_novos_dias := v_solicitacao.dias_solicitados;
  ELSE
    v_nova_data_vencimento := v_operador.data_proximo_vencimento + (v_solicitacao.dias_solicitados || ' days')::INTERVAL;
    -- Calcular dias restantes + novos dias
    v_novos_dias := EXTRACT(DAY FROM (v_nova_data_vencimento - NOW()))::INTEGER;
  END IF;

  -- Atualizar operador
  UPDATE operadores
  SET
    data_proximo_vencimento = v_nova_data_vencimento,
    dias_assinatura = v_solicitacao.dias_solicitados,
    ativo = true,
    suspenso = false,
    aguardando_pagamento = false,
    data_pagamento = NOW(),
    updated_at = NOW()
  WHERE id = v_solicitacao.operador_id;

  -- Marcar solicitação como aprovada
  UPDATE solicitacoes_renovacao
  SET
    status = 'aprovado',
    data_resposta = NOW(),
    admin_responsavel_id = p_admin_id,
    updated_at = NOW()
  WHERE id = p_solicitacao_id;

  -- Criar registro no histórico
  INSERT INTO historico_pagamentos (
    operador_id,
    tipo_pagamento,
    forma_pagamento,
    valor,
    dias_comprados,
    status,
    data_solicitacao,
    data_aprovacao,
    aprovado_por
  ) VALUES (
    v_solicitacao.operador_id,
    CASE
      WHEN v_solicitacao.dias_solicitados = 60 THEN 'renovacao-60'
      WHEN v_solicitacao.dias_solicitados = 180 THEN 'renovacao-180'
      ELSE 'renovacao'
    END,
    v_solicitacao.forma_pagamento,
    v_solicitacao.valor,
    v_solicitacao.dias_solicitados,
    'aprovado',
    v_solicitacao.data_solicitacao,
    NOW(),
    p_admin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Renovação aprovada com sucesso',
    'novos_dias', v_novos_dias,
    'nova_data_vencimento', v_nova_data_vencimento
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENABLE REALTIME
-- ========================================
-- Habilitar Realtime para as tabelas (se ainda não estiverem)
DO $$
BEGIN
  -- Adicionar historico_pagamentos se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'historico_pagamentos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE historico_pagamentos;
  END IF;

  -- Adicionar solicitacoes_renovacao se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'solicitacoes_renovacao'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes_renovacao;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE historico_pagamentos IS 'Histórico completo de pagamentos dos operadores';
COMMENT ON TABLE solicitacoes_renovacao IS 'Solicitações de renovação de assinatura';
COMMENT ON FUNCTION aprovar_renovacao IS 'Função para aprovar renovações e creditar dias automaticamente';
