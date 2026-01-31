-- Criar tabela para histórico de pagamentos dos usuários
-- Esta tabela registra todas as compras de dias e será exibida no extrato do usuário

CREATE TABLE IF NOT EXISTS historico_pagamentos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_comprados INTEGER NOT NULL,
  tipo_compra TEXT NOT NULL,
  mercadopago_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relacionamento com operadores
  FOREIGN KEY (usuario_id) REFERENCES operadores(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_usuario_id ON historico_pagamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_status ON historico_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_data_pagamento ON historico_pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_mercadopago ON historico_pagamentos(mercadopago_payment_id);

-- RLS (Row Level Security)
ALTER TABLE historico_pagamentos ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios pagamentos
CREATE POLICY "Usuarios podem ver seus proprios pagamentos"
ON historico_pagamentos
FOR SELECT
USING (usuario_id = current_setting('app.current_user_id', true)::TEXT);

-- Política: Apenas o sistema pode inserir/atualizar
CREATE POLICY "Sistema pode inserir pagamentos"
ON historico_pagamentos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar pagamentos"
ON historico_pagamentos
FOR UPDATE
USING (true);

-- Comentários para documentação
COMMENT ON TABLE historico_pagamentos IS 'Histórico completo de pagamentos dos usuários';
COMMENT ON COLUMN historico_pagamentos.dias_comprados IS 'Quantidade de dias adicionados nesta compra';
COMMENT ON COLUMN historico_pagamentos.tipo_compra IS 'Tipo de compra realizada (renovacao-60, renovacao-180, etc)';
COMMENT ON COLUMN historico_pagamentos.mercadopago_payment_id IS 'ID do pagamento no Mercado Pago para rastreamento';
