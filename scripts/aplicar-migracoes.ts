import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function aplicarMigracoes() {
  console.log('🚀 Aplicando migrações...');

  // Ler o arquivo de migração
  const migracaoSQL = fs.readFileSync(
    '/workspace/supabase/migrations/20260210164430_fix_public_insert_permissions.sql',
    'utf-8'
  );

  console.log('📄 SQL a ser executado:');
  console.log(migracaoSQL.substring(0, 500) + '...\n');

  try {
    // Executar SQL direto
    const { data, error } = await supabase.rpc('exec_sql', { sql: migracaoSQL });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);

      // Tentar executar os comandos um por um
      console.log('\n⚠️ Tentando executar comandos separadamente...');

      const comandos = migracaoSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--'));

      for (let i = 0; i < comandos.length; i++) {
        const comando = comandos[i];
        if (!comando) continue;

        console.log(`\n[${i + 1}/${comandos.length}] Executando: ${comando.substring(0, 80)}...`);

        const { error: cmdError } = await supabase.rpc('exec_sql', { sql: comando + ';' });

        if (cmdError) {
          console.error('❌ Erro:', cmdError.message);
        } else {
          console.log('✅ OK');
        }
      }
    } else {
      console.log('✅ Migração aplicada com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
  }

  console.log('\n🏁 Finalizado!');
}

aplicarMigracoes();
