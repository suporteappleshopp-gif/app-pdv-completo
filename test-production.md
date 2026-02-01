# 🧪 TESTE COMPLETO DE PRODUÇÃO - PDV Sistema

## 📋 Checklist de Testes

### ✅ 1. Teste de Conectividade

**URL do App:** https://lasy-8b4bcd9b.vercel.app

**Teste básico:**
```bash
# Verificar se o app está no ar
curl -I https://lasy-8b4bcd9b.vercel.app

# Deve retornar: HTTP/2 200
```

**Webhook está ativo:**
```bash
# Verificar se webhook está funcionando
curl https://lasy-8b4bcd9b.vercel.app/api/webhook/mercadopago

# Deve retornar JSON com status "ativo"
```

---

### ✅ 2. Teste de Login Admin

**Credenciais:**
- Email: `diegomarqueshm@icloud.com`
- Senha: `Sedexdez@1`

**O que esperar:**
- ✅ Redirecionar para `/admin`
- ✅ Mostrar painel administrativo
- ✅ Ver lista de usuários
- ✅ Ver ganhos e relatórios

---

### ✅ 3. Teste de Cadastro + Pagamento

#### 3.1 Criar nova conta
1. Acesse: https://lasy-8b4bcd9b.vercel.app
2. Clique em **"Criar Nova Conta"**
3. Preencha:
   - Email: `teste_$(date +%s)@teste.com` (usar timestamp para evitar duplicatas)
   - Senha: `Teste@123456`
   - Forma de pagamento: **PIX** (mais rápido)
4. Clique em **"Criar Conta"**

**Resultado esperado:**
- ✅ Tela de sucesso com botão "Pagar com PIX"
- ✅ Valor: R$ 59,90
- ✅ Prazo: 60 dias

#### 3.2 Gerar link de pagamento
1. Clique em **"Pagar com PIX"**
2. Deve abrir página do Mercado Pago
3. **URL deve conter:** `mercadopago.com.br/checkout/v1/redirect`

**Se pedir login no Mercado Pago:**
- ✅ **Normal** - é a tela de checkout
- ❌ **Se pedir login da conta de desenvolvedor** - Token pode estar errado

#### 3.3 Realizar pagamento
1. Faça login no Mercado Pago (ou use conta de teste)
2. Escolha PIX
3. Copie o código PIX
4. Pague via app do banco

**Contas de teste Mercado Pago:**
- Acesse: https://www.mercadopago.com.br/developers/panel/test-users
- Crie um "Test User - Buyer" para fazer pagamentos de teste

#### 3.4 Aguardar webhook
- ⏱️ Tempo esperado: **5 segundos a 5 minutos**
- O webhook é disparado automaticamente pelo Mercado Pago

#### 3.5 Verificar ativação
1. Volte para: https://lasy-8b4bcd9b.vercel.app
2. Faça login com o email de teste
3. Deve redirecionar para `/caixa`

**Se não ativar:**
- Veja os logs do webhook (próxima seção)
- Verifique se o payment_id apareceu no banco

---

### ✅ 4. Verificar Logs no Supabase

**Acesse o Supabase SQL Editor e rode:**

```sql
-- 1. Ver últimos webhooks recebidos
SELECT
  tipo,
  payment_id,
  usuario_id,
  status,
  created_at,
  dados_completos->>'status' as payment_status
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver pagamentos recentes
SELECT
  id,
  usuario_id,
  valor,
  status,
  forma_pagamento,
  dias_comprados,
  mercadopago_payment_id,
  created_at
FROM historico_pagamentos
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver últimos usuários cadastrados
SELECT
  id,
  nome,
  email,
  ativo,
  suspenso,
  aguardando_pagamento,
  data_proximo_vencimento,
  created_at
FROM operadores
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver ganhos registrados
SELECT
  id,
  tipo,
  usuario_nome,
  valor,
  forma_pagamento,
  descricao,
  created_at
FROM ganhos_admin
ORDER BY created_at DESC
LIMIT 5;
```

---

### ✅ 5. Teste de Cartão de Crédito

**Repetir processo acima, mas:**
- Escolher **"Cartão de Crédito"** no cadastro
- Valor: R$ 149,70
- Prazo: 180 dias
- Parcelamento: até 3x sem juros

**Cartões de teste Mercado Pago:**
```
Mastercard: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: APRO (para aprovar) ou OTHE (para recusar)
```

---

### ✅ 6. Testar Renovação de Assinatura

**Cenário:** Usuário já tem assinatura ativa e paga novamente

**Resultado esperado:**
- ✅ Dias devem ser **somados** ao vencimento atual
- ✅ Não deve resetar a data de vencimento

**Exemplo:**
- Vencimento atual: 15/03/2026
- Comprou mais 60 dias: 14/05/2026 (60 dias depois do vencimento)

---

### ✅ 7. Testar Expiração de Assinatura

**Simular vencimento vencido:**

```sql
-- Alterar data de vencimento de um usuário para ontem
UPDATE operadores
SET data_proximo_vencimento = NOW() - INTERVAL '1 day'
WHERE email = 'seu_email_teste@teste.com';
```

**Resultado esperado:**
- ❌ Usuário não deve conseguir acessar `/caixa`
- ✅ Deve ser redirecionado para página de pagamento

---

### ✅ 8. Verificar Notificações do Mercado Pago

**Painel do Mercado Pago:**
1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **"Webhooks"** ou **"Notificações"**
3. Veja o histórico de webhooks enviados

**Deve mostrar:**
- ✅ POST requests para sua URL
- ✅ Status: 200 OK
- ✅ Tipo: `payment`

---

## 🐛 Troubleshooting

### Webhook não está sendo chamado
**Soluções:**
1. Verifique se a URL está correta no painel MP
2. Confirme que os eventos `payment` estão ativos
3. Teste manualmente:
```bash
curl -X POST https://lasy-8b4bcd9b.vercel.app/api/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"12345"}}'
```

### Conta não ativa após pagamento
**Verificar:**
1. Logs no Supabase (`webhook_logs`)
2. Status do pagamento no Mercado Pago (deve ser "approved")
3. External reference está correto (ID do usuário)

### Link de pagamento pede login
**Problema:** Token ou configuração do Mercado Pago
**Solução:**
1. Verifique se o token é Production Token (não Test Token)
2. Confirme que Checkout Pro está ativo na conta MP
3. Gere um novo token se necessário

### Erro de CORS no webhook
**Solução:** Já está configurado no código. Se persistir:
1. Verifique se o Mercado Pago está enviando para a URL correta
2. Confirme que não há proxy bloqueando

---

## 📊 Métricas de Sucesso

**Teste bem-sucedido quando:**
- ✅ Webhook recebe notificação em < 5 min
- ✅ Conta é ativada automaticamente
- ✅ Data de vencimento é calculada corretamente
- ✅ Histórico de pagamento é registrado
- ✅ Ganho do admin é registrado
- ✅ Usuário consegue fazer login e acessar `/caixa`

---

## 🎯 Teste Final Completo

**Fluxo ideal (30 minutos):**
1. ✅ Criar conta (2 min)
2. ✅ Gerar link de pagamento (1 min)
3. ✅ Pagar PIX de teste (5 min)
4. ✅ Aguardar webhook (1-5 min)
5. ✅ Fazer login (1 min)
6. ✅ Usar o sistema PDV (10 min)
7. ✅ Verificar painel admin (5 min)
8. ✅ Conferir todos os dados no banco (5 min)

**Se tudo funcionar: SISTEMA PRONTO PARA PRODUÇÃO! 🚀**
