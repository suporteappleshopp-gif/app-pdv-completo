import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

async function simularGetCurrentOperador() {
  console.log('🧪 SIMULANDO getCurrentOperador() COM NOVA LÓGICA\n');
  console.log('═'.repeat(60));

  const emailParaBuscar = 'joelmamoura2@icloud.com';

  console.log('\n📧 Buscando operador por email:', emailParaBuscar);

  const { data: operadorData, error } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", emailParaBuscar)
    .single();

  if (error) {
    console.log('❌ ERRO:', error.message);
    return;
  }

  if (!operadorData) {
    console.log('❌ Operador não encontrado');
    return;
  }

  console.log('✅ Operador encontrado no Supabase:\n');
  console.log('   ID:', operadorData.id);
  console.log('   Nome:', operadorData.nome);
  console.log('   Email:', operadorData.email);
  console.log('   Admin:', operadorData.is_admin || false);
  console.log('   Ativo:', operadorData.ativo || false);
  console.log('   Suspenso:', operadorData.suspenso || false);
  console.log('   Dias Assinatura:', operadorData.dias_assinatura || 'N/A');
  console.log('   Vencimento:', operadorData.data_proximo_vencimento || 'N/A');

  const operador = {
    id: operadorData.id,
    nome: operadorData.nome,
    email: operadorData.email,
    senha: "",
    isAdmin: operadorData.is_admin || false,
    ativo: operadorData.ativo || false,
    suspenso: operadorData.suspenso || false,
    aguardandoPagamento: operadorData.aguardando_pagamento || false,
    createdAt: new Date(operadorData.created_at),
    formaPagamento: operadorData.forma_pagamento || undefined,
    valorMensal: operadorData.valor_mensal || undefined,
    dataProximoVencimento: operadorData.data_proximo_vencimento ? new Date(operadorData.data_proximo_vencimento) : undefined,
    diasAssinatura: operadorData.dias_assinatura || undefined,
    dataPagamento: operadorData.data_pagamento ? new Date(operadorData.data_pagamento) : undefined,
  };

  console.log('\n💾 Dados que seriam salvos no localStorage:');
  console.log(JSON.stringify(operador, null, 2));

  console.log('\n' + '═'.repeat(60));

  // Agora testar carregamento de solicitações
  console.log('\n💳 Buscando solicitações de renovação com ID:', operador.id);

  const { data: solicitacoes, error: solError } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operador.id)
    .order('data_solicitacao', { ascending: false });

  if (solError) {
    console.log('❌ ERRO ao buscar solicitações:', solError.message);
    return;
  }

  console.log('✅ Solicitações encontradas:', solicitacoes?.length || 0);

  if (solicitacoes && solicitacoes.length > 0) {
    console.log('\n📋 DETALHES:');
    solicitacoes.forEach((s, i) => {
      console.log(`   [${i + 1}] ${s.forma_pagamento.toUpperCase()} - R$ ${s.valor.toFixed(2)}`);
      console.log(`       Status: ${s.status}`);
      console.log(`       Dias: ${s.dias_solicitados}`);
      console.log(`       Data: ${new Date(s.data_solicitacao).toLocaleString('pt-BR')}`);
    });

    const totalDias = solicitacoes
      .filter(s => s.status === 'aprovado')
      .reduce((acc, s) => acc + s.dias_solicitados, 0);

    console.log('\n   🎯 TOTAL DE DIAS COMPRADOS:', totalDias);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ RESULTADO:');
  console.log('   - getCurrentOperador() retornará dados atualizados do Supabase');
  console.log('   - Extrato de Pagamentos carregará', solicitacoes?.length || 0, 'solicitações');
  console.log('   - Total de dias exibido:', solicitacoes?.filter(s => s.status === 'aprovado').reduce((acc, s) => acc + s.dias_solicitados, 0) || 0);
}

simularGetCurrentOperador();
