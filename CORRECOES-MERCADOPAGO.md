# 🔧 Correções do Webhook Mercado Pago

## ❌ Problema Identificado

Os webhooks estão falhando com erro **404** porque:

1. **URL de teste está incorreta** (tem erro de digitação)
2. **O código do webhook estava demorando para responder**, causando timeout

---

## ✅ Correções Aplicadas no Código

### 1. Resposta Imediata (200 OK)
- O webhook agora responde **imediatamente** com status 200
- O processamento do pagamento acontece em **background**
- Isso evita timeout do Mercado Pago

### 2. Headers Adequados
- Adicionados headers corretos para o Mercado Pago
- Suporte a CORS e preflight requests

### 3. Configuração de Runtime
- Runtime otimizado para Vercel
- Timeout configurado para 30 segundos

---

## 📝 O que VOCÊ precisa fazer no Mercado Pago

### 1. Corrigir URL de Teste (CRÍTICO!)

Acesse: https://www.mercadopago.com.br/developers/panel/notifications/ipn

**URL ERRADA (atual):**
```
https://app-pdv-completo.vercel.apebhook/mercadopago
```

**URL CORRETA:**
```
https://app-pdv-completo.vercel.app/api/webhook/mercadopago
```

⚠️ **Atenção:** Faltam as letras "i/api/w" no meio da URL de teste!

---

### 2. Verificar URLs em Produção e Teste

#### Produção (Live Mode)
```
✅ URL: https://app-pdv-completo.vercel.app/api/webhook/mercadopago
✅ IPN: Configurado
✅ Eventos: payment.updated, payment.created
```

#### Teste (Sandbox Mode)
```
✅ URL: https://app-pdv-completo.vercel.app/api/webhook/mercadopago
⚠️ Use a MESMA URL para teste e produção
```

---

### 3. Configuração de Eventos

Certifique-se de que os seguintes eventos estão marcados:

- ✅ `payment.created` - Pagamento criado
- ✅ `payment.updated` - Pagamento atualizado (aprovado, rejeitado, etc.)

**NÃO precisa:**
- ❌ `merchant_order`
- ❌ `plan`
- ❌ `subscription`

---

## 🧪 Como Testar

### Teste 1: Verificar se o webhook está online

```bash
curl https://app-pdv-completo.vercel.app/api/webhook/mercadopago
```

**Resposta esperada:**
```json
{
  "status": "Webhook Mercado Pago ativo",
  "message": "Use POST para enviar notificações",
  "timestamp": "2026-02-01T..."
}
```

---

### Teste 2: Simular notificação do Mercado Pago

```bash
curl -X POST https://app-pdv-completo.vercel.app/api/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": { "id": "143673334915" },
    "date_created": "2026-02-01T07:39:33Z",
    "id": 128710333892,
    "live_mode": true,
    "type": "payment",
    "user_id": "361417955"
  }'
```

**Resposta esperada:**
```json
{
  "received": true,
  "processing": true,
  "payment_id": "143673334915"
}
```

---

## 🔐 Variáveis de Ambiente no Vercel

Certifique-se de que estas variáveis estão configuradas:

### Produção
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1073669413723433-012917-14c775d457bda1529673c51b18c894a9-361417955
```

### Teste
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-1073669413723433-012917-xxxxxxxxxxxx-361417955
```

⚠️ **Use o token de TESTE no ambiente de teste!**

---

## 📊 Logs do Webhook

Após fazer um pagamento, verifique os logs no Vercel:

1. Acesse: https://vercel.com/seu-projeto/deployments
2. Clique no deployment mais recente
3. Vá em "Functions" → `/api/webhook/mercadopago`
4. Veja os logs em tempo real

**O que você deve ver nos logs:**

```
═══════════════════════════════════════════════════════
🔔 WEBHOOK MERCADO PAGO RECEBIDO
📅 Data/Hora: 2026-02-01T...
📦 Body completo: {...}
═══════════════════════════════════════════════════════
💳 PROCESSANDO PAGAMENTO
🆔 Payment ID: 143673334915
✅ Token de acesso encontrado
🌐 Fazendo requisição à API do Mercado Pago...
✅ PAGAMENTO APROVADO!
💾 ATUALIZANDO CONTA DO OPERADOR
✅ CONTA ATIVADA COM SUCESSO!
═══════════════════════════════════════════════════════
```

---

## 🚨 Problemas Comuns

### Erro 404
**Causa:** URL incorreta no painel do Mercado Pago
**Solução:** Corrija a URL conforme indicado acima

### Erro 500
**Causa:** Token não configurado ou inválido
**Solução:** Verifique a variável `MERCADOPAGO_ACCESS_TOKEN` no Vercel

### Erro "Operador não encontrado"
**Causa:** O `external_reference` não corresponde ao ID do usuário
**Solução:** Ao criar o pagamento, use o ID do operador como `external_reference`

### Pagamento duplicado
**Causa:** O webhook foi chamado múltiplas vezes
**Solução:** ✅ Já tratado no código! O sistema ignora pagamentos duplicados

---

## 📞 Suporte

Se os erros continuarem após estas correções:

1. Verifique os logs no Vercel
2. Teste com o script: `./test-webhook-mercadopago.sh`
3. Confirme que a URL está correta no painel do Mercado Pago
4. Valide que o token de acesso está correto

---

## ✅ Checklist Final

- [ ] URL de teste corrigida no painel do Mercado Pago
- [ ] URL de produção verificada
- [ ] Eventos `payment.updated` e `payment.created` habilitados
- [ ] Token de acesso configurado no Vercel (produção)
- [ ] Token de teste configurado no Vercel (teste)
- [ ] Teste realizado com pagamento real
- [ ] Logs do Vercel verificados

---

🎉 **Pronto!** Agora os webhooks não devem mais falhar com erro 404.
