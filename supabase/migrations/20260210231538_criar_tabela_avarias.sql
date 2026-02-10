-- Criar tabela de avarias
-- Produtos devolvidos por avaria são registrados aqui e descontados do saldo do usuário

CREATE TABLE IF NOT EXISTS public.avarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario DECIMAL(10, 2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total >= 0),
  motivo TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avarias_user_id ON public.avarias(user_id);
CREATE INDEX IF NOT EXISTS idx_avarias_venda_id ON public.avarias(venda_id);
CREATE INDEX IF NOT EXISTS idx_avarias_produto_id ON public.avarias(produto_id);
CREATE INDEX IF NOT EXISTS idx_avarias_created_at ON public.avarias(created_at DESC);

-- RLS (Row Level Security) Policies
ALTER TABLE public.avarias ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver suas próprias avarias
CREATE POLICY "Usuários podem ver suas próprias avarias"
  ON public.avarias
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem inserir suas próprias avarias
CREATE POLICY "Usuários podem inserir suas próprias avarias"
  ON public.avarias
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar suas próprias avarias
CREATE POLICY "Usuários podem atualizar suas próprias avarias"
  ON public.avarias
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuários podem deletar suas próprias avarias
CREATE POLICY "Usuários podem deletar suas próprias avarias"
  ON public.avarias
  FOR DELETE
  USING (user_id = auth.uid());

-- Admin pode ver todas as avarias
CREATE POLICY "Admin pode ver todas as avarias"
  ON public.avarias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Habilitar Realtime para tabela de avarias
ALTER PUBLICATION supabase_realtime ADD TABLE public.avarias;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avarias_updated_at
  BEFORE UPDATE ON public.avarias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.avarias IS 'Registros de produtos devolvidos por avaria. O valor é descontado dos ganhos do usuário.';
COMMENT ON COLUMN public.avarias.user_id IS 'ID do usuário que registrou a avaria';
COMMENT ON COLUMN public.avarias.venda_id IS 'ID da venda relacionada (se houver)';
COMMENT ON COLUMN public.avarias.produto_id IS 'ID do produto com avaria';
COMMENT ON COLUMN public.avarias.produto_nome IS 'Nome do produto no momento da avaria';
COMMENT ON COLUMN public.avarias.quantidade IS 'Quantidade de produtos com avaria';
COMMENT ON COLUMN public.avarias.valor_unitario IS 'Valor unitário do produto';
COMMENT ON COLUMN public.avarias.valor_total IS 'Valor total da avaria (quantidade × valor_unitario)';
COMMENT ON COLUMN public.avarias.motivo IS 'Motivo da avaria (Devolução, Quebra, Vencimento, etc.)';
COMMENT ON COLUMN public.avarias.observacoes IS 'Observações adicionais sobre a avaria';
