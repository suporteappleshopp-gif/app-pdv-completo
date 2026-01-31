/**
 * Script para desabilitar RLS na tabela ganhos_admin
 * Execute: node fix-rls.js
 */

const { createClient } = require('@supabase/supabase-js');

// Ler variáveis de ambiente do arquivo .env manualmente
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Iniciando correção do RLS...\n');
console.log('📡 URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLS() {
  try {
    // Testar acesso à tabela
    console.log('1️⃣ Testando acesso à tabela ganhos_admin...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('ganhos_admin')
      .select('id')
      .limit(1);

    if (!testError) {
      console.log('✅ Tabela ganhos_admin já está acessível!');
      console.log(`📊 A carteira de ganhos está funcionando corretamente.\n`);
      return;
    }

    console.log(`⚠️ Erro detectado: ${testError.message}\n`);

    // Tentar executar SQL para desabilitar RLS
    console.log('2️⃣ Tentando desabilitar RLS via SQL...');

    const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;'
    });

    if (sqlError) {
      console.log('⚠️ Não foi possível executar SQL via RPC\n');
      console.log('💡 SOLUÇÃO MANUAL:');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n1. Abra o SQL Editor do Supabase:');
      console.log('   https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
      console.log('\n2. Cole e execute este comando:\n');
      console.log('   ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;\n');
      console.log('3. Pressione Ctrl+Enter ou clique em "Run"');
      console.log('\n═══════════════════════════════════════════════════════\n');
      return;
    }

    console.log('✅ RLS desabilitado com sucesso!');
    console.log('🎉 A carteira de ganhos agora deve funcionar!\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Execute o SQL manualmente no Supabase Dashboard');
    console.log('Veja o arquivo FIX_GANHOS_ADMIN.sql para instruções completas.\n');
  }
}

fixRLS();
