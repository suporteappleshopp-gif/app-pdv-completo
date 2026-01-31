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

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testTrigger() {
  console.log('🧪 Testando trigger manualmente...\n');

  try {
    // Criar usuário temporário via Admin API
    const testEmail = `trigger-test-${Date.now()}@example.com`;
    const testPassword = 'senha123456';

    console.log('📝 Criando usuário via Admin API...');
    console.log('   Email:', testEmail);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        nome: 'Teste Trigger'
      }
    });

    if (userError) {
      console.error('\n❌ ERRO ao criar usuário:', userError.message);
      return;
    }

    if (!userData.user) {
      console.error('\n❌ Nenhum usuário criado');
      return;
    }

    console.log('✅ Usuário criado:', userData.user.id);

    // Aguardar trigger executar
    console.log('\n⏳ Aguardando 3 segundos para o trigger executar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar se operador foi criado
    console.log('\n🔍 Buscando operador criado pelo trigger...');
    const { data: operadorData, error: operadorError } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();

    if (operadorError) {
      console.error('❌ Erro ao buscar operador:', operadorError.message);
    } else if (operadorData) {
      console.log('✅ TRIGGER FUNCIONOU! Operador criado:');
      console.log('   ID:', operadorData.id);
      console.log('   Nome:', operadorData.nome);
      console.log('   Email:', operadorData.email);
      console.log('   auth_user_id:', operadorData.auth_user_id);
      console.log('   Ativo:', operadorData.ativo);
      console.log('   Senha:', operadorData.senha || 'NULL (correto)');
    } else {
      console.log('❌ TRIGGER NÃO FUNCIONOU!');
      console.log('   Operador não foi criado automaticamente');
      console.log('\n💡 O trigger precisa ser recriado no banco de dados');
      console.log('   Execute o SQL em: fix-senha-column.sql');
    }

    // Limpar
    console.log('\n🗑️ Removendo usuário de teste...');
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    console.log('✅ Usuário removido');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

testTrigger();
