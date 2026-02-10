import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

console.log('🧪 TESTE DE ACESSO À TABELA solicitacoes_renovacao\n');
console.log('═'.repeat(60));

// Criar cliente como usuário anônimo (igual ao frontend)
const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testar() {
  console.log('\n🔍 TESTE 1: Buscar TODAS as solicitações (sem filtro):');
  const { data: all, error: error1 } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .limit(5);

  if (error1) {
    console.log('   ❌ ERRO:', error1.message);
    console.log('   Código:', error1.code);
  } else {
    console.log('   ✅ Retornou:', all?.length || 0, 'registros');
  }

  console.log('\n🔍 TESTE 2: Buscar solicitações do joelmamoura2:');
  const { data: user, error: error2 } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', '57aa9a8e-d220-467f-8d70-d7ff22bbea47');

  if (error2) {
    console.log('   ❌ ERRO:', error2.message);
    console.log('   Código:', error2.code);
    console.log('   Detalhes:', error2.details);
    console.log('   Hint:', error2.hint);
    console.log('\n   🔧 CAUSA: RLS está bloqueando o acesso!');
    console.log('   💡 SOLUÇÃO: Criar política RLS permitindo SELECT público');
  } else {
    console.log('   ✅ Retornou:', user?.length || 0, 'registros');
    if (user && user.length > 0) {
      console.log('\n   📋 DADOS:');
      user.forEach((s, i) => {
        console.log(`   [${i + 1}] ${s.forma_pagamento.toUpperCase()} - R$ ${s.valor.toFixed(2)}`);
        console.log(`       Status: ${s.status}`);
        console.log(`       Dias: ${s.dias_solicitados}`);
        console.log(`       Data: ${new Date(s.data_solicitacao).toLocaleString('pt-BR')}`);
      });
    }
  }

  console.log('\n' + '═'.repeat(60));

  if (error1 || error2) {
    console.log('\n❌ PROBLEMA IDENTIFICADO: RLS BLOQUEANDO ACESSO');
    console.log('\n📝 CRIAR MIGRAÇÃO PARA CORRIGIR:');
    console.log('   1. Habilitar RLS');
    console.log('   2. Criar política permitindo SELECT público');
    console.log('   3. Usuário autenticado pode ver apenas suas próprias solicitações');
  } else {
    console.log('\n✅ RLS ESTÁ OK - Frontend deveria conseguir ler os dados');
  }
}

testar();
