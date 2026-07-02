-- =============================================================
-- FIX: Garantir que TODAS as vendas apareçam no histórico
-- Problema: políticas RLS antigas com auth.uid() bloqueavam
-- vendas quando o usuário não estava autenticado via Auth,
-- ou quando havia conflito entre políticas permissivas e restritivas.
-- =============================================================

-- Remover TODAS as políticas existentes em vendas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vendas' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.vendas';
  END LOOP;
END $$;

-- Habilitar RLS em vendas
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva única: anon e authenticated podem tudo
-- (isolamento por operador_id é feito na camada de aplicação via .eq("operador_id", ...))
CREATE POLICY "vendas_all" ON public.vendas
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- FIX: Garantir que itens_venda também esteja acessível
-- =============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'itens_venda' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.itens_venda';
  END LOOP;
END $$;

ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itens_venda_all" ON public.itens_venda
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- Garantir que realtime está habilitado para vendas e itens_venda
-- =============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;