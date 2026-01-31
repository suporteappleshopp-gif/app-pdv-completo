# 🧪 Teste do Webhook - Mercado Pago

## Como Testar o Webhook Localmente

### Método 1: Usando curl (Terminal)

```bash
# Teste básico - Verificar se webhook está ativo
curl http://localhost:3000/api/webhook/mercadopago

# Resposta esperada:
# {"status":"Webhook Mercado Pago ativo","message":"Use POST para enviar notificações"}
```

### Método 2: Teste com Pagamento Real (Sandbox do Mercado Pago)

1. **Configure as credenciais de TESTE no .env.local:**
   ```env
   MERCADOPAGO_ACCESS_TOKEN=TEST-your-test-token
   ```

2. **Use o Mercado Pago em modo de testes:**
   - Acesse: https://www.mercadopago.com.br/developers/panel
   - Mude para **Modo de Testes**
   - Use os cartões de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing

3. **Cartões de Teste que Aprovam:**
   - **Mastercard:** 5031 7557 3453 0604
   - **Visa:** 4509 9535 6623 3704
   - **CVV:** Qualquer 3 dígitos
   - **Vencimento:** Qualquer data futura
   - **Nome:** APRO (para aprovar) ou OTHE (para pendente)

---

## 📋 Checklist Antes de Testar

Antes de fazer um pagamento real, verifique:

### ✅ Banco de Dados
- [ ] Tabela `operadores` existe
- [ ] Tabela `historico_pagamentos` existe
- [ ] Tabela `ganhos_admin` existe
- [ ] Usuário está cadastrado com email correto

### ✅ Variáveis de Ambiente
```bash
# Verifique se estas variáveis existem:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...

# Supabase também deve estar configurado:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### ✅ Webhook Configurado no Mercado Pago
- [ ] URL: `https://SEU_DOMINIO/api/webhook/mercadopago`
- [ ] Evento: Pagamentos (payments)
- [ ] Status: Ativo ✅

---

## 🔍 Como Verificar os Logs

### 1. Logs do Servidor Next.js

Quando o webhook for acionado, você verá logs detalhados no terminal:

```
═══════════════════════════════════════════════════════
🔔 WEBHOOK MERCADO PAGO RECEBIDO
📅 Data/Hora: 2026-01-31T...
📦 Body completo: {...}
═══════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PROCESSANDO PAGAMENTO
🆔 Payment ID: 123456789
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Token de acesso encontrado
🌐 Fazendo requisição à API do Mercado Pago...
📡 Status da resposta da API: 200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DADOS DO PAGAMENTO OBTIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 ID: 123456789
📊 Status: approved
📝 Status Detail: accredited
💰 Valor: 59.90
📧 Email Pagador: usuario@email.com
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PAGAMENTO APROVADO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Identificando usuário...
📧 Email do pagador: usuario@email.com
👤 Buscando operador no banco...

✅ Operador encontrado:
🆔 ID: abc123
👤 Nome: Usuario Teste
📧 Email: usuario@email.com
📅 Vencimento atual: Nenhum

...

🎉 PROCESSAMENTO CONCLUÍDO COM SUCESSO!
```

### 2. Verificar no Banco de Dados

**Tabela `operadores`:**
```sql
SELECT
  nome,
  email,
  ativo,
  suspenso,
  data_proximo_vencimento,
  dias_assinatura,
  forma_pagamento
FROM operadores
WHERE email = 'usuario@email.com';
```

Deve mostrar:
- ✅ `ativo = true`
- ✅ `suspenso = false`
- ✅ `data_proximo_vencimento = hoje + 60 dias`
- ✅ `dias_assinatura = 60`

**Tabela `historico_pagamentos`:**
```sql
SELECT * FROM historico_pagamentos
WHERE usuario_id = 'ID_DO_USUARIO'
ORDER BY created_at DESC;
```

Deve ter um registro novo com:
- ✅ `status = 'pago'`
- ✅ `valor = 59.90`
- ✅ `dias_comprados = 60`
- ✅ `mercadopago_payment_id = ID_DO_PAGAMENTO`

**Tabela `ganhos_admin`:**
```sql
SELECT * FROM ganhos_admin
WHERE usuario_id = 'ID_DO_USUARIO'
ORDER BY created_at DESC;
```

Deve ter um registro novo com:
- ✅ `tipo = 'mensalidade-paga'`
- ✅ `valor = 59.90`
- ✅ `usuario_nome = Nome do Usuario`

---

## 🚨 Erros Comuns e Soluções

### ❌ Erro: "Token não configurado"
**Solução:** Adicione `MERCADOPAGO_ACCESS_TOKEN` no `.env.local`

### ❌ Erro: "Operador não encontrado"
**Problema:** Email do pagador ≠ Email cadastrado
**Solução:** Use o mesmo email em ambos os lugares

### ❌ Erro: "Erro ao buscar pagamento no Mercado Pago"
**Problema:** Token inválido ou expirado
**Solução:** Gere um novo token em: https://www.mercadopago.com.br/developers

### ❌ Webhook não recebe notificações
**Problema:** URL não configurada no Mercado Pago
**Solução:** Configure a URL no painel do Mercado Pago

### ⚠️ Pagamento processado mas usuário não ativado
**Verifique:**
1. Logs do servidor - deve mostrar "PROCESSAMENTO CONCLUÍDO"
2. Banco de dados - deve ter `ativo = true`
3. Email - deve corresponder exatamente

---

## 🎯 Fluxo Esperado (Pagamento Aprovado)

1. **Usuário paga** → Mercado Pago
2. **Mercado Pago notifica** → Webhook (`/api/webhook/mercadopago`)
3. **Webhook busca dados** → API Mercado Pago
4. **Webhook identifica usuário** → Busca por email
5. **Webhook calcula dias** → 60 (PIX) ou 180 (Cartão)
6. **Webhook atualiza conta:**
   - ✅ `ativo = true`
   - ✅ `suspenso = false`
   - ✅ `aguardando_pagamento = false`
   - ✅ `data_proximo_vencimento = hoje + dias`
7. **Webhook registra histórico** → Tabela `historico_pagamentos`
8. **Webhook registra ganho** → Tabela `ganhos_admin`
9. **Retorna sucesso** → Mercado Pago

---

## 📞 Suporte

Se após seguir todos os passos o webhook ainda não funcionar:

1. **Verifique os logs** - São MUITO detalhados
2. **Verifique a URL** - Deve estar acessível publicamente
3. **Teste a URL manualmente** - `curl https://SEU_DOMINIO/api/webhook/mercadopago`
4. **Verifique as variáveis de ambiente** - Token e chaves
5. **Verifique o banco de dados** - Tabelas criadas corretamente

Se todos os passos estiverem corretos, o webhook funcionará perfeitamente! ✅
