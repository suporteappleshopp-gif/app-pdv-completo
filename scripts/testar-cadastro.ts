import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4';

// Usar ANON key (como se fosse um usuário não autenticado)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarCadastro() {
  console.log('🧪 Testando cadastro de usuário...\n');

  const emailTeste = `teste${Date.now()}@exemplo.com`;
  const senhaTeste = 'senha123';

  console.log(`Email de teste: ${emailTeste}`);
  console.log(`Senha de teste: ${senhaTeste}\n`);

  try {
    // Tentar cadastrar no Auth (pode falhar com rate limit)
    console.log('Tentando criar no Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailTeste,
      password: senhaTeste,
      options: {
        data: { nome: 'Usuário Teste' }
      }
    });

    if (authError) {
      console.log('⚠️ Auth falhou (esperado):', authError.message);
      console.log('Tentando criar direto no banco...\n');
    } else if (authData.user) {
      console.log('✅ Usuário criado no Auth:', authData.user.id);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Criar operador direto no banco (sem Auth)
    console.log('Criando operador direto na tabela operadores...');
    const { data: operador, error: operadorError } = await supabase
      .from('operadores')
      .insert({
        email: emailTeste,
        nome: 'Usuário Teste',
        senha: senhaTeste,
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

    if (operadorError) {
      console.error('❌ ERRO ao criar operador:', operadorError);
      console.error('Código:', operadorError.code);
      console.error('Mensagem:', operadorError.message);
      console.error('Detalhes:', operadorError.details);
      return;
    }

    console.log('✅ SUCESSO! Operador criado:');
    console.log(JSON.stringify(operador, null, 2));

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testarCadastro();
