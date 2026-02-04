-- =====================================================
-- ⚠️ EXECUTAR ESTE SCRIPT NO SUPABASE SQL EDITOR
-- =====================================================
-- 1. Acesse: https://supabase.com/dashboard/project/SEU_PROJECT_ID/sql
-- 2. Cole este código completo
-- 3. Clique em "RUN" para executar
-- =====================================================

-- PASSO 1: SUSPENDER TODOS OS USUÁRIOS JÁ VENCIDOS IMEDIATAMENTE
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
  AND is_admin = false;

-- PASSO 2: CRIAR FUNÇÃO QUE SUSPENDE AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.suspender_usuarios_vencidos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    AND is_admin = false;

  RAISE NOTICE 'Usuários vencidos suspensos automaticamente';
END;
$$;

-- PASSO 3: HABILITAR EXTENSÃO pg_cron (para agendamento automático)
-- Se der erro, ignore - alguns planos do Supabase não têm pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- PASSO 4: AGENDAR PARA RODAR A CADA 5 MINUTOS (se pg_cron disponível)
-- Se der erro, ignore - a verificação manual funcionará
DO $$
BEGIN
  PERFORM cron.schedule(
    'suspender-usuarios-vencidos',
    '*/5 * * * *',
    $$SELECT public.suspender_usuarios_vencidos()$$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron não disponível - usar verificação manual';
END $$;

-- ✅ PRONTO! Agora usuários vencidos serão suspensos automaticamente
-- Se pg_cron não estiver disponível, a suspensão acontecerá quando
-- o usuário tentar usar o sistema (verificação em tempo real já está implementada)
