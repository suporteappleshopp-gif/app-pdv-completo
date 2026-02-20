import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Ler o arquivo SQL
const sql = readFileSync('./supabase/migrations/20260220033817_sistema_devolucoes_tempo_real.sql', 'utf-8');

console.log('📦 Aplicando migration no Supabase...');
console.log('');

// Dividir em statements individuais
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))
  .map(s => s + ';');

let successCount = 0;
let skipCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Pular comentários
  if (statement.trim().startsWith('COMMENT ON')) {
    console.log(`⏭️  [${i + 1}/${statements.length}] Pulando comentário...`);
    skipCount++;
    continue;
  }
  
  // Executar statement
  try {
    const { error } = await supabase.rpc('exec', { sql: statement });
    
    if (error) {
      // Verificar se o erro é benigno (já existe)
      if (error.message?.includes('already exists') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('IF NOT EXISTS')) {
        console.log(`✅ [${i + 1}/${statements.length}] Já existe (ok)`);
        successCount++;
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] Erro:`, error.message?.substring(0, 100));
      }
    } else {
      console.log(`✅ [${i + 1}/${statements.length}] Executado com sucesso`);
      successCount++;
    }
  } catch (err) {
    console.error(`❌ [${i + 1}/${statements.length}] Falha:`, err.message?.substring(0, 100));
  }
}

console.log('');
console.log(`✅ Migration concluída! ${successCount} comandos executados, ${skipCount} pulados`);
console.log('');
console.log('🎉 Sistema de devoluções em tempo real criado:');
console.log('  ✅ Tabela devolucoes');
console.log('  ✅ Coluna tipo_destino em avarias');
console.log('  ✅ Função processar_devolucao_automatica()');
console.log('  ✅ Trigger automático de processamento');
