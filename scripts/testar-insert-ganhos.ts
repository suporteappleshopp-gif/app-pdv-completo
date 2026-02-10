import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarInsertGanhos() {
  console.log('🧪 Testando INSERT em ganhos_admin...\n');

  const ganhoTeste = {
    id: `ganho-teste-${Date.now()}`,
    tipo: 'conta-criada',
    usuario_id: '57aa9a8e-d220-467f-8d70-d7ff22bbea47',
    usuario_nome: 'joelmamoura2',
    valor: 59.90,
    forma_pagamento: 'pix',
    descricao: 'Teste de ganho',
    dias_comprados: 60,
  };

  console.log('Dados a inserir:', ganhoTeste);

  const { data, error } = await supabase
    .from('ganhos_admin')
    .insert(ganhoTeste)
    .select();

  if (error) {
    console.error('\n❌ ERRO ao inserir ganho:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    console.error('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ Ganho inserido com sucesso!');
    console.log('Data:', data);
  }
}

testarInsertGanhos();
