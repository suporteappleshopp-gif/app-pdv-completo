-- ============================================
-- SISTEMA DE DEVOLUÇÕES EM TEMPO REAL
-- ============================================
-- Quando uma devolução é registrada na tabela 'avarias':
-- 1. Se o destino for ESTOQUE: o produto volta ao estoque automaticamente
-- 2. Se o destino for AVARIA: o produto NÃO volta ao estoque
-- 3. Em ambos os casos: o valor é retirado do painel de ganhos do usuário
-- 4. Se for AVARIA: o valor é registrado no painel de controle de avarias
-- ============================================

-- ============================================
-- 1. CRIAR TABELA DE DEVOLUÇÕES
-- ============================================
-- Rastreia todas as devoluções de produtos
CREATE TABLE IF NOT EXISTS public.devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  venda_id TEXT REFERENCES public.vendas(id) ON DELETE SET NULL,
  produto_id TEXT REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario DECIMAL(10, 2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total >= 0),
  motivo TEXT NOT NULL,
  tipo_destino TEXT NOT NULL CHECK (tipo_destino IN ('estoque', 'avaria')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_devolucoes_user_id ON public.devolucoes(user_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_venda_id ON public.devolucoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_produto_id ON public.devolucoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_tipo_destino ON public.devolucoes(tipo_destino);
CREATE INDEX IF NOT EXISTS idx_devolucoes_created_at ON public.devolucoes(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias devoluções
CREATE POLICY "Usuários podem ver suas próprias devoluções"
  ON public.devolucoes
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem inserir suas próprias devoluções
CREATE POLICY "Usuários podem inserir suas próprias devoluções"
  ON public.devolucoes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin pode ver todas as devoluções
CREATE POLICY "Admin pode ver todas as devoluções"
  ON public.devolucoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.devolucoes;

-- ============================================
-- 2. ADICIONAR COLUNA tipo_destino NA TABELA AVARIAS
-- ============================================
-- Para diferenciar entre avarias que devem voltar ao estoque ou não
ALTER TABLE public.avarias
ADD COLUMN IF NOT EXISTS tipo_destino TEXT CHECK (tipo_destino IN ('estoque', 'avaria')) DEFAULT 'avaria';

-- ============================================
-- 3. FUNÇÃO: PROCESSAR DEVOLUÇÃO AUTOMÁTICA
-- ============================================
-- Quando uma devolução é inserida, atualiza automaticamente:
-- - Estoque (se tipo_destino = 'estoque')
-- - Painel de ganhos (sempre)
-- - Tabela de avarias (se tipo_destino = 'avaria')
CREATE OR REPLACE FUNCTION processar_devolucao_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_produto_id TEXT;
BEGIN
  -- Pegar user_id e produto_id
  v_user_id := NEW.user_id;
  v_produto_id := NEW.produto_id;

  -- ============================================
  -- 1. ATUALIZAR ESTOQUE (se tipo_destino = 'estoque')
  -- ============================================
  IF NEW.tipo_destino = 'estoque' THEN
    -- Devolver produto ao estoque
    UPDATE public.produtos
    SET estoque = estoque + NEW.quantidade,
        updated_at = NOW()
    WHERE id = v_produto_id AND user_id = v_user_id;

    RAISE NOTICE '✅ ESTOQUE ATUALIZADO: Produto % teve %x unidades devolvidas ao estoque', NEW.produto_nome, NEW.quantidade;
  ELSE
    RAISE NOTICE '⚠️ AVARIA REGISTRADA: Produto % teve %x unidades registradas como avaria (NÃO volta ao estoque)', NEW.produto_nome, NEW.quantidade;
  END IF;

  -- ============================================
  -- 2. REGISTRAR NA TABELA DE AVARIAS (se tipo_destino = 'avaria')
  -- ============================================
  IF NEW.tipo_destino = 'avaria' THEN
    INSERT INTO public.avarias (
      user_id,
      venda_id,
      produto_id,
      produto_nome,
      quantidade,
      valor_unitario,
      valor_total,
      motivo,
      observacoes,
      tipo_destino
    ) VALUES (
      NEW.user_id,
      NEW.venda_id,
      NEW.produto_id,
      NEW.produto_nome,
      NEW.quantidade,
      NEW.valor_unitario,
      NEW.valor_total,
      NEW.motivo,
      NEW.observacoes,
      'avaria'
    );

    RAISE NOTICE '✅ AVARIA INSERIDA: Registrada na tabela de avarias';
  END IF;

  -- ============================================
  -- 3. ATUALIZAR VENDA NO SUPABASE
  -- ============================================
  -- Reduzir o total da venda
  UPDATE public.vendas
  SET total = total - NEW.valor_total
  WHERE id = NEW.venda_id;

  RAISE NOTICE '✅ VENDA ATUALIZADA: Total reduzido em R$ %', NEW.valor_total;

  -- ============================================
  -- 4. ATUALIZAR ITENS DA VENDA
  -- ============================================
  -- Reduzir ou remover item da venda
  UPDATE public.itens_venda
  SET quantidade = quantidade - NEW.quantidade,
      subtotal = subtotal - NEW.valor_total
  WHERE venda_id = NEW.venda_id AND produto_id = v_produto_id;

  -- Se quantidade zerou, remover item
  DELETE FROM public.itens_venda
  WHERE venda_id = NEW.venda_id
    AND produto_id = v_produto_id
    AND quantidade <= 0;

  RAISE NOTICE '✅ ITENS DA VENDA ATUALIZADOS';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGER: EXECUTAR APÓS INSERIR DEVOLUÇÃO
-- ============================================
DROP TRIGGER IF EXISTS trigger_processar_devolucao ON public.devolucoes;
CREATE TRIGGER trigger_processar_devolucao
  AFTER INSERT ON public.devolucoes
  FOR EACH ROW
  EXECUTE FUNCTION processar_devolucao_automatica();

-- ============================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE public.devolucoes IS 'Registro de devoluções de produtos com atualização automática de estoque e financeiro';
COMMENT ON COLUMN public.devolucoes.tipo_destino IS 'Destino do produto: estoque (volta ao estoque) ou avaria (não volta ao estoque)';
COMMENT ON COLUMN public.devolucoes.motivo IS 'Motivo da devolução';
COMMENT ON COLUMN public.devolucoes.valor_total IS 'Valor total da devolução (descontado do painel de ganhos)';

COMMENT ON FUNCTION processar_devolucao_automatica IS 'Processa devolução automaticamente: atualiza estoque (se estoque), registra avaria (se avaria), atualiza venda e itens';
COMMENT ON TRIGGER trigger_processar_devolucao ON public.devolucoes IS 'Executa após inserir devolução para processar automaticamente';
