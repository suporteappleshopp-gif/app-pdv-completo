import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function verificar() {
  console.log('🔍 VERIFICANDO auth_user_id DO OPERADOR\n');
  console.log('═'.repeat(60));

  const email = 'joelmamoura2@icloud.com';

  // Buscar operador
  const { data: operador, error } = await supabase
    .from('operadores')
    .select('id, email, nome, auth_user_id')
    .eq('email', email)
    .single();

  if (error || !operador) {
    console.log('❌ Erro ao buscar operador:', error?.message);
    return;
  }

  console.log('\n👤 OPERADOR:');
  console.log('   ID:', operador.id);
  console.log('   Email:', operador.email);
  console.log('   Nome:', operador.nome);
  console.log('   auth_user_id:', operador.auth_user_id || '❌ NULL');

  if (!operador.auth_user_id) {
    console.log('\n⚠️ PROBLEMA DETECTADO:');
    console.log('   O operador NÃO tem auth_user_id associado');
    console.log('   Isso significa que ele foi criado diretamente no banco');
    console.log('   SEM passar pelo Supabase Auth');
    console.log('\n💡 SOLUÇÃO:');
    console.log('   A função getCurrentOperador() já foi corrigida para buscar por EMAIL');
    console.log('   quando auth_user_id não existe. Isso resolverá o problema!');
  } else {
    console.log('\n✅ Operador tem auth_user_id - Auth configurado corretamente');
  }

  // Buscar usuário no Auth
  console.log('\n🔍 Verificando usuários no Supabase Auth:');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.log('❌ Erro ao listar usuários:', usersError.message);
    return;
  }

  const authUser = users?.find(u => u.email === email);

  if (authUser) {
    console.log('✅ Usuário encontrado no Auth:');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);

    if (operador.auth_user_id !== authUser.id) {
      console.log('\n⚠️ DESSINCRONIA:');
      console.log('   operadores.auth_user_id:', operador.auth_user_id);
      console.log('   auth.users.id:', authUser.id);
      console.log('\n🔧 PRECISA SINCRONIZAR!');
    }
  } else {
    console.log('❌ Usuário NÃO encontrado no Auth');
    console.log('   Operador foi criado sem Auth (apenas tabela operadores)');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📝 RESUMO:');
  console.log('   - Operador existe na tabela: ✅');
  console.log('   - Operador tem auth_user_id:', operador.auth_user_id ? '✅' : '❌');
  console.log('   - Usuário existe no Auth:', authUser ? '✅' : '❌');
  console.log('\n✅ getCurrentOperador() agora busca por EMAIL também');
  console.log('   Mesmo sem Auth, o operador será encontrado!');
}

verificar();
