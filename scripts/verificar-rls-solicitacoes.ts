import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarRLS() {
  console.log('🔍 VERIFICANDO RLS DA TABELA solicitacoes_renovacao\n');
  console.log('═'.repeat(60));

  // Verificar se RLS está ativo
  const { data: tables, error: tablesError } = await supabase
    .from('pg_tables')
    .select('*')
    .eq('tablename', 'solicitacoes_renovacao');

  console.log('\n📋 TABELA solicitacoes_renovacao:');
  console.log('   Existe:', tables && tables.length > 0 ? 'Sim' : 'Não');

  // Buscar políticas RLS
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'solicitacoes_renovacao'
      ORDER BY policyname;
    `
  }).catch(async () => {
    // Alternativa se rpc não funcionar
    const { data, error } = await supabase
      .from('information_schema.table_privileges')
      .select('*');

    return { data, error };
  });

  console.log('\n🔐 POLÍTICAS RLS:');
  if (policies) {
    console.log(JSON.stringify(policies, null, 2));
  } else {
    console.log('   ⚠️ Não foi possível buscar políticas via RPC');
  }

  // Testar SELECT como usuário anônimo
  console.log('\n🧪 TESTE: Buscar solicitações como anon (sem auth):');
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: testAnon, error: errorAnon } = await supabaseAnon
    .from('solicitacoes_renovacao')
    .select('*')
    .limit(1);

  if (errorAnon) {
    console.log('   ❌ ERRO:', errorAnon.message);
    console.log('   Código:', errorAnon.code);
  } else {
    console.log('   ✅ Sucesso! Registros retornados:', testAnon?.length || 0);
  }

  // Testar SELECT com operador_id específico
  console.log('\n🧪 TESTE: Buscar solicitações do joelmamoura2:');
  const { data: testUser, error: errorUser } = await supabaseAnon
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', '57aa9a8e-d220-467f-8d70-d7ff22bbea47');

  if (errorUser) {
    console.log('   ❌ ERRO:', errorUser.message);
    console.log('   Código:', errorUser.code);
    console.log('   Detalhes:', errorUser.details);
    console.log('   Hint:', errorUser.hint);
  } else {
    console.log('   ✅ Sucesso! Registros retornados:', testUser?.length || 0);
    if (testUser && testUser.length > 0) {
      testUser.forEach((s, i) => {
        console.log(`   [${i + 1}] ${s.forma_pagamento} - R$ ${s.valor} - ${s.status} - ${s.dias_solicitados} dias`);
      });
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n💡 DIAGNÓSTICO:');
  if (errorAnon || errorUser) {
    console.log('   ❌ RLS está BLOQUEANDO o acesso!');
    console.log('   🔧 SOLUÇÃO: Criar política RLS para permitir SELECT público');
  } else {
    console.log('   ✅ RLS está OK - usuário consegue ler os dados');
    console.log('   🔍 Problema pode ser no frontend (auth/session)');
  }
}

verificarRLS();
