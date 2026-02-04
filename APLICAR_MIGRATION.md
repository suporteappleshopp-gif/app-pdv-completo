# 🚀 Como Aplicar a Migration de Suspensão Automática

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard
- Vá em: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk
- Faça login se necessário

### 2. Abra o SQL Editor
- No menu lateral, clique em **SQL Editor**
- Clique em **New query**

### 3. Cole o SQL da Migration
Copie TODO o conteúdo do arquivo abaixo e cole no editor SQL:

**Arquivo:** `supabase/migrations/20260204225507_auto_suspender_usuarios_vencidos.sql`

```sql
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
    AND is_admin = false;

  RAISE NOTICE 'Usuários vencidos suspensos automaticamente';
END;
$$;

-- 2. CRIAR EXTENSÃO pg_cron SE NÃO EXISTIR
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. AGENDAR A FUNÇÃO PARA RODAR A CADA 5 MINUTOS
SELECT cron.schedule(
  'suspender-usuarios-vencidos',
  '*/5 * * * *',
  $$SELECT public.suspender_usuarios_vencidos()$$
);

-- 4. EXECUTAR IMEDIATAMENTE UMA VEZ PARA LIMPAR USUÁRIOS JÁ VENCIDOS
SELECT public.suspender_usuarios_vencidos();

-- 5. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON FUNCTION public.suspender_usuarios_vencidos() IS
'Suspende automaticamente usuários cujo prazo de assinatura expirou. Executa a cada 5 minutos via pg_cron.';
```

### 4. Execute o SQL
- Clique no botão **Run** (ou pressione Ctrl+Enter)
- Aguarde a confirmação de sucesso

## ✅ O Que Será Criado

### 🔧 Função `suspender_usuarios_vencidos()`
- Verifica todos os operadores com `data_proximo_vencimento` no passado
- Marca como `ativo = false`, `suspenso = true`, `aguardando_pagamento = true`
- Não afeta administradores (is_admin = true)

### ⏰ Agendamento Automático
- A função roda automaticamente **a cada 5 minutos**
- Usa a extensão `pg_cron` do Supabase
- Não precisa de servidor externo ou cron job manual

### 🎯 Execução Imediata
- O script executa a função uma vez imediatamente
- Suspende usuários que já estão vencidos agora mesmo

## 🔍 Como Verificar se Funcionou

Execute este SQL no SQL Editor para ver o agendamento ativo:

```sql
SELECT * FROM cron.job WHERE jobname = 'suspender-usuarios-vencidos';
```

## 📊 Testar Manualmente

Para testar a suspensão manualmente a qualquer momento:

```sql
SELECT public.suspender_usuarios_vencidos();
```

## 🎉 Pronto!

Após executar, o sistema vai:
- ✅ Suspender automaticamente usuários vencidos a cada 5 minutos
- ✅ Marcar como aguardando pagamento
- ✅ Desativar o acesso sem que eles precisem tentar entrar no sistema
