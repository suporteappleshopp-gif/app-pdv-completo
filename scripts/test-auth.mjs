import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler variáveis de ambiente do .env
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 Conectando ao Supabase...');
console.log('URL:', supabaseUrl);

// Cliente com service role para admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente normal para testes de auth
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTE 1: Verificar usuários existentes');
    console.log('='.repeat(80));

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Erro ao listar usuários:', usersError.message);
      return;
    }

    console.log(`\n✅ Total de usuários no Auth: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTE 2: Verificar operadores na tabela');
    console.log('='.repeat(80));

    const { data: operadores, error: opError } = await supabaseAdmin
      .from('operadores')
      .select('id, email, auth_user_id, ativo, is_admin');

    if (opError) {
      console.error('❌ Erro ao buscar operadores:', opError.message);
      console.log('\n⚠️ A coluna auth_user_id ainda não existe!');
      console.log('📋 Execute o SQL em: /workspace/apply-migration.sql');
      console.log('👉 https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
      return;
    }

    console.log(`\n✅ Total de operadores: ${operadores.length}`);
    operadores.forEach((op, index) => {
      console.log(`  ${index + 1}. ${op.email}`);
      console.log(`     - ID: ${op.id}`);
      console.log(`     - auth_user_id: ${op.auth_user_id || '❌ NÃO VINCULADO'}`);
      console.log(`     - Ativo: ${op.ativo ? '✅' : '❌'}`);
      console.log(`     - Admin: ${op.is_admin ? '✅' : '❌'}`);
    });

    // Verificar se todos os usuários estão vinculados
    const usersNotLinked = users.filter(user => {
      return !operadores.some(op => op.auth_user_id === user.id);
    });

    if (usersNotLinked.length > 0) {
      console.log('\n⚠️ Usuários não vinculados a operadores:');
      usersNotLinked.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
    } else {
      console.log('\n✅ Todos os usuários estão vinculados a operadores!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTE 3: Testar login com usuário existente');
    console.log('='.repeat(80));

    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔐 Tentando login com: ${testUser.email}`);
      console.log('⚠️ Nota: Não sei a senha, então este teste pode falhar');

      // Testar busca de operador por auth_user_id
      const { data: operadorData, error: findError } = await supabaseAdmin
        .from('operadores')
        .select('*')
        .eq('auth_user_id', testUser.id)
        .single();

      if (findError) {
        console.error('❌ Erro ao buscar operador:', findError.message);
      } else if (operadorData) {
        console.log('✅ Operador encontrado pelo auth_user_id!');
        console.log('   Nome:', operadorData.nome);
        console.log('   Email:', operadorData.email);
        console.log('   Ativo:', operadorData.ativo ? '✅' : '❌');
        console.log('   Admin:', operadorData.is_admin ? '✅' : '❌');
      } else {
        console.log('❌ Operador não encontrado');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTE 4: Simular cadastro de novo usuário');
    console.log('='.repeat(80));

    const testEmail = `teste-${Date.now()}@example.com`;
    const testPassword = 'senha123456';

    console.log(`\n📝 Criando usuário: ${testEmail}`);

    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome: 'Usuário Teste'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Erro ao criar usuário:', signUpError.message);
    } else if (signUpData.user) {
      console.log('✅ Usuário criado com sucesso!');
      console.log('   User ID:', signUpData.user.id);
      console.log('   Email:', signUpData.user.email);

      // Aguardar 2 segundos para o trigger criar o operador
      console.log('\n⏳ Aguardando trigger criar operador...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar se operador foi criado
      const { data: newOperador, error: newOpError } = await supabaseAdmin
        .from('operadores')
        .select('*')
        .eq('auth_user_id', signUpData.user.id)
        .single();

      if (newOpError) {
        console.error('❌ Operador não foi criado automaticamente:', newOpError.message);
        console.log('⚠️ Verifique se o trigger foi instalado corretamente!');
      } else if (newOperador) {
        console.log('✅ Operador criado automaticamente pelo trigger!');
        console.log('   Nome:', newOperador.nome);
        console.log('   Email:', newOperador.email);
        console.log('   auth_user_id:', newOperador.auth_user_id);
        console.log('   Ativo:', newOperador.ativo ? '✅' : '❌');
      }

      // Limpar usuário de teste
      console.log('\n🗑️ Removendo usuário de teste...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id);

      if (deleteError) {
        console.error('❌ Erro ao deletar usuário:', deleteError.message);
      } else {
        console.log('✅ Usuário de teste removido!');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTES CONCLUÍDOS!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  }
}

testAuth();
