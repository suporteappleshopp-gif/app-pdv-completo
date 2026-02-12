#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executarSQL(sql: string, descricao: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Ignorar erros esperados
      if (
        error.message.includes('does not exist') ||
        error.message.includes('already exists') ||
        error.message.includes('already in publication')
      ) {
        console.log(`⚠️  ${descricao}: ${error.message.substring(0, 60)}... (ignorado)`);
        return true;
      }
      console.error(`❌ ${descricao}: ${error.message}`);
      return false;
    }

    console.log(`✅ ${descricao}`);
    return true;
  } catch (err: any) {
    console.error(`❌ ${descricao}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Corrigindo RLS e Cadastro de Usuários\n');

  // Como não podemos criar a função exec_sql automaticamente,
  // vamos usar uma abordagem diferente: executar queries diretas

  console.log('🔧 Testando conexão com Supabase...\n');

  // Testar conexão listando operadores
  const { data: testData, error: testError } = await supabase
    .from('operadores')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('❌ Erro ao conectar:', testError.message);
    process.exit(1);
  }

  console.log('✅ Conexão OK!\n');

  console.log('📋 SQL a ser executado manualmente no Supabase:\n');
  console.log('=' .repeat(80));

  const sqlScript = `
-- =====================================================
-- FIX RLS: Permitir Cadastro Público
-- =====================================================

-- 1. Remover trigger problemático
DROP TRIGGER IF EXISTS trigger_criar_operador ON auth.users CASCADE;
DROP FUNCTION IF EXISTS criar_operador_automatico() CASCADE;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "allow_select_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_update_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_select_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_insert_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_update_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_delete_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "public_all_operadores" ON operadores CASCADE;
DROP POLICY IF EXISTS "operadores_select_public" ON operadores CASCADE;
DROP POLICY IF EXISTS "operadores_insert_public" ON operadores CASCADE;
DROP POLICY IF EXISTS "operadores_update_public" ON operadores CASCADE;
DROP POLICY IF EXISTS "operadores_delete_public" ON operadores CASCADE;

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
ALTER PUBLICATION supabase_realtime ADD TABLE operadores;
ALTER PUBLICATION supabase_realtime ADD TABLE historico_pagamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

-- ✅ Pronto!
`;

  console.log(sqlScript);
  console.log('=' .repeat(80));
  console.log('\n📍 Acesse: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
  console.log('📝 Copie e cole o SQL acima no editor');
  console.log('▶️  Clique em "Run" para executar');
  console.log('\n✅ Isso corrigirá o problema de cadastro e listagem de usuários!');
}

main();
