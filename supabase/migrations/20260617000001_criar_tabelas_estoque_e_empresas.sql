-- Criar tabela empresas (caso não exista)
CREATE TABLE IF NOT EXISTS public.empresas (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  nome TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_empresas_select" ON public.empresas;
DROP POLICY IF EXISTS "allow_all_empresas_insert" ON public.empresas;
DROP POLICY IF EXISTS "allow_all_empresas_update" ON public.empresas;
DROP POLICY IF EXISTS "allow_all_empresas_delete" ON public.empresas;

CREATE POLICY "allow_all_empresas_select" ON public.empresas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_all_empresas_insert" ON public.empresas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_all_empresas_update" ON public.empresas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_empresas_delete" ON public.empresas FOR DELETE TO anon, authenticated USING (true);

-- Criar tabela lojas
CREATE TABLE IF NOT EXISTS public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'filial',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lojas_user_id ON public.lojas(user_id);

-- Criar tabela notas_fiscais
-- chave_acesso é UNIQUE mas nullable (entradas manuais usam NULL)
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  loja_id UUID,
  numero_nota TEXT NOT NULL,
  serie TEXT DEFAULT '0',
  chave_acesso TEXT UNIQUE,
  cnpj_emitente TEXT,
  nome_emitente TEXT,
  data_emissao TIMESTAMPTZ,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_frete NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_ipi NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_icms NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_pis NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_cofins NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_outros NUMERIC(15,2) NOT NULL DEFAULT 0,
  xml_content TEXT,
  status TEXT NOT NULL DEFAULT 'processada' CHECK (status IN ('processada', 'pendente', 'erro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_user_id ON public.notas_fiscais(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_loja_id ON public.notas_fiscais(loja_id);

-- Criar tabela itens_nota_fiscal
CREATE TABLE IF NOT EXISTS public.itens_nota_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  loja_id UUID,
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'UN',
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_ipi NUMERIC(15,2) DEFAULT 0,
  valor_frete_rateado NUMERIC(15,2) DEFAULT 0,
  custo_unitario_calculado NUMERIC(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.itens_nota_fiscal ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_itens_nota_user_id ON public.itens_nota_fiscal(user_id);
CREATE INDEX IF NOT EXISTS idx_itens_nota_nota_id ON public.itens_nota_fiscal(nota_fiscal_id);

-- Criar tabela movimentacoes_estoque
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  loja_origem_id UUID,
  loja_destino_id UUID,
  quantidade NUMERIC(15,4) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'ajuste', 'avaria')),
  motivo TEXT,
  operador_nome TEXT,
  nota_fiscal_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_user_id ON public.movimentacoes_estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON public.movimentacoes_estoque(produto_id);

-- Adicionar colunas de estoque ao produtos (caso não existam)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS venda_por_kg BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loja_id UUID,
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_custo_compra NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
