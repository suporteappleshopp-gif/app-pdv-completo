-- =====================================================
-- SUSPENSÃO AUTOMÁTICA DE USUÁRIOS VENCIDOS
-- =====================================================
-- Este script garante que usuários com prazo vencido
-- sejam automaticamente suspensos sem precisar tentar usar o sistema
-- =====================================================

-- 1. CRIAR FUNÇÃO QUE SUSPENDE USUÁRIOS VENCIDOS
CREATE OR REPLACE FUNCTION public.suspender_usuarios_vencidos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar todos os usuários que:
  -- 1. Têm data de vencimento definida
  -- 2. A data de vencimento já passou (< NOW())
  -- 3. Ainda estão com ativo = true ou suspenso = false
  UPDATE public.operadores
  SET
    ativo = false,
    suspenso = true,
    aguardando_pagamento = true,
    updated_at = NOW()
  WHERE
    data_proximo_vencimento IS NOT NULL
    AND data_proximo_vencimento < NOW()
    AND (ativo = true OR suspenso = false)
    AND is_admin = false; -- Não suspender admins

  -- Log para debug
  RAISE NOTICE 'Usuários vencidos suspensos automaticamente';
END;
$$;

-- 2. CRIAR EXTENSÃO pg_cron SE NÃO EXISTIR
-- (Necessária para agendamento de tarefas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. AGENDAR A FUNÇÃO PARA RODAR A CADA 5 MINUTOS
-- Isso garante que usuários vencidos sejam suspensos rapidamente
SELECT cron.schedule(
  'suspender-usuarios-vencidos', -- nome do job
  '*/5 * * * *',                 -- a cada 5 minutos
  $$SELECT public.suspender_usuarios_vencidos()$$
);

-- 4. EXECUTAR IMEDIATAMENTE UMA VEZ PARA LIMPAR USUÁRIOS JÁ VENCIDOS
SELECT public.suspender_usuarios_vencidos();

-- 5. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON FUNCTION public.suspender_usuarios_vencidos() IS
'Suspende automaticamente usuários cujo prazo de assinatura expirou. Executa a cada 5 minutos via pg_cron.';
