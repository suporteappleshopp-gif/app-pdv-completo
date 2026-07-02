-- Adicionar colunas faltantes em historico_pagamentos
ALTER TABLE public.historico_pagamentos
  ADD COLUMN IF NOT EXISTS aprovado_por TEXT,
  ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dias_comprados INTEGER,
  ADD COLUMN IF NOT EXISTS data_solicitacao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS admin_responsavel_id TEXT;

-- Garantir RLS permissiva (igual às outras tabelas do app)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'historico_pagamentos' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.historico_pagamentos';
  END LOOP;
END $$;

ALTER TABLE public.historico_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_pagamentos_all" ON public.historico_pagamentos
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);