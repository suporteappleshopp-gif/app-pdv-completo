# 🚀 Como Corrigir o Erro de Permissão - Passo a Passo

## ⚠️ Erro Atual
```
❌ Erro ao buscar operadores: permission denied for table users
```

## ✅ Solução Rápida

### Passo 1: Acessar o Supabase
1. Entre em: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa
2. Clique em **SQL Editor** no menu lateral

### Passo 2: Executar o SQL de Correção
1. Clique em **New query**
2. Copie TODO o SQL do arquivo `supabase/migrations/20260210161818_fix_rls_remove_auth_users_dependency.sql`
3. Cole no editor
4. Clique em **Run** (botão verde)

### Passo 3: Verificar se Funcionou
1. Atualize a página do app
2. O erro deve desaparecer
3. Teste criando uma nova conta
4. Teste logando como admin (diegomarqueshm@icloud.com)

---

## 🔍 O Que o SQL Faz?

1. Remove políticas RLS antigas que causavam erro
2. Cria novas políticas simplificadas que não acessam `auth.users`
3. Garante que o trigger de criação automática funciona
4. Permite que admin e usuários funcionem normalmente

---

## 🎯 Como o Sistema Funciona

### 📝 Cadastro de Novo Usuário
1. Usuário preenche email e senha
2. Sistema cria conta no Supabase Auth
3. Trigger automático cria registro em `operadores` com:
   - `suspenso: true` (usuário suspenso por padrão)
   - `aguardando_pagamento: true` (aguardando pagamento)
   - `ativo: false` (não pode usar o caixa)
4. Usuário pode fazer login, mas vê mensagem de conta suspensa
5. Usuário não consegue usar funcionalidades do caixa

### 👔 Aprovação pelo Admin
1. Admin faz login e acessa painel "Gerenciar Usuários"
2. Vê todos os usuários cadastrados
3. Usuários com `suspenso: true` aparecem como "Suspenso"
4. Admin clica em "Ativar" para aprovar o usuário
5. Sistema atualiza:
   - `ativo: true`
   - `suspenso: false`
6. Usuário pode usar todas as funcionalidades

### 🔐 Segurança
- Todos os usuários estão na tabela `auth.users` (autenticação)
- Todos os usuários têm registro em `operadores` (dados do app)
- RLS está ativo mas simplificado
- Controle de acesso é feito pelo código da aplicação
- Admin tem acesso total via código

---

## 🐛 Se Ainda Houver Erros

### Erro: "relation operadores does not exist"
- A tabela não foi criada
- Execute todas as migrations na pasta `supabase/migrations/`

### Erro: "violates foreign key constraint"
- Execute o SQL de correção novamente
- Certifique-se que o trigger está ativo

### Erro: Login não funciona
- Verifique as variáveis de ambiente no arquivo `.env`
- Devem estar presentes:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## 📞 Links Úteis

- Projeto Supabase: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa
- SQL Editor: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa/editor
- Table Editor: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa/editor
- Authentication: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa/auth/users

---

## ✨ Após a Correção

O sistema funcionará normalmente:

✅ Usuários podem criar contas
✅ Contas ficam suspensas por padrão
✅ Admin pode ver e aprovar usuários
✅ Usuários aprovados podem usar o caixa
✅ Sistema de mensalidade funcionando
✅ Painel admin funcionando
✅ Sem erros de permissão!
