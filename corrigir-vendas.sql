-- Recriar tabela vendas com estrutura completa
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;

CREATE TABLE vendas (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  operador_id TEXT NOT NULL,
  operador_nome TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao-debito', 'cartao-credito')),
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (operador_id) REFERENCES operadores(id) ON DELETE CASCADE
);

CREATE TABLE itens_venda (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE
);

-- Desabilitar RLS para acesso total
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_vendas_operador ON vendas(operador_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
