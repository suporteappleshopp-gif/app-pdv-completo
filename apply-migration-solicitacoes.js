const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyMigration() {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Erro: Variáveis de ambiente não configuradas');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ler o SQL da migration
    const sql = fs.readFileSync(
      'supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql',
      'utf8'
    );

    console.log('🚀 Aplicando migration: corrigir_solicitacoes_renovacao...');

    // Executar SQL através de uma query raw
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao executar migration:', error.message);

      // Tentar abordagem alternativa: executar comando por comando
      console.log('\n📝 Tentando executar comandos individuais...');
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i] + ';';
        console.log(`Executando comando ${i + 1}/${commands.length}...`);

        // Executar usando PostgREST não funciona para DDL
        // Vamos apenas mostrar o SQL para o usuário executar manualmente
      }

      console.log('\n⚠️  Execute o SQL manualmente no Supabase Dashboard:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/editor/sql');
      console.log('2. Cole e execute o SQL do arquivo:');
      console.log('   supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql');

      process.exit(1);
    }

    console.log('✅ Migration aplicada com sucesso!');
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
  }
}

applyMigration();
