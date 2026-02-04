// Script para aplicar migration de suspensão automática
// Execute via Supabase SQL Editor

console.log(`
=============================================================
🚀 MIGRATION: SUSPENSÃO AUTOMÁTICA DE USUÁRIOS VENCIDOS
=============================================================

Para aplicar esta migration, siga os passos:

1. Acesse: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/editor

2. Cole o SQL abaixo no SQL Editor e execute:

`);

const migrationSQL = `
-- =====================================================
-- SUSPENSÃO AUTOMÁTICA DE USUÁRIOS VENCIDOS
-- =====================================================

-- 1. CRIAR FUNÇÃO
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

-- 2. CRIAR EXTENSÃO pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. AGENDAR EXECUÇÃO (a cada 5 minutos)
SELECT cron.schedule(
  'suspender-usuarios-vencidos',
  '*/5 * * * *',
  $$SELECT public.suspender_usuarios_vencidos()$$
);

-- 4. EXECUTAR IMEDIATAMENTE
SELECT public.suspender_usuarios_vencidos();

-- 5. DOCUMENTAÇÃO
COMMENT ON FUNCTION public.suspender_usuarios_vencidos() IS
'Suspende automaticamente usuários cujo prazo de assinatura expirou. Executa a cada 5 minutos via pg_cron.';
`;

console.log(migrationSQL);

console.log(`
=============================================================
✅ Após executar, a suspensão automática estará ativa!
⏰ Usuários vencidos serão verificados a cada 5 minutos
=============================================================
`);
