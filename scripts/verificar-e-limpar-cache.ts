import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarCompleto() {
  const email = 'joelmamoura2@icloud.com';

  console.log('🔍 VERIFICAÇÃO COMPLETA DO USUÁRIO\n');
  console.log('═'.repeat(60));

  // Buscar operador
  const { data: operador, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !operador) {
    console.error('❌ Erro ao buscar operador:', error);
    return;
  }

  console.log('\n📋 DADOS ATUAIS NO BANCO:');
  console.log('   ID:', operador.id);
  console.log('   Email:', operador.email);
  console.log('   Nome:', operador.nome);
  console.log('   Ativo:', operador.ativo);
  console.log('   Suspenso:', operador.suspenso);
  console.log('   Aguardando Pagamento:', operador.aguardando_pagamento);
  console.log('   Dias Assinatura:', operador.dias_assinatura);
  console.log('   Data Vencimento:', operador.data_proximo_vencimento);
  console.log('   Data Pagamento:', operador.data_pagamento);

  // Verificar solicitações de renovação
  const { data: solicitacoes } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operador.id)
    .order('data_solicitacao', { ascending: false });

  console.log('\n💳 SOLICITAÇÕES NO EXTRATO:');
  if (solicitacoes && solicitacoes.length > 0) {
    solicitacoes.forEach((s, i) => {
      console.log(`   [${i + 1}] ${s.forma_pagamento.toUpperCase()} - ${s.dias_solicitados} dias - R$ ${s.valor}`);
      console.log(`       Status: ${s.status}`);
      console.log(`       Data: ${new Date(s.data_solicitacao).toLocaleString('pt-BR')}`);
    });
    const totalDias = solicitacoes
      .filter(s => s.status === 'aprovado')
      .reduce((acc, s) => acc + s.dias_solicitados, 0);
    console.log(`   📊 Total de dias comprados: ${totalDias}`);
  } else {
    console.log('   ❌ Nenhuma solicitação encontrada');
  }

  // Verificar ganhos do admin
  const { data: ganhos } = await supabase
    .from('ganhos_admin')
    .select('*')
    .eq('usuario_id', operador.id);

  console.log('\n💰 GANHOS DO ADMIN:');
  if (ganhos && ganhos.length > 0) {
    ganhos.forEach((g, i) => {
      console.log(`   [${i + 1}] R$ ${g.valor} - ${g.dias_comprados || 0} dias`);
      console.log(`       ${g.descricao}`);
    });
  } else {
    console.log('   ❌ Nenhum ganho registrado');
  }

  console.log('\n' + '═'.repeat(60));

  // Calcular dias restantes
  if (operador.data_proximo_vencimento) {
    const hoje = new Date();
    const vencimento = new Date(operador.data_proximo_vencimento);
    const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    console.log('\n📅 CÁLCULO DE DIAS:');
    console.log(`   Hoje: ${hoje.toLocaleDateString('pt-BR')}`);
    console.log(`   Vencimento: ${vencimento.toLocaleDateString('pt-BR')}`);
    console.log(`   Dias restantes: ${diasRestantes}`);
  }

  // Status final
  console.log('\n✅ STATUS FINAL:');
  if (operador.ativo && !operador.suspenso && !operador.aguardando_pagamento) {
    console.log('   🎉 USUÁRIO ATIVO - Pode usar o app!');
  } else {
    console.log('   ❌ USUÁRIO BLOQUEADO');
    console.log(`      Ativo: ${operador.ativo}`);
    console.log(`      Suspenso: ${operador.suspenso}`);
    console.log(`      Aguardando: ${operador.aguardando_pagamento}`);
  }

  console.log('\n💡 INSTRUÇÃO PARA O USUÁRIO:');
  console.log('   1. Faça LOGOUT do app');
  console.log('   2. Limpe o cache do navegador (Ctrl+Shift+Delete)');
  console.log('   3. Feche e reabra o navegador');
  console.log('   4. Faça LOGIN novamente');
  console.log('   5. Os 60 dias devem aparecer corretamente');
}

verificarCompleto();
