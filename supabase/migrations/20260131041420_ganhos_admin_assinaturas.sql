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
