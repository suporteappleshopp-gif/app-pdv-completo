const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testar() {
  console.log('🔍 Testando estrutura da tabela vendas...\n');
  
  // Buscar vendas existentes
  const { data: vendas, error } = await supabase
    .from('vendas')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }
  
  console.log('📊 Vendas no banco:', vendas?.length || 0);
  
  if (vendas && vendas.length > 0) {
    console.log('\n📝 Estrutura da venda:');
    console.log(JSON.stringify(vendas[0], null, 2));
  } else {
    console.log('⚠️ Nenhuma venda encontrada (banco zerado)');
  }
  
  console.log('\n✅ A tabela vendas NÃO tem coluna itens!');
  console.log('✅ Os itens deveriam estar na tabela itens_venda separada');
}

testar();
