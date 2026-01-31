-- =========================================================================
-- SISTEMA DE ASSINATURA POR DIAS
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
  ADD COLUMN IF NOT EXISTS historico_compras JSONB DEFAULT '[]'::jsonb;

-- PASSO 3: Atualizar campos existentes para o novo sistema
ALTER TABLE public.operadores
  ALTER COLUMN aguardando_pagamento SET DEFAULT true,
  ALTER COLUMN ativo SET DEFAULT false,
  ALTER COLUMN suspenso SET DEFAULT true,
  ALTER COLUMN dias_assinatura DROP DEFAULT;

-- PASSO 4: Remover campo valor_mensal (não é mais mensalidade)
ALTER TABLE public.operadores DROP COLUMN IF EXISTS valor_mensal;
ALTER TABLE public.operadores DROP COLUMN IF EXISTS data_proximo_vencimento;

-- PASSO 5: Renomear/ajustar campos
ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMPTZ;

-- PASSO 6: Criar função para calcular status do usuário
CREATE OR REPLACE FUNCTION public.calculate_user_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem dias restantes, está ativo
  IF NEW.dias_restantes > 0 THEN
    NEW.ativo := true;
    NEW.suspenso := false;
    NEW.aguardando_pagamento := false;

    -- Calcular data de expiração
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

-- PASSO 7: Criar trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS update_user_status ON public.operadores;
CREATE TRIGGER update_user_status
  BEFORE INSERT OR UPDATE OF dias_restantes
  ON public.operadores
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_user_status();

-- PASSO 8: Criar função para adicionar dias comprados
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
  -- Criar registro da compra
  v_compra := jsonb_build_object(
    'data', NOW(),
    'dias', p_dias,
    'valor', p_valor,
    'forma_pagamento', p_forma_pagamento
  );

  -- Atualizar operador
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

-- PASSO 9: Criar função para decrementar dias (executar diariamente via cron job)
CREATE OR REPLACE FUNCTION public.decrement_subscription_days()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Decrementar 1 dia de todos os usuários ativos
  UPDATE public.operadores
  SET dias_restantes = GREATEST(dias_restantes - 1, 0)
  WHERE dias_restantes > 0
    AND ativo = true;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- PASSO 10: Comentários e documentação
COMMENT ON COLUMN public.operadores.dias_restantes IS 'Dias restantes de assinatura ativa';
COMMENT ON COLUMN public.operadores.total_dias_comprados IS 'Total acumulado de dias comprados';
COMMENT ON COLUMN public.operadores.historico_compras IS 'Histórico JSON de todas as compras (data, dias, valor)';
COMMENT ON COLUMN public.operadores.data_expiracao IS 'Data de expiração da assinatura atual';
COMMENT ON FUNCTION public.add_subscription_days IS 'Adiciona dias comprados ao operador (59.90 = 60d | 149.70 = 180d)';
COMMENT ON FUNCTION public.decrement_subscription_days IS 'Decrementa 1 dia de todos os usuários ativos (executar diariamente)';

-- PASSO 11: Verificação final
SELECT
  COUNT(*) as total_operadores,
  COUNT(*) FILTER (WHERE ativo = true) as ativos,
  COUNT(*) FILTER (WHERE aguardando_pagamento = true) as aguardando_pagamento
FROM public.operadores;
