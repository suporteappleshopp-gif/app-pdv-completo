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
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

console.log('🔗 Conectando ao Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('\n📋 Verificando tabela operadores...');

    // Verificar se a tabela já existe
    const { data: existingTable, error: checkError } = await supabase
      .from('operadores')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Tabela operadores já existe!');

      // Verificar estrutura
      const { data: operadores, error: queryError } = await supabase
        .from('operadores')
        .select('*')
        .limit(1);

      if (!queryError) {
        console.log('✅ Estrutura da tabela está correta!');
        console.log('\n📊 Campos disponíveis:', operadores && operadores.length > 0 ? Object.keys(operadores[0]).join(', ') : 'Nenhum registro ainda');
      }
    } else {
      console.log('⚠️ Tabela operadores não existe ou erro ao acessar:', checkError.message);
      console.log('\n💡 Por favor, execute o seguinte SQL manualmente no Supabase Dashboard (SQL Editor):');
      console.log('👉 https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql');
      console.log('\n' + '='.repeat(80));

      const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '20260131015027_create_operadores_table.sql');
      const sql = readFileSync(sqlPath, 'utf-8');
      console.log(sql);
      console.log('='.repeat(80));
    }

    // Testar autenticação
    console.log('\n🔐 Testando sistema de autenticação...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Erro ao listar usuários:', usersError.message);
    } else {
      console.log(`✅ Sistema de autenticação funcionando! Total de usuários: ${users.length}`);

      if (users.length > 0) {
        console.log('\n👥 Usuários cadastrados:');
        users.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

setupDatabase();
