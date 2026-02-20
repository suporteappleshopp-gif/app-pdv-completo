import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // SQL da migration
    const sql = `
-- Criar tabela de devoluções
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

CREATE INDEX IF NOT EXISTS idx_devolucoes_user_id ON public.devolucoes(user_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_venda_id ON public.devolucoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_produto_id ON public.devolucoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_tipo_destino ON public.devolucoes(tipo_destino);
CREATE INDEX IF NOT EXISTS idx_devolucoes_created_at ON public.devolucoes(created_at DESC);

ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias devoluções" ON public.devolucoes;
CREATE POLICY "Usuários podem ver suas próprias devoluções"
  ON public.devolucoes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias devoluções" ON public.devolucoes;
CREATE POLICY "Usuários podem inserir suas próprias devoluções"
  ON public.devolucoes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin pode ver todas as devoluções" ON public.devolucoes;
CREATE POLICY "Admin pode ver todas as devoluções"
  ON public.devolucoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid() AND is_admin = true));

-- Adicionar coluna tipo_destino na tabela avarias
ALTER TABLE public.avarias ADD COLUMN IF NOT EXISTS tipo_destino TEXT CHECK (tipo_destino IN ('estoque', 'avaria')) DEFAULT 'avaria';

-- Função para processar devolução
CREATE OR REPLACE FUNCTION processar_devolucao_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_produto_id TEXT;
BEGIN
  v_user_id := NEW.user_id;
  v_produto_id := NEW.produto_id;

  IF NEW.tipo_destino = 'estoque' THEN
    UPDATE public.produtos
    SET estoque = estoque + NEW.quantidade, updated_at = NOW()
    WHERE id = v_produto_id AND user_id = v_user_id;
    RAISE NOTICE 'ESTOQUE ATUALIZADO';
  ELSE
    INSERT INTO public.avarias (user_id, venda_id, produto_id, produto_nome, quantidade, valor_unitario, valor_total, motivo, observacoes, tipo_destino)
    VALUES (NEW.user_id, NEW.venda_id, NEW.produto_id, NEW.produto_nome, NEW.quantidade, NEW.valor_unitario, NEW.valor_total, NEW.motivo, NEW.observacoes, 'avaria');
    RAISE NOTICE 'AVARIA REGISTRADA';
  END IF;

  UPDATE public.vendas SET total = total - NEW.valor_total WHERE id = NEW.venda_id;
  UPDATE public.itens_venda SET quantidade = quantidade - NEW.quantidade, subtotal = subtotal - NEW.valor_total
  WHERE venda_id = NEW.venda_id AND produto_id = v_produto_id;
  DELETE FROM public.itens_venda WHERE venda_id = NEW.venda_id AND produto_id = v_produto_id AND quantidade <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_processar_devolucao ON public.devolucoes;
CREATE TRIGGER trigger_processar_devolucao
  AFTER INSERT ON public.devolucoes
  FOR EACH ROW EXECUTE FUNCTION processar_devolucao_automatica();
`;

    // Executar via query bruta
    const { error } = await supabaseClient.rpc('exec_raw_sql', { sql })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migration aplicada com sucesso!' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
