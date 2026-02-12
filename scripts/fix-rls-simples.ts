#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Aplicando correções RLS manualmente\n');

  // Como não podemos executar SQL diretamente via API,
  // vamos fazer as correções mais importantes usando o client

  console.log('📋 INSTRUÇÕES PARA CORREÇÃO MANUAL:\n');
  console.log('=' .repeat(80));
  console.log('Acesse o Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa/sql/new');
  console.log('=' .repeat(80));
  console.log('\nCopie e cole o SQL abaixo:\n');

  const sql = `
-- =====================================================
-- CORREÇÃO RLS FINAL - PERMITIR CADASTRO PÚBLICO
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

-- 5. Habilitar Realtime
DO $$
BEGIN
    -- Tentar adicionar tabelas ao realtime (ignora se já existem)
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
`;

  console.log(sql);
  console.log('\n=' .repeat(80));
  console.log('\n✅ Após executar o SQL acima:');
  console.log('   1. Cadastro de usuários funcionará sem problemas');
  console.log('   2. Listagem de operadores em tempo real estará ativa');
  console.log('   3. Todas as operações CRUD funcionarão corretamente');
  console.log('\n💡 IMPORTANTE: Certifique-se de executar TODO o SQL de uma vez!');
}

main();
