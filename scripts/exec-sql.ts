#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Testando conexão com Supabase...\n');

  const { data, error } = await supabase.from('operadores').select('count').limit(1);

  if (error) {
    console.error('❌ Erro:', error.message);
  } else {
    console.log('✅ Conexão OK!');
  }

  console.log('\n📋 SQL pronto em: supabase/migrations/20260212211500_fix_rls_cadastro_final.sql');
  console.log('\n⚠️  Execute manualmente no dashboard Supabase:');
  console.log('🔗 https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
}

main();
