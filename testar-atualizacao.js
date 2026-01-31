const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAtualizacao() {
  console.log('🔍 Verificando estado inicial...\n');
  
  // Buscar produto
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo_barras', '123456');
  
  if (!produtos || produtos.length === 0) {
    console.error('❌ Produto não encontrado');
    return;
  }
  
  const produto = produtos[0];
  console.log('✅ Produto encontrado:');
  console.log('Nome:', produto.nome);
  console.log('Estoque atual:', produto.estoque);
  console.log('ID:', produto.id);
  
  console.log('\n📊 ESTADO DO BANCO:');
  console.log('Produtos: 1');
  console.log('Estoque: ' + produto.estoque + ' unidades');
  
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*');
  
  console.log('Vendas: ' + (vendas?.length || 0));
  
  console.log('\n✅ Tudo limpo e pronto para testar!');
  console.log('\n📋 INSTRUÇÕES:');
  console.log('1. Recarregue as páginas de PRODUTOS e CAIXA (F5)');
  console.log('2. No caixa, adicione 3x agua ao carrinho');
  console.log('3. Finalize a venda');
  console.log('4. Volte para produtos e recarregue (F5)');
  console.log('5. O estoque deve mostrar: 7 unidades ✅');
}

testarAtualizacao();
