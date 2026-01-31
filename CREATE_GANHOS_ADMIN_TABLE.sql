
-- Criar tabela ganhos_admin
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('conta-criada', 'mensalidade-paga')),
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS (sem restrições de segurança)
ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON ganhos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_usuario_id ON ganhos_admin(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON ganhos_admin(created_at);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_forma_pagamento ON ganhos_admin(forma_pagamento);
