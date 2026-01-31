const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEstrutura() {
  console.log('🔍 Verificando estrutura da tabela vendas...\n');
  
  // Tentar inserir uma venda de teste
  const vendaTeste = {
    id: 'venda-teste-' + Date.now(),
    numero: 'TESTE-001',
    operador_id: 'user-1769839042005-e8mszskvo',
    operador_nome: 'diegomarqueshm',
    total: 5.00,
    forma_pagamento: 'dinheiro',
    status: 'concluida'
  };
  
  console.log('📝 Tentando inserir venda de teste...');
  const { data, error } = await supabase
    .from('vendas')
    .insert([vendaTeste])
    .select();
  
  if (error) {
    console.error('❌ Erro:', error.message);
    console.error('Código:', error.code);
    console.error('Detalhes:', error.details);
  } else {
    console.log('✅ Venda inserida com sucesso!');
    console.log('Dados:', data[0]);
    
    // Limpar teste
    await supabase.from('vendas').delete().eq('id', vendaTeste.id);
    console.log('🧹 Venda de teste removida');
  }
}

verificarEstrutura();
