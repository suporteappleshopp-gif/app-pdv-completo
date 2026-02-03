import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynkuovfplntzckecruvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA2NTAsImV4cCI6MjA4NTAzNjY1MH0.8dCQe242pXapIxiU6RZOlVxZAwa_RNcjoyzjcYrrAwQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testando conexão com Supabase...');
console.log('📡 URL:', supabaseUrl);

// Testar acesso à tabela solicitacoes_renovacao
console.log('\n📊 Testando acesso à tabela solicitacoes_renovacao...');
const { data, error } = await supabase
  .from('solicitacoes_renovacao')
  .select('*')
  .limit(5);

if (error) {
  console.error('❌ Erro ao acessar tabela:', error);
  console.error('📋 Detalhes:', JSON.stringify(error, null, 2));
} else {
  console.log('✅ Acesso OK!');
  console.log('📦 Dados:', data);
  console.log('📊 Total de registros:', data?.length || 0);
}

// Testar acesso à tabela operadores
console.log('\n📊 Testando acesso à tabela operadores...');
const { data: opData, error: opError } = await supabase
  .from('operadores')
  .select('id, nome, email')
  .limit(3);

if (opError) {
  console.error('❌ Erro ao acessar operadores:', opError);
} else {
  console.log('✅ Operadores OK!');
  console.log('📦 Dados:', opData);
}

process.exit(0);
