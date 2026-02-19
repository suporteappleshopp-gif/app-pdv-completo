-- Migration: Corrigir função aprovar_renovacao para SOMAR dias ao invés de substituir
-- Quando admin aprova renovação, os novos dias devem ser SOMADOS aos dias já existentes

-- ========================================
-- FUNÇÃO CORRIGIDA: Aprovar Renovação
-- ========================================
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
  v_dias_atuais INTEGER;
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

  -- ✅ CALCULAR NOVOS DIAS (SOMAR COM OS DIAS EXISTENTES)
  -- Se data_proximo_vencimento é no futuro, somar a partir dela
  -- Se é no passado ou nula, somar a partir de hoje
  IF v_operador.data_proximo_vencimento IS NULL OR v_operador.data_proximo_vencimento < NOW() THEN
    -- Não tinha dias válidos, começar do zero
    v_nova_data_vencimento := NOW() + (v_solicitacao.dias_solicitados || ' days')::INTERVAL;
    v_novos_dias := v_solicitacao.dias_solicitados;
  ELSE
    -- Tinha dias válidos, SOMAR os novos dias
    v_nova_data_vencimento := v_operador.data_proximo_vencimento + (v_solicitacao.dias_solicitados || ' days')::INTERVAL;
    -- Calcular total de dias (dias restantes + novos dias)
    v_novos_dias := EXTRACT(DAY FROM (v_nova_data_vencimento - NOW()))::INTEGER;
  END IF;

  -- Pegar dias_assinatura atuais (total histórico de dias comprados)
  v_dias_atuais := COALESCE(v_operador.dias_assinatura, 0);

  -- ✅ ATUALIZAR OPERADOR: SOMAR DIAS AO INVÉS DE SUBSTITUIR
  UPDATE operadores
  SET
    data_proximo_vencimento = v_nova_data_vencimento,
    dias_assinatura = v_dias_atuais + v_solicitacao.dias_solicitados,  -- ✅ SOMA os dias
    dias_restantes = v_novos_dias,  -- ✅ Atualiza dias restantes
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
    'dias_adicionados', v_solicitacao.dias_solicitados,
    'total_dias_comprados', v_dias_atuais + v_solicitacao.dias_solicitados,
    'nova_data_vencimento', v_nova_data_vencimento
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION aprovar_renovacao IS 'Função corrigida para SOMAR dias ao invés de substituir';
