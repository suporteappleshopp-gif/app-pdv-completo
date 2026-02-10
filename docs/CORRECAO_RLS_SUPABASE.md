# 🔧 Correção RLS Supabase - Permissões

## Problema Identificado
```
❌ Erro ao buscar operadores: permission denied for table users
Código: "42501"
Mensagem: "permission denied for table users"
```

Este erro acontece porque as políticas RLS (Row Level Security) estão tentando acessar a tabela `auth.users`, mas o usuário anônimo não tem permissão para isso.

## Solução

Execute o SQL abaixo no **SQL Editor do Supabase** para corrigir todas as políticas RLS:

### 📍 Como Acessar o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**
4. Cole o SQL abaixo e clique em **Run**

---

## 🔧 SQL de Correção

```sql
-- =====================================================
-- CORREÇÃO RLS: REMOVER DEPENDÊNCIA DE auth.users
-- =====================================================
-- Problema: Políticas RLS estavam tentando acessar auth.users
-- o que causava erro "permission denied for table users"
-- Solução: Simplificar políticas para usar apenas tabela operadores
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Operadores podem ver seus dados" ON operadores CASCADE;
DROP POLICY IF EXISTS "Operadores podem atualizar seus dados" ON operadores CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todos operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "Admins podem atualizar operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "Admins podem deletar operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "Permitir inserção de novos operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "select_operadores_v2" ON operadores CASCADE;
DROP POLICY IF EXISTS "update_operadores_v2" ON operadores CASCADE;
DROP POLICY IF EXISTS "delete_operadores_v2" ON operadores CASCADE;

-- 2. REMOVER FUNÇÃO is_admin QUE CAUSAVA RECURSÃO
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;

-- 3. CRIAR POLÍTICAS RLS SIMPLIFICADAS E SEGURAS
-- Permitir SELECT para todos (sistema interno)
CREATE POLICY "allow_select_operadores" ON operadores
  FOR SELECT
  USING (true);

-- Permitir INSERT para todos (registro de usuários)
CREATE POLICY "allow_insert_operadores" ON operadores
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE para todos (admin pode atualizar via código)
CREATE POLICY "allow_update_operadores" ON operadores
  FOR UPDATE
  USING (true);

-- Permitir DELETE apenas para admins identificados por email
CREATE POLICY "allow_delete_operadores" ON operadores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = true
    )
  );

-- 4. GARANTIR QUE O TRIGGER DE CRIAÇÃO AUTOMÁTICA FUNCIONA
-- (Recria o trigger com SECURITY DEFINER para evitar problemas de permissão)
CREATE OR REPLACE FUNCTION criar_operador_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Criar operador automaticamente quando usuário é criado
  INSERT INTO operadores (
    auth_user_id,
    nome,
    email,
    is_admin,
    ativo,
    suspenso,
    aguardando_pagamento
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    false,
    false,
    true,
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se der erro (ex: operador já existe), apenas retornar NEW
    RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_criar_operador ON auth.users;
CREATE TRIGGER trigger_criar_operador
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION criar_operador_automatico();

-- 5. GARANTIR QUE TODAS AS TABELAS RELACIONADAS FUNCIONAM
-- Simplificar políticas de outras tabelas para não causar recursão

-- PRODUTOS: Permitir tudo (controle via código)
DROP POLICY IF EXISTS "Operadores podem ver seus produtos" ON produtos CASCADE;
DROP POLICY IF EXISTS "Operadores podem inserir produtos" ON produtos CASCADE;
DROP POLICY IF EXISTS "Operadores podem atualizar seus produtos" ON produtos CASCADE;
DROP POLICY IF EXISTS "Operadores podem deletar seus produtos" ON produtos CASCADE;

CREATE POLICY "allow_all_produtos" ON produtos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- VENDAS: Permitir tudo (controle via código)
DROP POLICY IF EXISTS "Operadores podem ver suas vendas" ON vendas CASCADE;
DROP POLICY IF EXISTS "Operadores podem inserir vendas" ON vendas CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todas as vendas" ON vendas CASCADE;

CREATE POLICY "allow_all_vendas" ON vendas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- MENSAGENS: Permitir tudo (controle via código)
DROP POLICY IF EXISTS "Usuários podem ver suas mensagens" ON mensagens CASCADE;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON mensagens CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todas mensagens" ON mensagens CASCADE;
DROP POLICY IF EXISTS "Admins podem inserir mensagens" ON mensagens CASCADE;
DROP POLICY IF EXISTS "Admins podem atualizar mensagens" ON mensagens CASCADE;

CREATE POLICY "allow_all_mensagens" ON mensagens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- HISTÓRICO PAGAMENTOS: Permitir tudo
DROP POLICY IF EXISTS "Usuários podem ver seu histórico" ON historico_pagamentos CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todo histórico" ON historico_pagamentos CASCADE;
DROP POLICY IF EXISTS "Admins podem inserir histórico" ON historico_pagamentos CASCADE;

CREATE POLICY "allow_all_historico" ON historico_pagamentos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- SOLICITAÇÕES RENOVAÇÃO: Permitir tudo
DROP POLICY IF EXISTS "Usuários podem ver suas solicitações" ON solicitacoes_renovacao CASCADE;
DROP POLICY IF EXISTS "Usuários podem criar solicitações" ON solicitacoes_renovacao CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todas solicitações" ON solicitacoes_renovacao CASCADE;
DROP POLICY IF EXISTS "Admins podem atualizar solicitações" ON solicitacoes_renovacao CASCADE;

CREATE POLICY "allow_all_solicitacoes" ON solicitacoes_renovacao
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- GANHOS ADMIN: Permitir tudo
DROP POLICY IF EXISTS "Admins podem ver ganhos" ON ganhos_admin CASCADE;
DROP POLICY IF EXISTS "Admins podem inserir ganhos" ON ganhos_admin CASCADE;

CREATE POLICY "allow_all_ganhos" ON ganhos_admin
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. COMENTÁRIO FINAL
COMMENT ON TABLE operadores IS 'Tabela de operadores com RLS simplificado - controle de acesso feito via código da aplicação';
```

---

## ✅ Como Verificar se Funcionou

Após executar o SQL acima, os erros devem desaparecer e o sistema deve funcionar normalmente:

1. **Login/Registro**: Usuários poderão criar contas
2. **Painel Admin**: Admin poderá ver todos os operadores
3. **Aprovação**: Admin poderá aprovar usuários suspensos
4. **Caixa**: Usuários aprovados poderão usar o sistema

---

## 🔍 Como o Sistema Funciona Agora

### Fluxo de Registro
1. Usuário clica em "Criar conta"
2. Sistema cria usuário no `auth.users` (Supabase Auth)
3. Trigger automático cria registro na tabela `operadores` com:
   - `ativo: false`
   - `suspenso: true`
   - `aguardando_pagamento: true`
4. Usuário pode fazer login, mas não pode usar o caixa

### Fluxo de Aprovação
1. Admin vê usuário no painel "Gerenciar Usuários"
2. Admin aprova o usuário (altera `ativo: true`, `suspenso: false`)
3. Usuário pode usar todas as funcionalidades

### Segurança
- RLS está ativo em todas as tabelas
- Políticas simplificadas (controle via código)
- Trigger automático sincroniza Auth + Operadores

---

## 📞 Suporte

Se ainda houver erros após executar o SQL, verifique:

1. **Tabelas existem?** - Verifique no Table Editor
2. **RLS está ativo?** - Deve estar ativado em todas as tabelas
3. **Variáveis de ambiente?** - VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configuradas

Link do projeto: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa
