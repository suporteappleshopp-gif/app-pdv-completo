import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler .env
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeStep(stepNum, description, sqlCommand) {
  console.log(`\n[${ stepNum}] ${description}...`);

  // Tenta executar via RPC se existir uma função
  // Como não temos acesso direto, vamos simular e validar
  console.log(`SQL: ${sqlCommand.substring(0, 80).replace(/\n/g, ' ')}...`);

  return { success: true };
}

async function runMigration() {
  console.log('🚀 Iniciando migração...\n');
  console.log('='.repeat(80));

  try {
    // PASSO 1: Adicionar coluna
    await executeStep(1, 'Adicionar coluna auth_user_id',
      'ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS auth_user_id UUID');

    // PASSO 2: Criar índice
    await executeStep(2, 'Criar índice',
      'CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON public.operadores(auth_user_id)');

    // PASSO 3: Vincular dados existentes
    await executeStep(3, 'Vincular operadores com auth.users',
      'UPDATE public.operadores o SET auth_user_id = u.id FROM auth.users u WHERE o.email = u.email');

    // PASSO 4: Adicionar constraints
    await executeStep(4, 'Adicionar constraints UNIQUE e FOREIGN KEY',
      'ALTER TABLE public.operadores ADD CONSTRAINT operadores_auth_user_id_key UNIQUE (auth_user_id)');

    // PASSO 5-11: Triggers e policies
    console.log('\n[5-11] Criar funções, triggers e políticas de segurança...');

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  ATENÇÃO: Migração manual necessária!');
    console.log('='.repeat(80));

    console.log('\n❌ Este ambiente não tem acesso direto ao PostgreSQL do Supabase.');
    console.log('🔧 Você precisa aplicar o SQL manualmente seguindo estes passos:\n');

    console.log('📋 PASSO 1: Copie o conteúdo do arquivo abaixo:');
    console.log('   /workspace/apply-migration.sql\n');

    console.log('📋 PASSO 2: Acesse o SQL Editor do Supabase:');
    console.log('   https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n');

    console.log('📋 PASSO 3: Cole todo o SQL e clique em "RUN"\n');

    console.log('✅ Depois, execute: node scripts/test-auth.mjs para validar!\n');

    // Mostrar SQL para facilitar
    const sqlPath = join(__dirname, '..', 'apply-migration.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('='.repeat(80));
    console.log('SQL PARA COPIAR:');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

runMigration();
