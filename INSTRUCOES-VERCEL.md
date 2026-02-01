# 🚀 Guia Completo: Configurar Variáveis de Ambiente no Vercel

## 📋 Passo a Passo Detalhado

### **1️⃣ Acesse as Configurações do Seu Projeto no Vercel**

1. Entre no site: https://vercel.com
2. Faça login na sua conta
3. Clique no seu projeto (app-pdv-completo)
4. Clique na aba **"Settings"** (Configurações)
5. No menu lateral esquerdo, clique em **"Environment Variables"** (Variáveis de Ambiente)

---

### **2️⃣ Adicione Cada Variável de Ambiente**

Para cada variável abaixo, siga estes passos:

1. Clique no botão **"Add New"** ou **"+ Add"**
2. Em **"Key"** (Nome), digite exatamente o nome da variável
3. Em **"Value"** (Valor), cole o valor correspondente
4. Em **"Environments"**, marque todas as 3 opções:
   - ✅ **Production** (Produção)
   - ✅ **Preview** (Prévia)
   - ✅ **Development** (Desenvolvimento)
5. Clique em **"Save"** ou **"Add"**

---

## 🔑 Variáveis Que Você Precisa Adicionar

### **Variáveis do Supabase** 🗄️

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Nome:** `NEXT_PUBLIC_SUPABASE_URL`
- **Valor:** Pegue em https://supabase.com/dashboard/project/_/settings/api
- **Onde encontrar:**
  1. Acesse seu projeto no Supabase
  2. Vá em "Settings" → "API"
  3. Copie o campo **"Project URL"**
- **Exemplo:** `https://seu-projeto.supabase.co`

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Nome:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Valor:** Pegue em https://supabase.com/dashboard/project/_/settings/api
- **Onde encontrar:**
  1. Mesma página da URL acima
  2. Copie o campo **"anon public"** (chave pública)
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### **Variáveis do Mercado Pago** 💳

#### `MERCADOPAGO_ACCESS_TOKEN`
- **Nome:** `MERCADOPAGO_ACCESS_TOKEN`
- **Valor:** Pegue em https://www.mercadopago.com.br/developers/panel
- **Onde encontrar:**
  1. Faça login no Mercado Pago Developers
  2. Clique em "Suas aplicações"
  3. Selecione seu aplicativo
  4. Vá na aba **"Credenciais"**
  5. Copie o **"Access Token"** de **PRODUÇÃO**
- **Exemplo:** `APP_USR-1234567890-123456-abc123...`

#### `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` (opcional, mas recomendado)
- **Nome:** `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- **Valor:** Na mesma página das credenciais
- **Onde encontrar:** Copie a **"Public Key"** de produção
- **Exemplo:** `APP_USR-abc123-def456...`

---

### **Variável da URL do Seu App** 🌐

#### `NEXT_PUBLIC_URL`
- **Nome:** `NEXT_PUBLIC_URL`
- **Valor:** URL do seu projeto no Vercel
- **Como descobrir:**
  1. Na página do seu projeto no Vercel
  2. Veja o link em "Domains" (Domínios)
  3. Copie a URL principal (geralmente termina com `.vercel.app`)
- **Exemplo:** `https://app-pdv-completo.vercel.app`

---

## ✅ Checklist Final

Antes de prosseguir, confirme que você adicionou todas estas variáveis:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `MERCADOPAGO_ACCESS_TOKEN`
- [ ] `NEXT_PUBLIC_URL`
- [ ] (Opcional) `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`

---

## 🔄 Reimplantar o Projeto

**IMPORTANTE:** Depois de adicionar as variáveis, você precisa reimplantar o projeto:

1. Volte para a aba **"Deployments"**
2. Encontre o deploy mais recente
3. Clique nos 3 pontinhos (...) ao lado do deploy
4. Clique em **"Redeploy"** (Reimplantar)
5. Confirme clicando em **"Redeploy"** novamente

Ou simplesmente faça um novo push no GitHub que o Vercel vai atualizar automaticamente!

---

## 🎯 Links Rápidos

| Serviço | Link Direto |
|---------|-------------|
| **Vercel - Variáveis de Ambiente** | https://vercel.com/seu-usuario/app-pdv-completo/settings/environment-variables |
| **Supabase - API Settings** | https://supabase.com/dashboard/project/_/settings/api |
| **Mercado Pago - Credenciais** | https://www.mercadopago.com.br/developers/panel |

---

## ❓ Problemas Comuns

### "Ainda não funciona depois de adicionar as variáveis"
✅ **Solução:** Reimplante o projeto (veja seção acima)

### "Não encontro as credenciais do Mercado Pago"
✅ **Solução:**
1. Certifique-se de ter criado uma aplicação
2. Verifique se está vendo as credenciais de **PRODUÇÃO** (não teste)

### "O Supabase não conecta"
✅ **Solução:**
1. Verifique se a URL está correta (começa com `https://`)
2. Certifique-se de copiar a chave **anon** (pública), não a service_role

---

## 🎉 Pronto!

Após seguir todos os passos, seu app estará funcionando perfeitamente no Vercel com todas as integrações ativas! 🚀
