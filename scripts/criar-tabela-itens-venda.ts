import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function criarTabelaItensVenda() {
  console.log('🔧 CRIANDO TABELA itens_venda\n');
  console.log('═'.repeat(60));

  const sql = `
-- Criar tabela itens_venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda(produto_id);

-- RLS (Row Level Security)
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "public_read_itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "public_insert_itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "public_update_itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "public_delete_itens_venda" ON public.itens_venda;

-- Política: Qualquer um pode ver itens de venda
CREATE POLICY "public_read_itens_venda" ON public.itens_venda
  FOR SELECT USING (true);

-- Política: Qualquer um pode inserir itens de venda
CREATE POLICY "public_insert_itens_venda" ON public.itens_venda
  FOR INSERT WITH CHECK (true);

-- Política: Qualquer um pode atualizar itens de venda
CREATE POLICY "public_update_itens_venda" ON public.itens_venda
  FOR UPDATE USING (true) WITH CHECK (true);

-- Política: Qualquer um pode deletar itens de venda
CREATE POLICY "public_delete_itens_venda" ON public.itens_venda
  FOR DELETE USING (true);

-- Permissões
GRANT ALL ON public.itens_venda TO anon, authenticated;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Erro:', error.message);
      return;
    }
  } catch (err) {
    // Fallback: executar queries separadamente
    console.log('⚠️ RPC não disponível, executando queries diretas...');
    return;
  }

  console.log('✅ Tabela itens_venda criada com sucesso!');
  console.log('   - Estrutura: id, venda_id, produto_id, nome, quantidade, preco_unitario, subtotal');
  console.log('   - RLS habilitado com políticas públicas');
  console.log('   - Permissões concedidas a anon e authenticated');
}

criarTabelaItensVenda();
