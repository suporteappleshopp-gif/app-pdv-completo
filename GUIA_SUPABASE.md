# 🔌 Como Conectar seu Supabase

Seu projeto já está quase conectado! Siga os passos abaixo:

## 📋 Passo 1: Obter a Chave Anon do Supabase

1. **Acesse seu projeto no Supabase:**
   - Vá para: https://supabase.com/dashboard
   - Faça login e selecione seu projeto

2. **Encontre suas credenciais:**
   - No menu lateral, clique em **⚙️ Settings**
   - Depois clique em **API**

3. **Copie a chave Anon (public):**
   - Você verá uma seção chamada "Project API keys"
   - Copie a chave que está em **anon/public** (começa com "eyJ...")

## 🔧 Passo 2: Adicionar a Chave no Projeto

Abra o arquivo `.env.local` na raiz do projeto e substitua `sua_chave_anon_aqui` pela chave que você copiou.

O arquivo deve ficar assim:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ynkuovfplntzckecruvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ Passo 3: Verificar a Conexão

Seu projeto já está configurado para usar o Supabase! As seguintes funcionalidades estão prontas:

- ✅ Gerenciamento de Operadores
- ✅ Sistema de Chat em tempo real
- ✅ Sincronização automática de dados
- ✅ Controle de mensalidades e assinaturas

## 📊 Estrutura do Banco de Dados

Você precisa criar as seguintes tabelas no Supabase:

### Tabela: `operadores`
```sql
create table operadores (
  id text primary key,
  nome text not null,
  email text not null,
  senha text not null,
  is_admin boolean default false,
  ativo boolean default true,
  suspenso boolean default false,
  aguardando_pagamento boolean default false,
  forma_pagamento text,
  valor_mensal numeric,
  data_proximo_vencimento timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### Tabela: `mensagens_chat`
```sql
create table mensagens_chat (
  id text primary key,
  operador_id text references operadores(id),
  remetente text not null,
  texto text not null,
  lida boolean default false,
  created_at timestamp default now()
);
```

### Tabela: `empresas`
```sql
create table empresas (
  id text primary key,
  nome text not null,
  cnpj text not null,
  inscricao_estadual text,
  endereco text,
  telefone text,
  email text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### Tabela: `produtos`
```sql
create table produtos (
  id text primary key,
  nome text not null,
  codigo_barras text,
  preco numeric not null,
  estoque integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### Tabela: `vendas`
```sql
create table vendas (
  id text primary key,
  numero integer not null,
  operador_id text,
  operador_nome text,
  itens jsonb,
  total numeric not null,
  data_hora timestamp,
  status text,
  tipo_pagamento text,
  motivo_cancelamento text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### Tabela: `config_nfce`
```sql
create table config_nfce (
  id text primary key,
  empresa_id text references empresas(id),
  ambiente text,
  serie_nfce text,
  proximo_numero integer,
  token_csc text,
  id_csc text,
  regime_tributario text,
  aliquota_icms_padrao numeric,
  aliquota_pis_padrao numeric,
  aliquota_cofins_padrao numeric,
  cfop_padrao text,
  mensagem_nota text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

## 🚀 Como Criar as Tabelas

1. No dashboard do Supabase, vá em **SQL Editor**
2. Copie e cole cada comando SQL acima
3. Execute cada comando clicando em "Run"

## 💡 Pronto!

Depois de adicionar a chave e criar as tabelas, seu app estará totalmente conectado ao Supabase com sincronização em tempo real! 🎉
