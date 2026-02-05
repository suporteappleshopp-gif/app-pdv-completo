import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkJoao() {
  console.log('🔍 Verificando dados do usuário "joao"...\n');

  try {
    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .eq('nome', 'joao')
      .single();

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    if (!data) {
      console.log('⚠️ Usuário "joao" não encontrado');
      return;
    }

    console.log('📋 Dados do usuário "joao":');
    console.log('   Nome:', data.nome);
    console.log('   Email:', data.email);
    console.log('   Forma de Pagamento:', data.forma_pagamento || 'NÃO DEFINIDO');
    console.log('   Valor Mensal:', data.valor_mensal || 'NÃO DEFINIDO');
    console.log('   Dias Assinatura:', data.dias_assinatura || 'NÃO DEFINIDO');
    console.log('   Ativo:', data.ativo);
    console.log('   Suspenso:', data.suspenso);
    console.log('   Aguardando Pagamento:', data.aguardando_pagamento);
    console.log('   Data Vencimento:', data.data_proximo_vencimento || 'NÃO DEFINIDO');

    console.log('\n🔍 Análise:');
    if (data.forma_pagamento === 'pix' && data.dias_assinatura === 60) {
      console.log('   ✅ Dados corretos: PIX - 60 dias');
    } else if (data.forma_pagamento === 'cartao' && data.dias_assinatura === 180) {
      console.log('   ✅ Dados corretos: Cartão - 180 dias');
    } else {
      console.log('   ⚠️ Dados inconsistentes!');
      console.log(`   Esperado: ${data.forma_pagamento === 'pix' ? '60 dias' : '180 dias'}`);
      console.log(`   Encontrado: ${data.dias_assinatura || 'NÃO DEFINIDO'} dias`);
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  }
}

checkJoao();
