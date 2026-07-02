-- Corrigir schema de historico_pagamentos
-- A tabela atual (20260212031434) já tem: operador_id, tipo_pagamento, aprovado_por, data_solicitacao, data_aprovacao
-- Só precisamos garantir policy permissiva e tipo correto do aprovado_por

-- Garantir policy permissiva (o app usa anon key)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'historico_pagamentos' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.historico_pagamentos';
  END LOOP;
END $$;

ALTER TABLE public.historico_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico_pagamentos_all" ON public.historico_pagamentos
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);