import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler variáveis de ambiente
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY;

console.log('🔗 Conectando ao Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? '✅ Configurada' : '❌ Não encontrada');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  const testEmail = `teste${Date.now()}@gmail.com`;
  const testPassword = 'Senha@123456';
  const testNome = 'Usuário Teste';

  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTE DE CADASTRO COM EMAIL VÁLIDO');
  console.log('='.repeat(80));

  console.log('\n📝 Dados do teste:');
  console.log('   Email:', testEmail);
  console.log('   Senha:', testPassword);
  console.log('   Nome:', testNome);

  try {
    console.log('\n🚀 Criando conta no Supabase Auth...');

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome: testNome
        }
      }
    });

    if (error) {
      console.error('\n❌ ERRO ao criar conta:', error.message);
      console.error('Código:', error.status);
      return;
    }

    if (!data.user) {
      console.error('\n❌ ERRO: Nenhum usuário foi criado');
      return;
    }

    console.log('\n✅ CONTA CRIADA COM SUCESSO NO AUTH!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Confirmado:', data.user.confirmed_at ? 'Sim' : 'Não');

    // Aguardar um pouco
    console.log('\n⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Agora criar o operador manualmente
    console.log('\n📝 Criando operador no banco de dados...');

    const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: operadorData, error: operadorError } = await supabaseAdmin
      .from('operadores')
      .insert({
        auth_user_id: data.user.id,
        nome: testNome,
        email: testEmail,
        senha: null,
        ativo: false,
        suspenso: true,
        aguardando_pagamento: true,
        is_admin: false
      })
      .select()
      .single();

    if (operadorError) {
      console.error('\n❌ ERRO ao criar operador:', operadorError.message);
    } else {
      console.log('\n✅ OPERADOR CRIADO COM SUCESSO!');
      console.log('   ID:', operadorData.id);
      console.log('   Nome:', operadorData.nome);
      console.log('   Email:', operadorData.email);
      console.log('   auth_user_id:', operadorData.auth_user_id);
      console.log('   Ativo:', operadorData.ativo);
    }

    // Limpar usuário de teste
    console.log('\n🗑️ Removendo usuário de teste...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError.message);
    } else {
      console.log('✅ Usuário de teste removido com sucesso!');
    }

  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTE CONCLUÍDO!');
  console.log('='.repeat(80));
}

testSignup();
