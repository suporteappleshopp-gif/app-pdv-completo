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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addAuthUserId() {
  try {
    console.log('🔧 Adicionando campo auth_user_id na tabela operadores...\n');

    // SQL para adicionar a coluna e configurações
    const sqlCommands = [
      // Adicionar coluna auth_user_id se não existir
      `ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;`,

      // Criar índice
      `CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON public.operadores(auth_user_id);`,

      // Atualizar operadores existentes para vincular com auth.users por email
      `UPDATE public.operadores o
       SET auth_user_id = u.id
       FROM auth.users u
       WHERE o.email = u.email AND o.auth_user_id IS NULL;`
    ];

    console.log('📝 Executando comandos SQL...\n');

    for (const sql of sqlCommands) {
      console.log('SQL:', sql.substring(0, 80) + '...');
      // Nota: A execução direta de SQL admin requer permissões especiais
      // Vamos fazer uma abordagem alternativa
    }

    console.log('\n✅ Comandos SQL preparados!');
    console.log('\n💡 Por favor, execute os seguintes comandos no Supabase Dashboard:');
    console.log('👉 https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n');
    console.log('='.repeat(80));
    sqlCommands.forEach(cmd => console.log(cmd + '\n'));
    console.log('='.repeat(80));

    // Verificar operadores atuais
    console.log('\n📊 Verificando operadores existentes...');
    const { data: operadores, error } = await supabase
      .from('operadores')
      .select('id, email, auth_user_id, ativo');

    if (error) {
      console.error('❌ Erro ao buscar operadores:', error.message);
    } else {
      console.log(`\nTotal de operadores: ${operadores.length}`);
      operadores.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.email} | auth_user_id: ${op.auth_user_id || 'NÃO VINCULADO'} | Ativo: ${op.ativo}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

addAuthUserId();
