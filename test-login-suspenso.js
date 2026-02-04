const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY
);

(async () => {
  const testEmail = 'teste_' + Date.now() + '@teste.com';
  const testSenha = '123456';
  const testId = 'user-test-' + Date.now();

  console.log('🧪 TESTE: Criando usuário suspenso...');
  console.log('Email:', testEmail);

  // 1. Criar usuário direto no banco
  const { data: novoUser, error: insertError } = await supabase
    .from('operadores')
    .insert({
      id: testId,
      email: testEmail,
      nome: 'Teste Usuario',
      senha: testSenha,
      is_admin: false,
      ativo: false,
      suspenso: true,
      aguardando_pagamento: true,
    })
    .select()
    .single();

  if (insertError) {
    console.log('❌ Erro ao criar:', insertError.message);
    return;
  }

  console.log('✅ Usuário criado:', novoUser.id);
  console.log('   - ativo:', novoUser.ativo);
  console.log('   - suspenso:', novoUser.suspenso);

  // 2. Tentar fazer login
  console.log('\n🔐 TESTE: Tentando login...');

  const { data: loginUser, error: loginError } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (loginError || !loginUser) {
    console.log('❌ Erro ao buscar usuário:', loginError?.message || 'Não encontrado');
  } else if (loginUser.senha === testSenha) {
    console.log('✅ Login bem-sucedido!');
    console.log('   Usuário:', loginUser.nome);
    console.log('   ativo:', loginUser.ativo, '| suspenso:', loginUser.suspenso);
    console.log('\n✅ RESULTADO: Usuário PODE fazer login mesmo suspenso!');
  } else {
    console.log('❌ Senha incorreta');
  }

  // 3. Limpar teste
  await supabase.from('operadores').delete().eq('id', testId);
  console.log('\n🗑️  Usuário de teste removido');
})();
