-- =============================================================
-- Recria a tabela registros_caixa (abertura/fechamento de caixa)
-- Esta tabela é usada pelo componente GestaoCaixa (abertura e
-- fechamento de caixa). Ela havia sido perdida na migração do
-- projeto de banco de dados, causando erro 404 (PGRST205) ao
-- abrir/fechar caixa. RLS permissiva, igual a movimentacoes_caixa,
-- filtrando por operador_id no client-side.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.registros_caixa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id     TEXT NOT NULL,
  operador_nome   TEXT,
  tipo            TEXT NOT NULL DEFAULT 'abertura',
  valor_inicial   NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_final     NUMERIC(12,2),
  total_vendas     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_dinheiro  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credito   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_debito    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pix       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_outros    NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade_vendas INTEGER NOT NULL DEFAULT 0,
  observacoes     TEXT,
  data_hora       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para a consulta principal (por operador + data)
CREATE INDEX IF NOT EXISTS registros_caixa_operador_data_idx
  ON public.registros_caixa (operador_id, data_hora DESC);

COMMENT ON TABLE public.registros_caixa IS 'Registros de abertura e fechamento de caixa por operador';

-- =============================================================
-- RLS (permissiva, mesmo padrão de movimentacoes_caixa)
-- =============================================================
ALTER TABLE public.registros_caixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_registros_caixa" ON public.registros_caixa;
DROP POLICY IF EXISTS "usuarios_registros_caixa" ON public.registros_caixa;

CREATE POLICY "anon_registros_caixa" ON public.registros_caixa
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "usuarios_registros_caixa" ON public.registros_caixa
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================================
-- Realtime (opcional, para atualização em tempo real)
-- =============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_caixa;
  END IF;
END $$;

-- Recarrega o cache de schema do PostgREST para a nova tabela aparecer
NOTIFY pgrst, 'reload schema';
