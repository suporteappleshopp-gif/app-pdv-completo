import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarLogin() {
  const email = 'joelmamoura2@icloud.com';
  const senha = '123456';

  console.log('🔐 Testando login...');
  console.log('Email:', email);
  console.log('Senha:', senha);

  // Tentar login no Auth (vai falhar porque não foi criado no Auth)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (authError) {
    console.log('⚠️ Auth falhou (esperado):', authError.message);
    console.log('\n🔍 Tentando buscar direto no banco...');
  }

  // Buscar direto no banco (como o código faz)
  const { data: operadorData, error: directError } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (directError) {
    console.error('❌ Erro ao buscar no banco:', directError);
    return;
  }

  if (!operadorData) {
    console.error('❌ Usuário não encontrado no banco');
    return;
  }

  console.log('\n✅ Usuário encontrado!');
  console.log('Senha no banco:', operadorData.senha);
  console.log('Senha digitada:', senha);
  console.log('Senhas coincidem?', operadorData.senha === senha);

  if (operadorData.senha === senha) {
    console.log('\n🎉 LOGIN FUNCIONARIA!');
    console.log('Operador:', {
      id: operadorData.id,
      email: operadorData.email,
      nome: operadorData.nome,
      suspenso: operadorData.suspenso,
      aguardando_pagamento: operadorData.aguardando_pagamento,
      ativo: operadorData.ativo,
    });
  } else {
    console.log('\n❌ Senha incorreta');
  }
}

testarLogin();
