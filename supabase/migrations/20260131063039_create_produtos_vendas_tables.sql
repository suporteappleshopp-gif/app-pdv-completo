-- ============================================
-- TABELAS PARA PRODUTOS E VENDAS (PERFIL ÚNICO)
-- ============================================
-- Cada usuário tem seus próprios produtos e vendas isolados
-- Garantindo que os dados não se misturem entre navegadores/dispositivos
-- ============================================

-- TABELA DE PRODUTOS (isolada por user_id)
CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  codigo_barras TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  categoria TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relacionamento com operadores
  FOREIGN KEY (user_id) REFERENCES operadores(id) ON DELETE CASCADE
);

-- Desabilitar RLS (acesso total)
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);

-- TABELA DE VENDAS (isolada por operador_id)
CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL,
  operador_id TEXT NOT NULL,
  operador_nome TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  tipo_pagamento TEXT,
  status TEXT NOT NULL CHECK (status IN ('concluida', 'cancelada')),
  motivo_cancelamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relacionamento com operadores
  FOREIGN KEY (operador_id) REFERENCES operadores(id) ON DELETE CASCADE
);

-- Desabilitar RLS (acesso total)
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_vendas_operador_id ON vendas(operador_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON vendas(numero);

-- TABELA DE ITENS DE VENDA (relacionado com vendas)
CREATE TABLE IF NOT EXISTS itens_venda (
  id TEXT PRIMARY KEY,
  venda_id TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,

  -- Relacionamento com vendas
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE
);

-- Desabilitar RLS (acesso total)
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON itens_venda(produto_id);

-- Comentários para documentação
COMMENT ON TABLE produtos IS 'Produtos do estoque isolados por usuário (perfil único em qualquer navegador)';
COMMENT ON COLUMN produtos.user_id IS 'ID do usuário dono dos produtos - garante isolamento total';
COMMENT ON COLUMN produtos.codigo_barras IS 'Código de barras para leitura por câmera, USB ou digitação';

COMMENT ON TABLE vendas IS 'Vendas realizadas isoladas por operador (perfil único em qualquer navegador)';
COMMENT ON COLUMN vendas.operador_id IS 'ID do operador - garante que vendas não se misturem entre usuários';

COMMENT ON TABLE itens_venda IS 'Itens de cada venda (relacionado com tabela vendas)';
