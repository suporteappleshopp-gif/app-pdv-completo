# 🔧 Como Configurar o Webhook do Mercado Pago

## ✅ Passo a Passo COMPLETO

### 1️⃣ Descobrir a URL Correta do Webhook

Execute um dos comandos abaixo para ver a URL correta:

```bash
# Descobrir qual URL usar (produção):
echo "URL do Webhook: https://SEU_DOMINIO.vercel.app/api/webhook/mercadopago"

# OU acesse no navegador:
https://SEU_DOMINIO.vercel.app/api/webhook/mercadopago
```

O endpoint retornará algo assim:
```json
{
  "status": "✅ Webhook Mercado Pago ativo e funcionando!",
  "url_correta": "https://SEU_DOMINIO.vercel.app/api/webhook/mercadopago",
  ...
}
```

---

### 2️⃣ Configurar no Painel do Mercado Pago

1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app

2. **Selecione sua aplicação**

3. **Vá em "Webhooks"** (menu lateral esquerdo)

4. **Clique em "Configurar webhook" ou "Editar"**

5. **Cole a URL COMPLETA:**
   ```
   https://SEU_DOMINIO.vercel.app/api/webhook/mercadopago
   ```

6. **Selecione o evento:** ✅ **Pagamentos** (`payment`)

7. **Clique em "Salvar"**

---

### 3️⃣ Testar o Webhook

Após salvar, o Mercado Pago vai fazer um teste de conexão. Se der **200 OK**, está tudo certo! ✅

**Se der 404:**
- ❌ Verifique se a URL está **exatamente** como acima
- ❌ Verifique se você fez **deploy recente** no Vercel
- ❌ Teste a URL no navegador primeiro (deve retornar JSON)

---

### 4️⃣ Verificar se Está Funcionando

#### Opção A: Ver logs no Vercel
1. Acesse: https://vercel.com/seu-projeto/logs
2. Faça um pagamento de teste
3. Procure por: `🔔 WEBHOOK MERCADO PAGO RECEBIDO`

#### Opção B: Ver na página de diagnóstico
1. Acesse: `https://SEU_DOMINIO.vercel.app/webhook-info`
2. Veja os últimos webhooks recebidos

#### Opção C: Ver no banco de dados
Execute no Supabase SQL Editor:
```sql
SELECT * FROM webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Problemas Comuns

### ❌ Erro 404 - "Not Found"
**Causa:** URL incorreta ou app não deployado
**Solução:**
- Verifique se a URL termina com `/api/webhook/mercadopago`
- Faça um novo deploy no Vercel
- Teste a URL no navegador

### ❌ Erro 500 - "Internal Server Error"
**Causa:** Erro no código do webhook
**Solução:** Veja os logs no Vercel ou na tabela `webhook_logs`

### ❌ Timeout
**Causa:** Webhook demorou mais de 5 segundos
**Solução:** Já está resolvido! O código retorna 200 imediatamente

---

## 🔍 URLs Importantes

- **Painel Mercado Pago:** https://www.mercadopago.com.br/developers/panel/app
- **Documentação Webhooks:** https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- **Página de Diagnóstico:** `https://SEU_DOMINIO.vercel.app/webhook-info`
- **Endpoint do Webhook:** `https://SEU_DOMINIO.vercel.app/api/webhook/mercadopago`

---

## ✅ Checklist Final

- [ ] URL do webhook está **correta** (com `/api/webhook/mercadopago`)
- [ ] Evento **"Pagamentos"** está selecionado
- [ ] Teste de conexão retornou **200 OK**
- [ ] Fez um **pagamento de teste** e recebeu notificação
- [ ] Logs aparecem no Vercel ou na tabela `webhook_logs`

---

## 🎯 Dica Extra

Se você está testando **localmente** (localhost), o Mercado Pago **NÃO CONSEGUE** acessar sua máquina.

Para testar webhooks localmente, use:
- **Ngrok:** https://ngrok.com
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

Mas o mais fácil é **fazer deploy no Vercel** e testar em produção! 🚀
