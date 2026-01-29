# 🚀 Configuração do Supabase para o Sistema PDV

Este guia explica como configurar o Supabase para o sistema PDV funcionar completamente na nuvem, com autenticação por email/senha e dados salvos permanentemente.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuito)
- Node.js instalado
- Projeto Next.js rodando

## 🔧 Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha os dados:
   - **Project Name**: PDV System (ou o nome que preferir)
   - **Database Password**: Crie uma senha segura e guarde-a
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
5. Clique em "Create new project"
6. Aguarde alguns minutos enquanto o projeto é criado

## 🗄️ Passo 2: Configurar o Banco de Dados

1. No painel do Supabase, vá em **SQL Editor** (ícone de código no menu lateral)
2. Clique em "+ New query"
3. Copie **todo** o conteúdo do arquivo `supabase-schema.sql` deste projeto
4. Cole no editor SQL
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde a execução - você verá "Success. No rows returned" se tudo correu bem

### O que esse script faz?
- Cria as tabelas: `operadores`, `produtos`, `vendas`, `empresas`, `mensagens_chat`
- Configura índices para performance
- Ativa Row Level Security (RLS) para segurança
- Cria políticas de acesso (admin vê tudo, usuário vê apenas seus dados)
- Configura triggers para atualização automática de timestamps

## 👤 Passo 3: Criar Usuário Administrador

1. No painel do Supabase, vá em **Authentication** > **Users**
2. Clique em "+ Add user" > "Create new user"
3. Preencha:
   - **Email**: `admin@pdv.com`
   - **Password**: `Sedexdez@1` (ou a senha que preferir)
   - Marque a opção "Auto Confirm User"
4. Clique em "Create user"
5. Após criar, copie o **User UID** (um código como `123e4567-e89b-12d3-a456-426614174000`)

### Configurar admin no banco de dados

6. Volte para **SQL Editor**
7. Execute o seguinte comando (substitua `USER_UID_AQUI` pelo UID que você copiou):

```sql
UPDATE operadores
SET is_admin = true,
    ativo = true,
    suspenso = false,
    aguardando_pagamento = false
WHERE auth_user_id = 'USER_UID_AQUI'::uuid;
```

8. Clique em "Run" - você verá "Success. 1 row affected"

## 🔑 Passo 4: Obter Credenciais da API

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem) > **API**
2. Copie os seguintes valores:
   - **Project URL**: algo como `https://abcdefgh.supabase.co`
   - **anon public**: uma chave longa começando com `eyJ...`

## ⚙️ Passo 5: Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env.local`
2. Adicione as seguintes linhas (substituindo pelos seus valores):

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Salve o arquivo

⚠️ **IMPORTANTE**:
- Nunca compartilhe o arquivo `.env.local`
- Nunca faça commit dele no Git (ele já está no `.gitignore`)

## 🎯 Passo 6: Reiniciar o Servidor

```bash
# Parar o servidor se estiver rodando (Ctrl+C)

# Instalar dependências (se ainda não instalou)
npm install

# Iniciar o servidor
npm run dev
```

O sistema agora está conectado ao Supabase! 🎉

## ✅ Verificação

### Teste 1: Login do Administrador
1. Acesse `http://localhost:3000`
2. Clique em "Entrar como Administrador"
3. Use o email e senha que você criou (padrão: `admin@pdv.com` / `Sedexdez@1`)
4. Se entrar no painel admin, está funcionando!

### Teste 2: Criar Usuário Sem Mensalidade
1. No painel admin, clique em "Criar Usuário"
2. Preencha nome e senha
3. O usuário será criado com acesso livre (sem mensalidade)

### Teste 3: Registrar Usuário Com Mensalidade
1. Faça logout
2. Na tela de login, clique em "Criar Nova Conta"
3. Preencha os dados e escolha forma de pagamento
4. O usuário será criado, mas ficará suspenso até o pagamento ser confirmado

## 🔒 Segurança

O sistema usa Row Level Security (RLS) do Supabase:
- **Admin** pode ver e editar tudo
- **Usuários** veem apenas seus próprios dados (produtos, vendas, estoque)
- Senhas são criptografadas automaticamente pelo Supabase Auth
- Tokens JWT são gerenciados automaticamente

## 📊 Como os Dados São Salvos

### Sistema Antigo (localStorage/IndexedDB)
- ❌ Dados salvos apenas no navegador
- ❌ Mudar de computador = perder tudo
- ❌ Limpar cache = perder tudo

### Sistema Novo (Supabase)
- ✅ Dados salvos na nuvem
- ✅ Acesse de qualquer computador
- ✅ Dados persistem para sempre
- ✅ Sincronização em tempo real
- ✅ Backup automático

## 🔄 Como Funciona o Login

1. **Usuário entra com email e senha**
2. Supabase Auth valida as credenciais
3. Se válido, retorna um token JWT
4. Sistema busca dados do usuário na tabela `operadores`
5. Verifica se está ativo e não suspenso
6. Carrega produtos e vendas do usuário
7. Mantém sessão ativa automaticamente

## 👥 Tipos de Usuário

### 1. Administrador
- Criado manualmente no Supabase
- Pode criar usuários sem mensalidade
- Vê todos os dados do sistema
- Não tem restrições de acesso

### 2. Usuário Sem Mensalidade (criado pelo admin)
- Criado pelo admin no painel
- Acesso livre e permanente
- Não precisa pagar
- Não tem data de vencimento

### 3. Usuário Com Mensalidade (auto-registro)
- Cria conta sozinho pela tela de cadastro
- Escolhe PIX (100 dias - R$ 59,90) ou Cartão (365 dias - R$ 149,70)
- Conta fica suspensa até pagamento
- Admin precisa ativar após confirmar pagamento

## 🛠️ Troubleshooting

### Erro: "Failed to fetch"
- Verifique se o `.env.local` está configurado corretamente
- Verifique se a URL do Supabase está correta (sem barra no final)
- Reinicie o servidor

### Erro: "Invalid API key"
- Verifique se a chave `anon public` está correta
- Copie novamente de Settings > API
- Certifique-se de usar a chave `anon`, não a `service_role`

### Usuário não consegue fazer login
- Verifique se o usuário foi confirmado no Supabase Authentication
- Verifique se o campo `ativo` está como `true` na tabela `operadores`
- Verifique se `suspenso` está como `false`

### Admin não consegue criar usuários
- Verifique se o campo `is_admin` está como `true` na tabela `operadores`
- Execute o UPDATE do Passo 3 novamente

## 📱 Próximos Passos

Agora que o sistema está conectado ao Supabase:

1. ✅ Login funciona com email/senha
2. ✅ Dados salvos permanentemente na nuvem
3. ✅ Cada usuário tem seu próprio caixa e estoque
4. ✅ Admin pode criar usuários sem mensalidade
5. ✅ Usuários podem se registrar com mensalidade

## 🎉 Pronto!

Seu sistema PDV agora está rodando com banco de dados na nuvem! 🚀

Qualquer dúvida, consulte a [documentação do Supabase](https://supabase.com/docs).
