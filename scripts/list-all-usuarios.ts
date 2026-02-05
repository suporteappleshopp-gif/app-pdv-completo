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

async function listAll() {
  console.log('📋 Listando todos os usuários...\n');

  try {
    const { data, error } = await supabase
      .from('operadores')
      .select('nome, email, forma_pagamento, valor_mensal, dias_assinatura, ativo, suspenso, aguardando_pagamento')
      .eq('is_admin', false);

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado');
      return;
    }

    console.log(`Encontrados ${data.length} usuário(s):\n`);

    data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nome} (${user.email})`);
      console.log(`   Forma Pagamento: ${user.forma_pagamento || 'NÃO DEFINIDO'}`);
      console.log(`   Valor: R$ ${user.valor_mensal?.toFixed(2) || 'NÃO DEFINIDO'}`);
      console.log(`   Dias: ${user.dias_assinatura || 'NÃO DEFINIDO'}`);
      console.log(`   Status: ${user.ativo ? 'Ativo' : 'Inativo'} | ${user.suspenso ? 'Suspenso' : 'Não Suspenso'}`);
      console.log(`   Aguardando Pgto: ${user.aguardando_pagamento ? 'Sim' : 'Não'}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  }
}

listAll();
