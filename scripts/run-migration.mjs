import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler variáveis de ambiente
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Lendo SQL...\n');

// Ler arquivo SQL
const sqlPath = join(__dirname, '..', 'apply-migration.sql');
const fullSql = readFileSync(sqlPath, 'utf-8');

console.log('='.repeat(80));
console.log('SQL A SER EXECUTADO:');
console.log('='.repeat(80));
console.log(fullSql);
console.log('='.repeat(80));

console.log('\n✅ Arquivo SQL pronto para ser aplicado!');
console.log('\n📌 Como a conexão direta ao banco não está disponível neste ambiente,');
console.log('você precisa executar esse SQL manualmente.\n');

console.log('OPÇÕES:\n');
console.log('1️⃣ Copie o SQL acima');
console.log('2️⃣ Acesse: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
console.log('3️⃣ Cole o SQL e clique em "Run"\n');

console.log('💡 OU use o comando:');
console.log('   npx supabase db execute -f apply-migration.sql\n');

// Verificar operadores existentes
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 Verificando estado atual da tabela operadores...\n');

const { data, error } = await supabase
  .from('operadores')
  .select('id, email, ativo')
  .limit(3);

if (error) {
  console.error('Erro:', error.message);
} else {
  console.log(`✅ ${data.length} operadores encontrados:`);
  data.forEach(op => console.log(`   - ${op.email} (ativo: ${op.ativo})`));
}
