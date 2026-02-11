import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarLoginJoelma() {
  console.log('🔐 TESTANDO LOGIN DO USUÁRIO joelmamoura2@icloud.com');
  console.log('════════════════════════════════════════════════════════════\n');

  const EMAIL = 'joelmamoura2@icloud.com';
  const SENHA = '123456'; // ou a senha correta

  try {
    console.log('1️⃣ Tentando login no Supabase Auth...\n');

    // Tentar login no Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: SENHA,
    });

    if (authError) {
      console.error('❌ Erro no Auth:', authError.message);
      console.log('\n2️⃣ Tentando buscar operador diretamente no banco...\n');

      // Buscar operador diretamente
      const { data: operador, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('email', EMAIL)
        .single();

      if (opError) {
        console.error('❌ Erro ao buscar operador:', opError.message);
        console.log('\n❌ CONCLUSÃO: Usuário não existe no banco de dados!');
        return;
      }

      console.log('✅ Operador encontrado no banco:');
      console.log('   ID:', operador.id);
      console.log('   Email:', operador.email);
      console.log('   Nome:', operador.nome);
      console.log('   auth_user_id:', operador.auth_user_id);
      console.log('   is_admin:', operador.is_admin);
      console.log('   ativo:', operador.ativo);
      console.log('   suspenso:', operador.suspenso);
      console.log('   aguardando_pagamento:', operador.aguardando_pagamento);
      console.log('   senha (armazenada):', operador.senha ? '✅ Sim' : '❌ Não');

      if (operador.auth_user_id) {
        console.log('\n⚠️ PROBLEMA: Operador tem auth_user_id mas Auth falhou!');
        console.log('   - Isso significa que a senha do Auth pode estar incorreta');
        console.log('   - Tente recuperar a senha ou resetar no Supabase Dashboard');
      } else {
        console.log('\n⚠️ PROBLEMA: Operador não tem auth_user_id!');
        console.log('   - Login direto funcionará se a senha armazenada coincidir');
        console.log('   - Senha armazenada:', operador.senha);
        console.log('   - Senha testada:', SENHA);
        console.log('   - Senhas coincidem?', operador.senha === SENHA ? '✅ SIM' : '❌ NÃO');
      }

      return;
    }

    console.log('✅ Login no Auth bem-sucedido!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);

    // Buscar operador
    console.log('\n2️⃣ Buscando operador no banco...\n');

    const { data: operador, error: opError } = await supabase
      .from('operadores')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (opError) {
      console.error('❌ Erro ao buscar operador:', opError.message);
      console.log('\n⚠️ PROBLEMA: Auth funcionou mas operador não existe!');
      console.log('   - É necessário criar o operador manualmente');
      return;
    }

    console.log('✅ Operador encontrado:');
    console.log('   ID:', operador.id);
    console.log('   Email:', operador.email);
    console.log('   Nome:', operador.nome);
    console.log('   is_admin:', operador.is_admin);
    console.log('   ativo:', operador.ativo);
    console.log('   suspenso:', operador.suspenso);
    console.log('   aguardando_pagamento:', operador.aguardando_pagamento);

    if (operador.suspenso) {
      console.log('\n⚠️ ATENÇÃO: Conta está SUSPENSA!');
      console.log('   - O login funcionará, mas o usuário verá a tela de suspensão');
    }

    if (operador.aguardando_pagamento) {
      console.log('\n⚠️ ATENÇÃO: Conta está AGUARDANDO PAGAMENTO!');
    }

    if (!operador.ativo) {
      console.log('\n⚠️ ATENÇÃO: Conta NÃO está ATIVA!');
    }

    console.log('\n✅ LOGIN COMPLETO BEM-SUCEDIDO!');
    console.log('   - O usuário conseguirá acessar o sistema');
    console.log('   - Será redirecionado para /caixa');

    // Fazer logout
    await supabase.auth.signOut();

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }

  console.log('\n════════════════════════════════════════════════════════════');
}

testarLoginJoelma();
