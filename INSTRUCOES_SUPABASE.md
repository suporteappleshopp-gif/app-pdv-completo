# 📋 Instruções para Aplicar Migração no Supabase

## 🎯 Objetivo
Criar a tabela `ganhos_admin` no banco de dados Supabase para rastrear ganhos do administrador por assinaturas.

## 📝 Passos para Aplicar a Migração

### 1. Acesse o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard
- Faça login com sua conta
- Selecione o projeto do PDV

### 2. Abra o SQL Editor
- No menu lateral, clique em **SQL Editor** (ícone de código)
- Clique em **New Query** para criar uma nova consulta

### 3. Cole o SQL Abaixo e Execute

```sql
-- Tabela para registrar ganhos do admin (assinaturas e contas criadas)
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('conta-criada', 'mensalidade-paga')),
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relacionamento com operadores
  FOREIGN KEY (usuario_id) REFERENCES operadores(id) ON DELETE CASCADE
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON ganhos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_usuario_id ON ganhos_admin(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON ganhos_admin(created_at);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_forma_pagamento ON ganhos_admin(forma_pagamento);

-- Comentários para documentação
COMMENT ON TABLE ganhos_admin IS 'Registra todos os ganhos do administrador (contas criadas e mensalidades pagas)';
COMMENT ON COLUMN ganhos_admin.tipo IS 'Tipo de ganho: conta-criada ou mensalidade-paga';
COMMENT ON COLUMN ganhos_admin.forma_pagamento IS 'Forma de pagamento: pix (R$ 59,90 - 60 dias) ou cartao (R$ 149,70 - 180 dias)';
```

### 4. Clique em **RUN** para executar o script

### 5. Verifique se a Tabela foi Criada
- No menu lateral, clique em **Table Editor**
- Procure pela tabela **ganhos_admin**
- Verifique se possui as colunas:
  - id (TEXT)
  - tipo (TEXT)
  - usuario_id (TEXT)
  - usuario_nome (TEXT)
  - valor (NUMERIC)
  - forma_pagamento (TEXT)
  - descricao (TEXT)
  - created_at (TIMESTAMP WITH TIME ZONE)

## ✅ Pronto!
A tabela foi criada com sucesso e o sistema já está configurado para sincronizar os ganhos do admin em tempo real!

## 📊 Funcionalidades
- **Registro automático** de ganhos ao criar contas
- **Registro automático** de ganhos ao confirmar pagamentos
- **Sincronização em tempo real** - ganhos aparecem instantaneamente na carteira
- **Histórico completo** com filtros por tipo, usuário e mês
- **Totalizadores** separados por forma de pagamento (PIX e Cartão)

## 🔍 Consultas Úteis

### Ver todos os ganhos
```sql
SELECT * FROM ganhos_admin ORDER BY created_at DESC;
```

### Total geral de ganhos
```sql
SELECT SUM(valor) as total FROM ganhos_admin;
```

### Total por forma de pagamento
```sql
SELECT forma_pagamento, SUM(valor) as total
FROM ganhos_admin
GROUP BY forma_pagamento;
```

### Ganhos do mês atual
```sql
SELECT * FROM ganhos_admin
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
ORDER BY created_at DESC;
```
