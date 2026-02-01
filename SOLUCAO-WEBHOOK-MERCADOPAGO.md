# Solução: Webhook Mercado Pago - Erro 404

## 🔴 Problema Identificado

O pagamento do usuário **joelmamoura2** (R$ 59,90 - 60 dias) foi aprovado no Mercado Pago, mas **não foi creditado automaticamente** no sistema.

### Dados do Pagamento
- **Payment ID**: 144403884360
- **Valor**: R$ 59,90
- **Plano**: 60 dias (PIX)
- **Data**: 01/02/2026, 19:35:04 UTC
- **Status no Mercado Pago**: ✅ Aprovado
- **Status no Sistema**: ❌ Não recebido

### Causa Raiz

O erro **404 (Falha na entrega)** indica que o Mercado Pago tentou enviar a notificação de pagamento, mas a **URL do webhook está incorreta** no painel do Mercado Pago.

Possíveis URLs incorretas:
- ❌ `https://app-pdv-completo.vercel.apebhook/mercadopago` (typo no domínio)
- ❌ `https://app-pdv-completo.vercel.app/webhook/mercadopago` (falta /api/)
- ❌ URLs com caracteres extras ou incompletas

**URL correta que deve estar configurada:**
```
✅ https://app-pdv-completo.vercel.app/api/webhook/mercadopago
```

---

## ✅ Solução Implementada

### 1. Sistema de Logs de Auditoria

Criamos uma tabela `webhook_logs` que registra **todas** as tentativas de webhook do Mercado Pago:

**Tabela: `webhook_logs`**
```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY,
  tipo TEXT NOT NULL,           -- "recebimento", "sucesso", "erro", etc
  payment_id TEXT,              -- ID do pagamento no MP
  usuario_id TEXT,              -- ID do usuário
  status TEXT NOT NULL,         -- "recebido", "processado", "erro"
  dados_completos JSONB NOT NULL, -- Dados completos da requisição
  erro TEXT,                    -- Mensagem de erro (se houver)
  created_at TIMESTAMPTZ
);
```

**Como usar:**
```bash
# Ver todos os logs de um pagamento específico
curl "https://app-pdv-completo.vercel.app/api/webhook/verificar-logs?payment_id=144403884360"

# Ver logs de um usuário
curl "https://app-pdv-completo.vercel.app/api/webhook/verificar-logs?usuario_id=USER_ID"

# Ver últimos 100 logs
curl "https://app-pdv-completo.vercel.app/api/webhook/verificar-logs?limit=100"
```

### 2. Endpoint de Reprocessamento Manual

Criamos um endpoint para reprocessar pagamentos que falharam:

**Endpoint: `/api/webhook/reprocessar-pagamento`**

```bash
# Reprocessar o pagamento do joelmamoura2
curl -X POST https://app-pdv-completo.vercel.app/api/webhook/reprocessar-pagamento \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "144403884360"}'
```

Este endpoint:
- ✅ Busca o pagamento no Mercado Pago
- ✅ Verifica se foi aprovado
- ✅ Credita os dias na conta do usuário
- ✅ Registra no histórico de pagamentos
- ✅ Registra nos ganhos do admin
- ✅ Salva log de auditoria

### 3. Melhorias no Webhook

O webhook agora:
- ✅ Registra **todas** as requisições recebidas (mesmo erros)
- ✅ Captura headers, URL, body completo
- ✅ Identifica erros de token, usuário não encontrado, etc
- ✅ Retorna informações detalhadas no GET para debug
- ✅ Evita duplicação de créditos

---

## 🚀 Como Resolver AGORA

### Passo 1: Executar a Migration

**Opção A: Via SQL Editor do Supabase** (RECOMENDADO)
1. Acesse: https://supabase.com/dashboard/project/_/sql
2. Cole o conteúdo do arquivo: `executar-migration-webhook-logs.sql`
3. Clique em "Run"

**Opção B: Via arquivo SQL**
```bash
# O arquivo está em: /workspace/executar-migration-webhook-logs.sql
```

### Passo 2: Reprocessar o Pagamento do joelmamoura2

Execute o script de verificação e reprocessamento:

```bash
./verificar-pagamento-joelmamoura2.sh
```

Ou execute manualmente:

```bash
curl -X POST https://app-pdv-completo.vercel.app/api/webhook/reprocessar-pagamento \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "144403884360"}'
```

### Passo 3: Corrigir a URL do Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/settings/account/webhooks
2. Localize o webhook cadastrado
3. **VERIFIQUE SE A URL ESTÁ CORRETA:**
   ```
   ✅ https://app-pdv-completo.vercel.app/api/webhook/mercadopago
   ```
4. Se estiver incorreta, **edite** e salve a URL correta
5. Teste o webhook clicando em "Testar webhook"

---

## 🔍 Como Verificar se Está Funcionando

### 1. Testar o Webhook (GET)
```bash
curl https://app-pdv-completo.vercel.app/api/webhook/mercadopago
```

**Resposta esperada:**
```json
{
  "status": "Webhook Mercado Pago ativo e funcionando",
  "message": "Use POST para enviar notificações de pagamento",
  "timestamp": "2026-02-01T...",
  "url_correta": "https://app-pdv-completo.vercel.app/api/webhook/mercadopago",
  "instrucoes": { ... }
}
```

### 2. Ver Logs de Webhooks
```bash
curl "https://app-pdv-completo.vercel.app/api/webhook/verificar-logs?limit=10"
```

### 3. Fazer um Pagamento de Teste

1. No painel do Mercado Pago, crie um pagamento de teste
2. Aguarde a notificação do webhook
3. Verifique nos logs se a notificação foi recebida
4. Confirme que os dias foram creditados automaticamente

---

## 📋 Checklist de Implementação

- [x] ✅ Sistema de logs de auditoria criado
- [x] ✅ Endpoint de reprocessamento criado
- [x] ✅ Webhook melhorado com rastreamento completo
- [x] ✅ Script de verificação criado
- [x] ✅ Migration SQL gerada
- [ ] ⏳ **VOCÊ PRECISA**: Executar a migration no Supabase
- [ ] ⏳ **VOCÊ PRECISA**: Reprocessar o pagamento do joelmamoura2
- [ ] ⏳ **VOCÊ PRECISA**: Corrigir URL do webhook no Mercado Pago

---

## 🛡️ Garantias Implementadas

1. **Sem duplicação**: O sistema verifica se o pagamento já foi processado antes de creditar
2. **Logs permanentes**: Todas as tentativas de webhook ficam registradas
3. **Reprocessamento seguro**: Pode reprocessar sem risco de duplicar créditos
4. **Rastreamento completo**: Headers, body, erros - tudo é registrado
5. **Debug facilitado**: Endpoints dedicados para verificar logs e status

---

## 📞 Próximas Ações

1. **IMEDIATO**: Execute a migration e reprocesse o pagamento do joelmamoura2
2. **IMPORTANTE**: Corrija a URL do webhook no painel do Mercado Pago
3. **TESTE**: Faça um pagamento de teste para confirmar que está funcionando
4. **MONITORE**: Use o endpoint de logs para monitorar futuras notificações

---

## 🔗 Links Úteis

- **Painel Webhooks Mercado Pago**: https://www.mercadopago.com.br/settings/account/webhooks
- **Documentação Webhooks**: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- **Verificar Logs**: `GET /api/webhook/verificar-logs`
- **Reprocessar Pagamento**: `POST /api/webhook/reprocessar-pagamento`
- **Status Webhook**: `GET /api/webhook/mercadopago`

---

**Data da Solução**: 01/02/2026
**Desenvolvido por**: Lasy AI
