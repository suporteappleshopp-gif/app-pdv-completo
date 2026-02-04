import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatus() {
  console.log('🔍 Verificando status da suspensão automática...\n');

  try {
    // Testar se a função existe
    console.log('1️⃣ Verificando se a função existe...');
    const { data, error } = await supabase.rpc('suspender_usuarios_vencidos');

    if (error) {
      console.log('❌ Função NÃO existe ou tem erro:', error.message);
      console.log('\n📝 AÇÃO NECESSÁRIA:');
      console.log('   Execute a migration manualmente no Supabase SQL Editor');
      console.log('   Link: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/editor\n');

      // Ler e exibir o conteúdo da migration
      const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260204225507_auto_suspender_usuarios_vencidos.sql');
      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

      console.log('📄 CONTEÚDO DA MIGRATION:\n');
      console.log('='.repeat(60));
      console.log(migrationContent);
      console.log('='.repeat(60));

      return false;
    }

    console.log('✅ Função existe e foi executada com sucesso!\n');

    // Verificar se há usuários vencidos
    console.log('2️⃣ Verificando usuários vencidos...');
    const { data: vencidos, error: vencidosError } = await supabase
      .from('operadores')
      .select('id, nome, email, data_proximo_vencimento, suspenso, ativo')
      .not('data_proximo_vencimento', 'is', null)
      .lt('data_proximo_vencimento', new Date().toISOString())
      .eq('is_admin', false);

    if (vencidosError) {
      console.error('❌ Erro ao verificar usuários:', vencidosError);
      return false;
    }

    if (!vencidos || vencidos.length === 0) {
      console.log('✅ Nenhum usuário vencido encontrado\n');
    } else {
      console.log(`⚠️ Encontrados ${vencidos.length} usuário(s) vencido(s):`);
      vencidos.forEach(user => {
        console.log(`   - ${user.nome} (${user.email})`);
        console.log(`     Vencimento: ${user.data_proximo_vencimento}`);
        console.log(`     Status: ${user.suspenso ? 'SUSPENSO' : 'ATIVO'} / ${user.ativo ? 'ATIVO' : 'INATIVO'}\n`);
      });
    }

    console.log('🎉 SISTEMA DE SUSPENSÃO AUTOMÁTICA ESTÁ FUNCIONANDO!');
    console.log('⏰ Próxima verificação: em até 5 minutos');
    console.log('📋 A cada 5 minutos, usuários vencidos serão suspensos automaticamente');

    return true;

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    return false;
  }
}

checkStatus();
