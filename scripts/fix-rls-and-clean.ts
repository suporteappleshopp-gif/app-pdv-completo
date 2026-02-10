import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executarSQL(sql: string, descricao: string) {
  console.log(`\n📌 ${descricao}`);
  console.log(`SQL: ${sql.substring(0, 100)}...`);

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error(`❌ Erro:`, error);
    return false;
  }

  console.log(`✅ Sucesso!`);
  return true;
}

async function fixRLSAndClean() {
  console.log('🚀 Iniciando limpeza e correção de RLS...\n');

  // 1. Limpar dados
  console.log('═══ FASE 1: LIMPEZA DE DADOS ═══');

  await executarSQL('TRUNCATE TABLE produtos CASCADE;', 'Limpar tabela produtos');
  await executarSQL('TRUNCATE TABLE vendas CASCADE;', 'Limpar tabela vendas');
  await executarSQL('TRUNCATE TABLE ganhos_admin CASCADE;', 'Limpar tabela ganhos_admin');
  await executarSQL('TRUNCATE TABLE solicitacoes_renovacao CASCADE;', 'Limpar tabela solicitacoes_renovacao');
  await executarSQL('TRUNCATE TABLE historico_pagamentos CASCADE;', 'Limpar tabela historico_pagamentos');
  await executarSQL('TRUNCATE TABLE operadores CASCADE;', 'Limpar tabela operadores');

  // 2. Remover políticas antigas
  console.log('\n═══ FASE 2: REMOVER POLÍTICAS ANTIGAS ═══');

  await executarSQL('DROP POLICY IF EXISTS "allow_select_operadores" ON operadores;', 'Remover policy allow_select_operadores');
  await executarSQL('DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores;', 'Remover policy allow_insert_operadores');
  await executarSQL('DROP POLICY IF EXISTS "allow_update_operadores" ON operadores;', 'Remover policy allow_update_operadores');
  await executarSQL('DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores;', 'Remover policy allow_delete_operadores');

  // 3. Criar políticas públicas
  console.log('\n═══ FASE 3: CRIAR POLÍTICAS PÚBLICAS ═══');

  await executarSQL(`
    CREATE POLICY "public_select_operadores" ON operadores
      FOR SELECT
      USING (true);
  `, 'Criar policy de SELECT público');

  await executarSQL(`
    CREATE POLICY "public_insert_operadores" ON operadores
      FOR INSERT
      WITH CHECK (true);
  `, 'Criar policy de INSERT público');

  await executarSQL(`
    CREATE POLICY "public_update_operadores" ON operadores
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  `, 'Criar policy de UPDATE público');

  await executarSQL(`
    CREATE POLICY "public_delete_operadores" ON operadores
      FOR DELETE
      USING (true);
  `, 'Criar policy de DELETE público');

  // 4. Garantir permissões
  console.log('\n═══ FASE 4: GARANTIR PERMISSÕES ═══');

  await executarSQL('GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO anon;', 'Grant anon em operadores');
  await executarSQL('GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO authenticated;', 'Grant authenticated em operadores');

  await executarSQL('GRANT SELECT, INSERT, UPDATE, DELETE ON historico_pagamentos TO anon;', 'Grant anon em historico_pagamentos');
  await executarSQL('GRANT SELECT, INSERT, UPDATE, DELETE ON historico_pagamentos TO authenticated;', 'Grant authenticated em historico_pagamentos');

  console.log('\n✅ Configuração concluída!');
  console.log('🎉 Agora os usuários podem se cadastrar sem problemas de permissão.');
}

fixRLSAndClean();
