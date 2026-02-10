import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigracao() {
  console.log('🔧 APLICANDO MIGRAÇÃO: Criar tabela itens_venda\n');
  console.log('═'.repeat(60));

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    const sql = `
-- Criar tabela itens_venda para armazenar produtos de cada venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda(produto_id);

-- Habilitar Row Level Security
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Todos podem ver itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Todos podem inserir itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Todos podem atualizar itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Todos podem deletar itens de venda" ON public.itens_venda;

-- Políticas RLS: acesso público para leitura e escrita
CREATE POLICY "Todos podem ver itens de venda"
ON public.itens_venda FOR SELECT
USING (true);

CREATE POLICY "Todos podem inserir itens de venda"
ON public.itens_venda FOR INSERT
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar itens de venda"
ON public.itens_venda FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Todos podem deletar itens de venda"
ON public.itens_venda FOR DELETE
USING (true);

-- Permissões para roles anon e authenticated
GRANT ALL ON public.itens_venda TO anon, authenticated;
    `;

    await client.query(sql);

    console.log('\n✅ MIGRAÇÃO APLICADA COM SUCESSO!');
    console.log('   - Tabela itens_venda criada');
    console.log('   - Colunas: id, venda_id, produto_id, nome, quantidade, preco_unitario, subtotal');
    console.log('   - Índices criados para venda_id e produto_id');
    console.log('   - RLS habilitado com políticas públicas');
    console.log('   - Permissões concedidas a anon e authenticated');

  } catch (error: any) {
    console.error('\n❌ ERRO ao aplicar migração:');
    console.error('   Mensagem:', error.message);
    if (error.code) console.error('   Código:', error.code);
  } finally {
    await client.end();
    console.log('\n═'.repeat(60));
  }
}

aplicarMigracao();
