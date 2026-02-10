import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

async function debugar() {
  console.log('🔍 DEBUG: Simulando carregamento do Extrato de Pagamentos\n');
  console.log('═'.repeat(60));

  const email = 'joelmamoura2@icloud.com';

  // PASSO 1: Simular getCurrentOperador()
  console.log('\n📍 PASSO 1: Buscar operador (getCurrentOperador)');
  const { data: operadorData, error: opError } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .single();

  if (opError || !operadorData) {
    console.log('❌ ERRO ao buscar operador:', opError?.message);
    return;
  }

  console.log('✅ Operador encontrado:');
  console.log('   ID:', operadorData.id);
  console.log('   Nome:', operadorData.nome);
  console.log('   Email:', operadorData.email);

  const operadorId = operadorData.id;

  // PASSO 2: Simular carregarSolicitacoes()
  console.log('\n📍 PASSO 2: Carregar solicitações (carregarSolicitacoes)');
  console.log('   Query: SELECT * FROM solicitacoes_renovacao WHERE operador_id =', operadorId);

  const { data: solicitacoes, error: solError } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operadorId)
    .order('data_solicitacao', { ascending: false });

  if (solError) {
    console.log('❌ ERRO ao buscar solicitações:', solError.message);
    console.log('   Código:', solError.code);
    console.log('   Detalhes:', solError.details);
    return;
  }

  console.log('✅ Solicitações encontradas:', solicitacoes?.length || 0);

  if (solicitacoes && solicitacoes.length > 0) {
    console.log('\n📋 LISTA DE SOLICITAÇÕES:');
    solicitacoes.forEach((sol, i) => {
      console.log(`\n   [${i + 1}] ${sol.forma_pagamento.toUpperCase()} - R$ ${sol.valor.toFixed(2)}`);
      console.log(`       ID: ${sol.id}`);
      console.log(`       Operador ID: ${sol.operador_id}`);
      console.log(`       Status: ${sol.status}`);
      console.log(`       Dias: ${sol.dias_solicitados}`);
      console.log(`       Data: ${new Date(sol.data_solicitacao).toLocaleString('pt-BR')}`);
      if (sol.mensagem_admin) {
        console.log(`       Mensagem: ${sol.mensagem_admin}`);
      }
    });

    const totalDias = solicitacoes
      .filter(s => s.status === 'aprovado')
      .reduce((acc, s) => acc + s.dias_solicitados, 0);

    console.log('\n   🎯 Total de Dias Comprados:', totalDias);
  } else {
    console.log('\n⚠️ NENHUMA SOLICITAÇÃO ENCONTRADA!');
    console.log('\n🔍 Verificando se há solicitações sem filtro:');

    const { data: todasSolicitacoes } = await supabase
      .from('solicitacoes_renovacao')
      .select('*')
      .limit(10);

    console.log('   Total de solicitações na tabela:', todasSolicitacoes?.length || 0);

    if (todasSolicitacoes && todasSolicitacoes.length > 0) {
      console.log('\n   Solicitações existentes (IDs de operadores):');
      todasSolicitacoes.forEach(s => {
        console.log(`   - Operador ID: ${s.operador_id}, Status: ${s.status}, Dias: ${s.dias_solicitados}`);
      });

      console.log('\n   ⚠️ PROBLEMA: O operador_id não bate!');
      console.log(`   Operador atual: ${operadorId}`);
      console.log(`   Solicitações são de outros operadores`);
    }
  }

  console.log('\n' + '═'.repeat(60));

  if (solicitacoes && solicitacoes.length > 0) {
    console.log('\n✅ SUCESSO! Frontend deveria mostrar:');
    console.log('   - Total de Dias Comprados:', solicitacoes.filter(s => s.status === 'aprovado').reduce((acc, s) => acc + s.dias_solicitados, 0));
    console.log('   -', solicitacoes.length, 'registro(s) na lista');
    console.log('   - Status:', solicitacoes.map(s => s.status).join(', '));
  } else {
    console.log('\n❌ PROBLEMA! Frontend mostrará "Nenhum pagamento registrado"');
    console.log('   Motivo: Query não retornou resultados');
  }
}

debugar();
