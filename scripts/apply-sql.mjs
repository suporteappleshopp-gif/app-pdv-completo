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

async function applySql() {
  try {
    // Ler o arquivo SQL
    const sqlPath = join(__dirname, '..', 'apply-migration.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('\n📋 Aplicando SQL no banco de dados...\n');

    // Dividir em comandos individuais
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Total de ${commands.length} comandos para executar\n`);

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      // Mostrar progresso
      const cmdPreview = cmd.substring(0, 60).replace(/\n/g, ' ') + '...';
      console.log(`[${i + 1}/${commands.length}] ${cmdPreview}`);

      try {
        // Usar a API REST para executar SQL diretamente
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: cmd })
        });

        if (response.ok) {
          console.log('  ✅ Sucesso\n');
        } else {
          const error = await response.text();
          // Alguns erros são esperados (ex: objeto já existe)
          if (error.includes('already exists') || error.includes('does not exist')) {
            console.log('  ⚠️ Aviso:', error.substring(0, 80), '...\n');
          } else {
            console.log('  ❌ Erro:', error.substring(0, 100), '...\n');
          }
        }
      } catch (err) {
        console.log('  ⚠️ Erro ao executar:', err.message.substring(0, 80), '\n');
      }

      // Pequeno delay entre comandos
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('='.repeat(80));
    console.log('✅ Processo concluído!\n');

    // Verificar resultado
    console.log('🔍 Verificando estrutura da tabela operadores...\n');

    const { data: operadores, error } = await supabase
      .from('operadores')
      .select('id, email, auth_user_id, ativo, is_admin')
      .limit(5);

    if (error) {
      console.error('❌ Erro ao verificar:', error.message);
    } else {
      console.log(`✅ Tabela operadores acessível!`);
      console.log(`📊 Registros encontrados: ${operadores.length}\n`);

      if (operadores.length > 0) {
        console.log('Amostra de dados:');
        operadores.forEach((op, i) => {
          console.log(`  ${i + 1}. ${op.email}`);
          console.log(`     auth_user_id: ${op.auth_user_id || '❌ NULL'}`);
          console.log(`     ativo: ${op.ativo}`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
    process.exit(1);
  }
}

applySql();
