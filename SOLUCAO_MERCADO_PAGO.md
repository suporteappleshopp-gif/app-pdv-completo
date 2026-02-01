# 🔴 PROBLEMA: Mercado Pago pede login ao acessar link de pagamento

## ❌ CAUSA DO PROBLEMA:

O link de pagamento redireciona para a página de login do Mercado Pago porque:

1. **A conta não tem o Checkout Pro ativado** (mais provável)
2. **O token não tem as permissões necessárias**
3. **A conta está em modo de teste**

---

## ✅ SOLUÇÃO 1: ATIVAR CHECKOUT PRO (RECOMENDADO)

### Passo a passo:

1. **Acesse:** https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing
2. **Faça login** na sua conta do Mercado Pago
3. Vá em **"Suas integrações"** > **"Checkout Pro"**
4. **Ative o Checkout Pro** na sua conta
5. **Aguarde aprovação** (geralmente é imediato)

### Verificar se está ativo:

1. Acesse: https://www.mercadopago.com.br/settings/account
2. Vá em **"Vendas online"**
3. Verifique se **"Checkout Pro"** está ATIVO

---

## ✅ SOLUÇÃO 2: VERIFICAR PERMISSÕES DO TOKEN

O token precisa ter permissões de:
- `read` - Ler informações
- `write` - Criar preferências
- `offline_access` - Acesso permanente

### Como verificar:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Clique na sua aplicação
3. Vá em **"Credenciais"**
4. Verifique se está usando o **Access Token de PRODUÇÃO** (não de teste)
5. O token deve começar com `APP_USR-` (produção)

---

## ✅ SOLUÇÃO 3: USAR CHECKOUT TRANSPARENTE (ALTERNATIVA)

Se você não conseguir ativar o Checkout Pro, podemos implementar o **Checkout Transparente**, que:
- ✅ Não precisa de aprovação do Mercado Pago
- ✅ O pagamento é feito dentro do seu app
- ✅ Você controla 100% da experiência

**DESVANTAGEM:** Precisa de mais código no frontend.

---

## 🔍 COMO IDENTIFICAR O PROBLEMA:

Execute no navegador (Console F12) quando tentar gerar o pagamento:

```javascript
// Você verá no console:
✅ Preferência criada com sucesso!
🆔 Preference ID: XXXXXXX
🔗 Link de pagamento: https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=XXXXX
```

**Se o link redirecionar para login, a conta não está ativa para Checkout Pro.**

---

## 📋 PRÓXIMOS PASSOS:

1. **Acesse seu painel do Mercado Pago**
2. **Ative o Checkout Pro**
3. **Teste novamente**

Se não conseguir ativar, me avise que implemento o Checkout Transparente!
