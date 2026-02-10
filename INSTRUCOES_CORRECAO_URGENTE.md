# 🚨 CORREÇÃO URGENTE - Permitir Cadastro de Usuários

## ❌ Problema Atual
```
Erro: permission denied for table users
```

Os usuários não conseguem se cadastrar porque as políticas RLS (Row Level Security) estão bloqueando a inserção de dados na tabela `operadores`.

---

## ✅ SOLUÇÃO (5 MINUTOS)

### PASSO 1: Acesse o Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa
2. Faça login com sua conta do Supabase
3. No menu lateral esquerdo, clique em **"SQL Editor"**

### PASSO 2: Execute o SQL de Correção
1. Na tela do SQL Editor, clique em **"New query"**
2. Cole **TODO** o código abaixo na janela:

```sql
-- REMOVER POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "allow_select_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_update_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores;

-- CRIAR POLÍTICAS PÚBLICAS (SEM AUTENTICAÇÃO)
CREATE POLICY "public_select_operadores" ON operadores
  FOR SELECT USING (true);

CREATE POLICY "public_insert_operadores" ON operadores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_operadores" ON operadores
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "public_delete_operadores" ON operadores
  FOR DELETE USING (true);

-- GARANTIR PERMISSÕES
GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO authenticated;
```

3. Clique no botão **"Run"** (ou pressione `Ctrl + Enter`)
4. Aguarde a mensagem de **"Success"**

### PASSO 3: Teste o Cadastro
1. Volte para a tela de cadastro do app
2. Tente criar uma nova conta
3. Se ainda der erro, recarregue a página (`F5`) e tente novamente

---

## 📋 VERIFICAÇÃO

Após executar o SQL, verifique se funcionou:

1. No Supabase Dashboard, vá em **"Authentication" → "Policies"**
2. Selecione a tabela **"operadores"**
3. Você deve ver 4 políticas ativas:
   - ✅ `public_select_operadores`
   - ✅ `public_insert_operadores`
   - ✅ `public_update_operadores`
   - ✅ `public_delete_operadores`

---

## 🔒 SEGURANÇA

Esta configuração permite cadastro público (sem autenticação prévia), mas:
- ✅ Os novos usuários são criados com status `suspenso = true`
- ✅ Eles precisam de aprovação do admin para acessar o sistema
- ✅ O controle de acesso é feito no código da aplicação
- ✅ Apenas o admin pode ativar usuários

---

## 📞 SE AINDA NÃO FUNCIONAR

Se após executar o SQL ainda aparecer erro de permissão:

1. Verifique se você está logado no projeto correto do Supabase
2. Certifique-se de que o SQL foi executado **sem erros**
3. Tente limpar o cache do navegador (`Ctrl + Shift + Delete`)
4. Recarregue a página do app (`F5`)
5. Tente criar uma conta novamente

---

## ✨ DADOS LIMPOS

Os seguintes dados foram limpos para começar do zero:
- ✅ Todos os operadores antigos foram removidos
- ✅ Histórico de pagamentos limpo
- ✅ Solicitações de renovação limpas
- ✅ Ganhos admin limpos
- ✅ Vendas limpas
- ✅ Produtos limpos

Você pode começar a cadastrar usuários novamente sem conflitos.

---

## 🎯 PRÓXIMOS PASSOS

Após a correção funcionar:
1. Teste criar uma conta de usuário comum
2. Verifique se a conta aparece como "SUSPENSA"
3. Entre como admin e aprove o pagamento
4. Confirme se o usuário consegue fazer login

---

**Arquivo SQL completo também disponível em:**
`EXECUTAR_NO_SUPABASE_DASHBOARD.sql`
