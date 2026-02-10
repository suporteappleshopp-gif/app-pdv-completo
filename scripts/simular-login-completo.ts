import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simularLogin() {
  const email = 'joelmamoura2@icloud.com';
  const password = '123456';

  console.log('🔐 Simulando fluxo completo de login...\n');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('─'.repeat(60));

  try {
    // PASSO 1: Tentar login no Auth
    console.log('\n📍 PASSO 1: Tentando login no Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!authError && authData.user) {
      console.log('✅ Login no Auth bem-sucedido. User ID:', authData.user.id);

      // Buscar operador por auth_user_id
      const { data: operadorData, error: operadorError } = await supabase
        .from('operadores')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (!operadorError && operadorData) {
        console.log('✅ Operador encontrado por auth_user_id!');
        console.log('Login seria bem-sucedido (Auth + Operador)');
        return;
      } else {
        console.log('⚠️ Auth OK mas operador não encontrado por auth_user_id');
      }
    } else {
      console.log('⚠️ Auth falhou:', authError?.message || 'Sem usuário');
    }

    // PASSO 2: Login direto no banco
    console.log('\n📍 PASSO 2: Tentando login direto no banco...');
    const { data: operadorDirectData, error: directError } = await supabase
      .from('operadores')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    console.log('Query result:');
    console.log('  - Error?', directError ? 'SIM' : 'NÃO');
    console.log('  - Data?', operadorDirectData ? 'SIM' : 'NÃO');

    if (directError) {
      console.error('❌ Erro na query:', directError);
      console.error('  Code:', directError.code);
      console.error('  Message:', directError.message);
      console.error('  Details:', directError.details);
      return;
    }

    if (!operadorDirectData) {
      console.error('❌ Operador não encontrado no banco');
      return;
    }

    console.log('✅ Operador encontrado!');
    console.log('  - ID:', operadorDirectData.id);
    console.log('  - Email:', operadorDirectData.email);
    console.log('  - Nome:', operadorDirectData.nome);
    console.log('  - Senha no banco:', operadorDirectData.senha ? '***' : 'NULL');
    console.log('  - Suspenso:', operadorDirectData.suspenso);
    console.log('  - Aguardando:', operadorDirectData.aguardando_pagamento);

    // PASSO 3: Verificar senha
    console.log('\n📍 PASSO 3: Verificando senha...');
    if (operadorDirectData.senha && operadorDirectData.senha === password) {
      console.log('✅ SENHA CORRETA!');
      console.log('\n🎉 LOGIN SERIA BEM-SUCEDIDO!');
      console.log('Usuário entraria no app como:');
      console.log('  - Suspenso:', operadorDirectData.suspenso);
      console.log('  - Aguardando Pagamento:', operadorDirectData.aguardando_pagamento);
      console.log('  - Ativo:', operadorDirectData.ativo);
    } else {
      console.log('❌ Senha incorreta');
      console.log('  - Esperado:', password);
      console.log('  - Recebido:', operadorDirectData.senha);
    }

  } catch (error: any) {
    console.error('❌ ERRO INESPERADO:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

simularLogin();
