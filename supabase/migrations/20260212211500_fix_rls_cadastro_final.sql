-- =====================================================
-- FIX FINAL: PERMITIR CADASTRO PÚBLICO E REALTIME
-- =====================================================

-- 1. Remover trigger problemático
DROP TRIGGER IF EXISTS trigger_criar_operador ON auth.users CASCADE;
DROP FUNCTION IF EXISTS criar_operador_automatico() CASCADE;

-- 2. Limpar políticas antigas da tabela operadores
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'operadores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON operadores CASCADE', pol.policyname);
    END LOOP;
END $$;

-- 3. Criar políticas públicas corretas
CREATE POLICY "operadores_select_public" ON operadores
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "operadores_insert_public" ON operadores
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "operadores_update_public" ON operadores
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "operadores_delete_public" ON operadores
  FOR DELETE TO anon, authenticated USING (true);

-- 4. Garantir grants
GRANT ALL ON operadores TO anon, authenticated;
GRANT ALL ON historico_pagamentos TO anon, authenticated;
GRANT ALL ON produtos TO anon, authenticated;
GRANT ALL ON vendas TO anon, authenticated;
GRANT ALL ON solicitacoes_renovacao TO anon, authenticated;
GRANT ALL ON ganhos_admin TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. Habilitar Realtime (ignorar erros se já existir)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE operadores;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE historico_pagamentos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. Criar índices
CREATE INDEX IF NOT EXISTS idx_operadores_email ON operadores(email);
CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON operadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_operadores_ativo ON operadores(ativo);
CREATE INDEX IF NOT EXISTS idx_operadores_suspenso ON operadores(suspenso);

-- ✅ PRONTO!
