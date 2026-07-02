-- Adicionar colunas faltantes em solicitacoes_renovacao
ALTER TABLE public.solicitacoes_renovacao
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT;

-- Garantir que RLS está desabilitado ou tem policy permissiva
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'solicitacoes_renovacao' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.solicitacoes_renovacao';
  END LOOP;
END $$;

ALTER TABLE public.solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solicitacoes_renovacao_all" ON public.solicitacoes_renovacao
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);