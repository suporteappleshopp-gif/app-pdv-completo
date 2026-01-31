-- =========================================================================
-- SISTEMA DE ASSINATURA POR DIAS - CORRIGIDO
-- Valores: R$ 59,90 (60 dias) | R$ 149,70 (180 dias)
-- Sistema automático de compra e soma de dias
-- =========================================================================

-- PASSO 1: LIMPAR TODOS OS CADASTROS (começar do zero)
DELETE FROM public.operadores;

-- PASSO 2: Adicionar colunas necessárias (se não existirem)
ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS dias_restantes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_ultima_compra TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_dias_comprados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historico_compras JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMPTZ;

-- PASSO 3: Atualizar campos existentes para o novo sistema
ALTER TABLE public.operadores
  ALTER COLUMN aguardando_pagamento SET DEFAULT true,
  ALTER COLUMN ativo SET DEFAULT false,
  ALTER COLUMN suspenso SET DEFAULT true;

-- PASSO 4: Remover colunas antigas (se existirem)
ALTER TABLE public.operadores DROP COLUMN IF EXISTS valor_mensal;
ALTER TABLE public.operadores DROP COLUMN IF EXISTS data_proximo_vencimento;
ALTER TABLE public.operadores DROP COLUMN IF EXISTS dias_assinatura;
ALTER TABLE public.operadores DROP COLUMN IF EXISTS data_pagamento;

-- PASSO 5: Criar função para calcular status do usuário
CREATE OR REPLACE FUNCTION public.calculate_user_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem dias restantes, está ativo
  IF NEW.dias_restantes > 0 THEN
    NEW.ativo := true;
    NEW.suspenso := false;
    NEW.aguardando_pagamento := false;
    NEW.data_expiracao := NOW() + (NEW.dias_restantes || ' days')::interval;
  ELSE
    -- Sem dias = inativo
    NEW.ativo := false;
    NEW.suspenso := true;
    NEW.aguardando_pagamento := true;
    NEW.data_expiracao := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 6: Criar trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS update_user_status ON public.operadores;
CREATE TRIGGER update_user_status
  BEFORE INSERT OR UPDATE OF dias_restantes
  ON public.operadores
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_user_status();

-- PASSO 7: Criar função para adicionar dias comprados
CREATE OR REPLACE FUNCTION public.add_subscription_days(
  p_operador_id UUID,
  p_dias INTEGER,
  p_valor NUMERIC,
  p_forma_pagamento TEXT
)
RETURNS VOID AS $$
DECLARE
  v_compra JSONB;
BEGIN
  v_compra := jsonb_build_object(
    'data', NOW(),
    'dias', p_dias,
    'valor', p_valor,
    'forma_pagamento', p_forma_pagamento
  );

  UPDATE public.operadores
  SET
    dias_restantes = COALESCE(dias_restantes, 0) + p_dias,
    total_dias_comprados = COALESCE(total_dias_comprados, 0) + p_dias,
    data_ultima_compra = NOW(),
    historico_compras = COALESCE(historico_compras, '[]'::jsonb) || v_compra,
    forma_pagamento = p_forma_pagamento
  WHERE id = p_operador_id;
END;
$$ LANGUAGE plpgsql;

-- PASSO 8: Criar função para decrementar dias (executar diariamente)
CREATE OR REPLACE FUNCTION public.decrement_subscription_days()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.operadores
  SET dias_restantes = GREATEST(dias_restantes - 1, 0)
  WHERE dias_restantes > 0 AND ativo = true;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Verificação final
SELECT
  COUNT(*) as total_operadores,
  COUNT(*) FILTER (WHERE ativo = true) as ativos,
  COUNT(*) FILTER (WHERE aguardando_pagamento = true) as aguardando_pagamento
FROM public.operadores;
