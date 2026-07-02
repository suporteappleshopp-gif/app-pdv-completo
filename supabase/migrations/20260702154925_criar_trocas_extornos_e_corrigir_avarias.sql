-- =============================================================
-- Criar tabela trocas_extornos e corrigir tabela avarias
-- =============================================================

-- 1. CRIAR TABELA trocas_extornos
CREATE TABLE IF NOT EXISTS public.trocas_extornos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id TEXT NOT NULL,
  operador_id TEXT NOT NULL,
  operador_nome TEXT,
  tipo TEXT NOT NULL,                    -- 'troca' | 'extorno'
  numero TEXT NOT NULL,                  -- 'TROCA-12345678' | 'EXTORNO-12345678'
  itens_originais JSONB DEFAULT '[]',
  itens_novos JSONB DEFAULT '[]',
  valor_original NUMERIC(10,2) DEFAULT 0,
  valor_diferenca NUMERIC(10,2) DEFAULT 0,
  forma_pagamento_diferenca TEXT,
  motivo TEXT,
  observacoes TEXT,
  nota_referenciada TEXT,
  cfop_devolucao TEXT DEFAULT '5411',
  motivo_fiscal TEXT,
  status TEXT DEFAULT 'processado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS permissivo (controle por operador_id na camada de aplicação)
ALTER TABLE public.trocas_extornos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trocas_extornos_all" ON public.trocas_extornos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trocas_extornos_venda_id ON public.trocas_extornos(venda_id);
CREATE INDEX IF NOT EXISTS idx_trocas_extornos_operador_id ON public.trocas_extornos(operador_id);

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trocas_extornos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- =============================================================
-- 2. CORRIGIR TABELA avarias
-- Remover NOT NULL de user_id (código não envia esse campo)
-- Adicionar colunas que o código usa e podem não existir
-- Remover constraints CHECK de tipo_destino que bloqueiam valores
-- =============================================================

-- Garantir que a tabela avarias existe com estrutura básica
CREATE TABLE IF NOT EXISTS public.avarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  venda_id TEXT,
  produto_id TEXT,
  produto_nome TEXT,
  codigo_barras TEXT,
  quantidade NUMERIC(10,3) DEFAULT 0,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  motivo TEXT,
  observacoes TEXT,
  tipo_destino TEXT DEFAULT 'avaria',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tornar user_id nullable (o código não envia esse campo)
ALTER TABLE public.avarias ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar colunas que podem não existir
ALTER TABLE public.avarias ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
ALTER TABLE public.avarias ADD COLUMN IF NOT EXISTS tipo_destino TEXT DEFAULT 'avaria';

-- Remover qualquer constraint CHECK em tipo_destino que possa bloquear
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.avarias'::regclass AND contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.avarias DROP CONSTRAINT IF EXISTS "' || r.conname || '"';
  END LOOP;
END $$;

-- RLS permissivo
ALTER TABLE public.avarias ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'avarias' AND policyname = 'avarias_all'
  ) THEN
    CREATE POLICY "avarias_all" ON public.avarias
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================
-- 3. TRIGGER: ao inserir em avarias com tipo_destino='estoque',
--    devolver ao estoque do produto correto do operador
-- =============================================================

-- Remover triggers antigos para evitar conflito
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_devolucao ON public.avarias;
DROP TRIGGER IF EXISTS trigger_processar_devolucao_estoque ON public.avarias;
DROP FUNCTION IF EXISTS fn_atualizar_estoque_devolucao() CASCADE;
DROP FUNCTION IF EXISTS fn_processar_devolucao_estoque() CASCADE;

-- Criar função do trigger
CREATE OR REPLACE FUNCTION fn_devolver_estoque_avaria()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processa se tipo_destino = 'estoque' (troca retorna ao estoque)
  IF NEW.tipo_destino = 'estoque' THEN
    -- Tentar por codigo_barras primeiro (mais preciso)
    IF NEW.codigo_barras IS NOT NULL AND NEW.codigo_barras != '' THEN
      UPDATE public.produtos
        SET estoque = estoque + NEW.quantidade
      WHERE codigo_barras = NEW.codigo_barras
        AND user_id = NEW.user_id;

      IF FOUND THEN
        RAISE NOTICE 'Estoque devolvido via codigo_barras: % +%', NEW.codigo_barras, NEW.quantidade;
        RETURN NEW;
      END IF;
    END IF;

    -- Fallback: por nome do produto
    IF NEW.produto_nome IS NOT NULL THEN
      UPDATE public.produtos
        SET estoque = estoque + NEW.quantidade
      WHERE nome = NEW.produto_nome
        AND user_id = NEW.user_id;

      IF FOUND THEN
        RAISE NOTICE 'Estoque devolvido via nome: % +%', NEW.produto_nome, NEW.quantidade;
      ELSE
        RAISE NOTICE 'Produto não encontrado para devolução: % (user: %)', NEW.produto_nome, NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER trigger_devolver_estoque_avaria
  AFTER INSERT ON public.avarias
  FOR EACH ROW
  EXECUTE FUNCTION fn_devolver_estoque_avaria();
