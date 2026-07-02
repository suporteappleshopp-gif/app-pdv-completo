-- Corrigir tabela ganhos_admin: adicionar colunas faltantes e garantir estrutura completa

-- Garantir que a tabela existe com estrutura correta
CREATE TABLE IF NOT EXISTS public.ganhos_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  usuario_id TEXT,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  dias_assinatura INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas faltantes se não existirem
ALTER TABLE public.ganhos_admin
  ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
  ADD COLUMN IF NOT EXISTS usuario_id TEXT,
  ADD COLUMN IF NOT EXISTS usuario_nome TEXT,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Tornar usuario_nome NOT NULL apenas se necessário (com default)
ALTER TABLE public.ganhos_admin
  ALTER COLUMN usuario_nome SET DEFAULT '';

-- Garantir RLS permissiva
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'ganhos_admin' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.ganhos_admin';
  END LOOP;
END $$;

ALTER TABLE public.ganhos_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ganhos_admin_all" ON public.ganhos_admin
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Garantir Realtime habilitado
ALTER TABLE public.ganhos_admin REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ganhos_admin;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON public.ganhos_admin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON public.ganhos_admin(tipo);