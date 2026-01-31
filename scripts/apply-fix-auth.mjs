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

console.log('🔧 APLICANDO CORREÇÃO DO SISTEMA DE AUTENTICAÇÃO\n');
console.log('='.repeat(80));

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyFix() {
  try {
    console.log('\n📋 PASSO 1: Listando usuários existentes antes da limpeza...');
    const { data: { users: usersBefore } } = await supabaseAdmin.auth.admin.listUsers();
    console.log(`   Total de usuários: ${usersBefore.length}`);
    usersBefore.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email} (ID: ${user.id})`);
    });

    console.log('\n📋 PASSO 2: Listando operadores existentes...');
    const { data: operadoresBefore } = await supabaseAdmin
      .from('operadores')
      .select('id, email, auth_user_id, is_admin');

    console.log(`   Total de operadores: ${operadoresBefore.length}`);
    operadoresBefore.forEach((op, i) => {
      console.log(`   ${i + 1}. ${op.email} | auth_user_id: ${op.auth_user_id || 'NULL'} | admin: ${op.is_admin}`);
    });

    console.log('\n📋 PASSO 3: Deletando todos os 3 usuários do Auth...');
    for (const user of usersBefore) {
      console.log(`   Deletando: ${user.email}...`);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Erro ao deletar ${user.email}:`, error.message);
      } else {
        console.log(`   ✅ ${user.email} deletado`);
      }
    }

    console.log('\n📋 PASSO 4: Limpando operadores órfãos (sem auth_user_id)...');
    const { data: deletedOps, error: deleteError } = await supabaseAdmin
      .from('operadores')
      .delete()
      .is('auth_user_id', null)
      .neq('id', 'admin-master')
      .select();

    if (deleteError) {
      console.error('   ❌ Erro ao limpar operadores:', deleteError.message);
    } else {
      console.log(`   ✅ ${deletedOps?.length || 0} operadores órfãos removidos`);
    }

    console.log('\n📋 PASSO 5: Verificando resultado final...');
    const { data: { users: usersAfter } } = await supabaseAdmin.auth.admin.listUsers();
    const { data: operadoresAfter } = await supabaseAdmin
      .from('operadores')
      .select('id, email, auth_user_id');

    console.log(`   ✅ Usuários Auth restantes: ${usersAfter.length}`);
    console.log(`   ✅ Operadores restantes: ${operadoresAfter.length}`);

    if (operadoresAfter.length > 0) {
      console.log('\n   Operadores finais:');
      operadoresAfter.forEach(op => {
        console.log(`   - ${op.email} (${op.auth_user_id ? 'vinculado' : 'sem vínculo'})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ LIMPEZA CONCLUÍDA!');
    console.log('='.repeat(80));
    console.log('\n💡 Agora o sistema está pronto para cadastros seguros com email e senha!');
    console.log('   Os usuários criarão contas pelo app e serão autenticados via Supabase Auth.');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

applyFix();
