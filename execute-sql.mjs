import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Ler migration
const sql = readFileSync('supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql', 'utf8');

console.log('🚀 Executando migration...\n');

try {
  // Executar SQL bruto através do REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    // Método RPC não existe, vamos executar via SQL Editor approach
    console.log('⚠️  Não foi possível executar via API REST');
    console.log('\n📋 Execute manualmente no SQL Editor:');
    console.log('https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n');
    console.log('Copie o conteúdo de:');
    console.log('supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql');
    process.exit(1);
  }

  const data = await response.json();
  console.log('✅ Migration executada com sucesso!');
  console.log(data);
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.log('\n📋 Execute manualmente no SQL Editor:');
  console.log('https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
  process.exit(1);
}
