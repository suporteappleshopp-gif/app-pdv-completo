import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarCadastro() {
  console.log('📝 TESTANDO CADASTRO DE NOVO USUÁRIO');
  console.log('════════════════════════════════════════════════════════════\n');

  const EMAIL_TESTE = `teste-${Date.now()}@exemplo.com`;
  const SENHA_TESTE = '123456';
  const NOME_TESTE = EMAIL_TESTE.split('@')[0];

  try {
    console.log('1️⃣ Verificando se a coluna aguardando_pagamento existe...\n');

    // Verificar se a coluna existe
    const { data: testData, error: testError } = await supabase
      .from('operadores')
      .select('aguardando_pagamento')
      .limit(1);

    if (testError && testError.message.includes('aguardando_pagamento')) {
      console.error('❌ Coluna aguardando_pagamento NÃO existe!');
      console.error('   Erro:', testError.message);
      return;
    }

    console.log('✅ Coluna aguardando_pagamento existe!\n');

    console.log('2️⃣ Criando usuário no Supabase Auth...\n');

    // Criar usuário
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: EMAIL_TESTE,
      password: SENHA_TESTE,
      options: {
        data: {
          nome: NOME_TESTE,
        },
      },
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError.message);

      // Tentar criar direto no banco
      console.log('\n3️⃣ Tentando criar operador direto no banco...\n');

      const { data: operadorData, error: insertError } = await supabase
        .from('operadores')
        .insert({
          email: EMAIL_TESTE,
          nome: NOME_TESTE,
          senha: SENHA_TESTE,
          is_admin: false,
          ativo: false,
          suspenso: true,
          aguardando_pagamento: true,
          forma_pagamento: 'pix',
          valor_mensal: 59.90,
          dias_assinatura: 60,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ ERRO AO CRIAR OPERADOR:');
        console.error('   Mensagem:', insertError.message);
        console.error('   Código:', insertError.code);
        console.error('   Detalhes:', insertError.details);
        console.error('   Hint:', insertError.hint);
        return;
      }

      console.log('✅ Operador criado direto no banco:');
      console.log('   ID:', operadorData.id);
      console.log('   Email:', operadorData.email);
      console.log('   Nome:', operadorData.nome);
      console.log('   suspenso:', operadorData.suspenso);
      console.log('   aguardando_pagamento:', operadorData.aguardando_pagamento);

      console.log('\n✅ CADASTRO BEM-SUCEDIDO (via banco direto)!');
      return;
    }

    if (!authData.user) {
      console.error('❌ Usuário não foi criado no Auth');
      return;
    }

    console.log('✅ Usuário criado no Auth:');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);

    // Aguardar possível trigger
    console.log('\n⏳ Aguardando possível criação automática...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se operador foi criado
    const { data: operadorExistente } = await supabase
      .from('operadores')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (operadorExistente) {
      console.log('✅ Operador criado automaticamente pelo trigger!');
      console.log('   ID:', operadorExistente.id);
      return;
    }

    console.log('⚠️ Operador não foi criado automaticamente. Criando manualmente...\n');

    // Criar operador manualmente
    const { data: novoOperador, error: insertError } = await supabase
      .from('operadores')
      .insert({
        auth_user_id: authData.user.id,
        email: EMAIL_TESTE,
        nome: NOME_TESTE,
        senha: SENHA_TESTE,
        is_admin: false,
        ativo: false,
        suspenso: true,
        aguardando_pagamento: true,
        forma_pagamento: 'pix',
        valor_mensal: 59.90,
        dias_assinatura: 60,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ ERRO AO CRIAR OPERADOR:');
      console.error('   Mensagem:', insertError.message);
      console.error('   Código:', insertError.code);
      console.error('   Detalhes:', insertError.details);
      console.error('   Hint:', insertError.hint);
      return;
    }

    console.log('✅ Operador criado manualmente:');
    console.log('   ID:', novoOperador.id);
    console.log('   Email:', novoOperador.email);
    console.log('   Nome:', novoOperador.nome);
    console.log('   suspenso:', novoOperador.suspenso);
    console.log('   aguardando_pagamento:', novoOperador.aguardando_pagamento);

    console.log('\n✅ CADASTRO BEM-SUCEDIDO!');

    // Fazer logout
    await supabase.auth.signOut();

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }

  console.log('\n════════════════════════════════════════════════════════════');
}

testarCadastro();
