import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Ler variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

// Criar cliente com service role key para executar SQL
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📦 Lendo migração...');
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260131015027_create_operadores_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Aplicando migração no banco de dados...');

    // Dividir o SQL em comandos individuais
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n📝 Executando comando ${i + 1}/${commands.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: command });

      if (error) {
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        // Continuar mesmo com erro (pode ser que a tabela já exista)
      } else {
        console.log(`✅ Comando ${i + 1} executado com sucesso!`);
      }
    }

    console.log('\n✅ Migração concluída!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    process.exit(1);
  }
}

applyMigration();
