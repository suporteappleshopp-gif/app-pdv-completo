# 🔐 Acesso do Administrador

## Credenciais Atualizadas

O sistema foi atualizado para usar **email e senha** para o administrador, conectado ao Supabase:

- **Email:** `diegomarqueshm@icloud.com`
- **Senha:** `Sedexdez@1`

---

## 📋 Como Configurar o Administrador

### Opção 1: Página de Configuração (Recomendado)

1. Acesse: `/setup-admin` no navegador
2. Clique em "Configurar Administrador"
3. Aguarde a confirmação de sucesso
4. Faça login na página principal

### Opção 2: Já existe um Admin

Se o administrador já foi criado anteriormente, você pode fazer login diretamente:

1. Acesse a página inicial
2. Clique em "Entrar como Administrador"
3. Digite o email: `diegomarqueshm@icloud.com`
4. Digite a senha: `Sedexdez@1`
5. Clique em "Acessar"

---

## ✨ Funcionalidades do Admin

Como administrador, você tem acesso total ao sistema:

### 1. Gerenciamento de Usuários
- ✅ Criar novos usuários com **email e senha**
- ✅ Usuários criados pelo admin têm **acesso livre sem mensalidade**
- ✅ Ativar/Desativar usuários
- ✅ Excluir usuários
- ✅ Visualizar dados dos usuários (com botão de mostrar/ocultar)
- ✅ Filtrar por status (Todos, Ativo, Inativo)

### 2. Carteira de Ganhos
- Visualizar contas criadas
- Acompanhar receitas

### 3. Análise de Lojas
- Configurar lojas
- Criar acessos para lojas

---

## 🔑 Criar Novos Usuários (Admin)

Quando você cria um novo usuário como admin:

1. Vá para o painel administrativo
2. Clique em "Criar Usuário"
3. Digite o **email** do usuário
4. Digite a **senha** (mínimo 6 caracteres)
5. Clique em "Criar Usuário"

**Importante:**
- ✅ Usuários criados pelo admin **não precisam pagar mensalidade**
- ✅ Eles têm **acesso permanente e livre**
- ✅ O nome do usuário será extraído automaticamente do email
- ✅ O usuário poderá fazer login com o email e senha fornecidos

---

## 🔒 Segurança

- O admin é identificado no banco de dados pela coluna `is_admin = true`
- Apenas o admin pode criar usuários sem mensalidade
- Todas as senhas são criptografadas pelo Supabase Auth
- O sistema verifica se o usuário é admin antes de permitir acesso às funcionalidades administrativas

---

## 📝 Sistema de Login

### Login de Usuário Normal
- Email + Senha
- Usuários pagantes ou criados pelo admin

### Login de Administrador
- Email: `diegomarqueshm@icloud.com`
- Senha: `Sedexdez@1`
- Acesso total ao sistema

---

## 🆘 Problemas?

Se você não conseguir fazer login como admin:

1. Acesse `/setup-admin` para reconfigurar
2. Verifique se as credenciais estão corretas
3. Verifique se o Supabase está configurado corretamente
4. Verifique as variáveis de ambiente do Supabase

---

**Última atualização:** Sistema configurado com email e senha para admin conectado ao Supabase
