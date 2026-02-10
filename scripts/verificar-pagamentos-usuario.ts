import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificar() {
  const email = 'joelmamoura2@icloud.com';

  console.log('🔍 VERIFICANDO PAGAMENTOS DO USUÁRIO\n');
  console.log('═'.repeat(60));

  // Buscar operador
  const { data: operador, error: opError } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .single();

  if (opError || !operador) {
    console.error('❌ Erro ao buscar operador:', opError);
    return;
  }

  console.log('\n👤 OPERADOR:');
  console.log('   ID:', operador.id);
  console.log('   Email:', operador.email);
  console.log('   Nome:', operador.nome);
  console.log('   Ativo:', operador.ativo);
  console.log('   Dias Assinatura:', operador.dias_assinatura);
  console.log('   Vencimento:', operador.data_proximo_vencimento);

  // Buscar solicitações de renovação
  const { data: solicitacoes, error: solError } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operador.id)
    .order('data_solicitacao', { ascending: false });

  console.log('\n💳 SOLICITAÇÕES DE RENOVAÇÃO:');
  if (solicitacoes && solicitacoes.length > 0) {
    solicitacoes.forEach((s, i) => {
      console.log(`   [${i + 1}] ${s.forma_pagamento.toUpperCase()} - R$ ${s.valor.toFixed(2)}`);
      console.log(`       Dias: ${s.dias_solicitados}`);
      console.log(`       Status: ${s.status}`);
      console.log(`       Data: ${new Date(s.data_solicitacao).toLocaleString('pt-BR')}`);
      if (s.mensagem_admin) {
        console.log(`       Mensagem: ${s.mensagem_admin}`);
      }
      console.log('');
    });

    const totalDiasAprovados = solicitacoes
      .filter(s => s.status === 'aprovado')
      .reduce((acc, s) => acc + s.dias_solicitados, 0);

    console.log('   📊 TOTAL DE DIAS APROVADOS:', totalDiasAprovados);
  } else {
    console.log('   ❌ Nenhuma solicitação encontrada');
  }

  console.log('\n' + '═'.repeat(60));

  if (solicitacoes && solicitacoes.length > 0) {
    console.log('\n✅ A página "Extrato de Pagamentos" deve mostrar:');
    console.log('   - Total de Dias Comprados:', solicitacoes.filter(s => s.status === 'aprovado').reduce((acc, s) => acc + s.dias_solicitados, 0));
    console.log('   - Cada pagamento com status "Pago" para aprovados');
    console.log('   - Valor, dias, data e mensagem do admin');
  }
}

verificar();
