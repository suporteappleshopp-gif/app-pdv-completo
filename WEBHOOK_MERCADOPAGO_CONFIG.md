# 🔔 Configuração do Webhook Mercado Pago

## ⚠️ IMPORTANTE - CONFIGURAÇÃO NECESSÁRIA

Para que os pagamentos sejam reconhecidos **AUTOMATICAMENTE**, você DEVE configurar a URL do webhook no painel do Mercado Pago.

---

## 📋 Passo a Passo

### 1. Acesse o Painel do Mercado Pago
- Entre em: https://www.mercadopago.com.br/developers
- Faça login com sua conta

### 2. Configure o Webhook
- Vá em **Suas integrações** → **Webhooks**
- Clique em **Configurar URLs de produção**

### 3. Adicione a URL do Webhook

**URL para adicionar:**
```
https://SEU_DOMINIO.com/api/webhook/mercadopago
```

**Substitua `SEU_DOMINIO.com` pelo domínio real do seu app!**

Exemplos:
- Se seu app está em `meupdv.com.br`, use: `https://meupdv.com.br/api/webhook/mercadopago`
- Se está em `app.lasy.app`, use: `https://app.lasy.app/api/webhook/mercadopago`

### 4. Selecione os Eventos
Marque a opção:
- ✅ **Pagamentos** (payments)

### 5. Salve a Configuração
- Clique em **Salvar**
- O Mercado Pago testará a URL automaticamente

---

## 🔐 Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas no arquivo `.env.local`:

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui
MERCADOPAGO_PUBLIC_KEY=APP_USR-sua-public-key-aqui
```

---

## ✅ Como Funciona

Quando um pagamento é aprovado no Mercado Pago:

1. **Mercado Pago envia notificação** → Webhook recebe
2. **Webhook busca dados do pagamento** → API do Mercado Pago
3. **Identifica o usuário** → Pelo email do pagador
4. **Calcula os dias:**
   - R$ 59,90 (PIX) = 60 dias
   - R$ 149,70 (Cartão) = 180 dias
5. **Atualiza a conta:**
   - ✅ Ativa a conta
   - ✅ Remove suspensão
   - ✅ Adiciona dias ao vencimento
   - ✅ Registra no histórico de pagamentos
   - ✅ Registra nos ganhos do admin

---

## 🔍 Como Verificar se Está Funcionando

### Teste GET no Webhook
Acesse no navegador:
```
https://SEU_DOMINIO.com/api/webhook/mercadopago
```

Resposta esperada:
```json
{
  "status": "Webhook Mercado Pago ativo",
  "message": "Use POST para enviar notificações"
}
```

### Logs Detalhados
O webhook possui logs MUITO detalhados. Quando um pagamento for processado, você verá no console:

```
═══════════════════════════════════════════════════════
🔔 WEBHOOK MERCADO PAGO RECEBIDO
📅 Data/Hora: 2026-01-31T...
📦 Body completo: {...}
═══════════════════════════════════════════════════════
```

E todos os passos do processamento com emojis para fácil identificação.

---

## 🚨 Problemas Comuns

### ❌ "Operador não encontrado"
**Causa:** Email no Mercado Pago diferente do cadastrado no sistema.
**Solução:** Certifique-se de que o email do pagador é o mesmo email cadastrado na conta do operador.

### ❌ "Token não configurado"
**Causa:** Variável `MERCADOPAGO_ACCESS_TOKEN` não está no `.env.local`
**Solução:** Adicione a variável com seu token de produção.

### ❌ Webhook não recebe notificações
**Causa:** URL não está configurada no painel do Mercado Pago
**Solução:** Configure a URL conforme o passo 3 acima.

### ❌ Pagamento duplicado
**Não se preocupe!** O webhook verifica automaticamente se um pagamento já foi processado e retorna sucesso sem duplicar os dias.

---

## 📊 Estrutura das Tabelas

### historico_pagamentos
Registra TODOS os pagamentos dos usuários:
- ID único do pagamento
- ID do Mercado Pago
- Valor pago
- Dias comprados
- Status (pago, pendente, etc)

### ganhos_admin
Registra os ganhos do administrador:
- Tipo: "mensalidade-paga"
- Valor
- Usuário que pagou
- Descrição com ID do Mercado Pago

---

## 🎯 Checklist de Verificação

Antes de fazer uma nova compra de teste, verifique:

- [ ] URL do webhook configurada no Mercado Pago
- [ ] Variáveis de ambiente configuradas
- [ ] Email do pagador corresponde ao email no sistema
- [ ] Tabelas `historico_pagamentos` e `ganhos_admin` existem no banco
- [ ] App está rodando e acessível pela URL pública

---

## 📞 Suporte

Se após seguir todos os passos o pagamento não for reconhecido automaticamente, verifique os logs do webhook no console do servidor.

Os logs são EXTREMAMENTE detalhados e mostrarão exatamente onde está o problema.
