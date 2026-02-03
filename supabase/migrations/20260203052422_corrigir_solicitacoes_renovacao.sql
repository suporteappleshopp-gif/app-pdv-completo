-- =========================================================================
-- CORRIGIR TABELA DE SOLICITAÇÕES DE RENOVAÇÃO
-- Remove a tabela anterior e recria com a estrutura correta
-- =========================================================================

-- Remover tabela anterior se existir
DROP TABLE IF EXISTS public.solicitacoes_renovacao CASCADE;

-- Criar tabela de solicitações com estrutura correta
CREATE TABLE public.solicitacoes_renovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_solicitados INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  mensagem_admin TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  admin_responsavel_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign keys DEPOIS de criar a tabela
ALTER TABLE public.solicitacoes_renovacao
  ADD CONSTRAINT solicitacoes_renovacao_operador_id_fkey
  FOREIGN KEY (operador_id)
  REFERENCES public.operadores(id)
  ON DELETE CASCADE;

ALTER TABLE public.solicitacoes_renovacao
  ADD CONSTRAINT solicitacoes_renovacao_admin_responsavel_id_fkey
  FOREIGN KEY (admin_responsavel_id)
  REFERENCES public.operadores(id)
  ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_solicitacoes_operador ON public.solicitacoes_renovacao(operador_id);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes_renovacao(status);
CREATE INDEX idx_solicitacoes_data ON public.solicitacoes_renovacao(data_solicitacao DESC);

-- Comentário descritivo
COMMENT ON TABLE public.solicitacoes_renovacao IS 'Solicitações de renovação de assinatura dos usuários';

-- =========================================================================
-- RLS (Row Level Security)
-- =========================================================================

-- Habilitar RLS
ALTER TABLE public.solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários podem ver apenas suas próprias solicitações
CREATE POLICY "Usuarios podem ver suas solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.id = solicitacoes_renovacao.operador_id
      AND operadores.auth_user_id = auth.uid()
    )
  );

-- Política 2: Admins podem ver todas as solicitações
CREATE POLICY "Admins podem ver todas solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- Política 3: Usuários podem criar suas próprias solicitações
CREATE POLICY "Usuarios podem criar solicitacoes"
  ON public.solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.id = operador_id
      AND operadores.auth_user_id = auth.uid()
    )
  );

-- Política 4: Apenas admins podem atualizar solicitações (aprovar/recusar)
CREATE POLICY "Admins podem atualizar solicitacoes"
  ON public.solicitacoes_renovacao
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- =========================================================================
-- TRIGGERS
-- =========================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_solicitacoes_renovacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS solicitacoes_renovacao_updated_at ON public.solicitacoes_renovacao;

CREATE TRIGGER solicitacoes_renovacao_updated_at
  BEFORE UPDATE ON public.solicitacoes_renovacao
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_renovacao_updated_at();

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
