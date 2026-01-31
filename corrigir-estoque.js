const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirEstoque() {
  console.log('📦 Corrigindo estoque do produto agua...\n');
  
  // Buscar vendas concluídas
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .eq('status', 'concluida');
  
  console.log('✅ Vendas encontradas:', vendas?.length || 0);
  
  let totalVendido = 0;
  if (vendas && vendas.length > 0) {
    vendas.forEach(v => {
      // Como salvamos como R$ 5 por unidade e total é múltiplo de 5
      const quantidade = v.total / 5;
      console.log('Venda #' + v.numero + ': R$ ' + v.total + ' = ' + quantidade + ' unidades');
      totalVendido += quantidade;
    });
  }
  
  console.log('\n📊 Total vendido: ' + totalVendido + ' unidades');
  console.log('📊 Estoque inicial: 4 unidades');
  console.log('📊 Estoque atual deveria ser: ' + (4 - totalVendido) + ' unidades');
  
  // Atualizar estoque no Supabase
  const estoqueCorreto = 4 - totalVendido;
  
  if (estoqueCorreto < 0) {
    console.log('\n⚠️ Estoque ficaria negativo! Ajustando para 0');
  }
  
  const { data, error } = await supabase
    .from('produtos')
    .update({ estoque: Math.max(0, estoqueCorreto) })
    .eq('codigo_barras', '123456')
    .select();
  
  if (error) {
    console.error('❌ Erro ao atualizar:', error.message);
  } else {
    console.log('\n✅ Estoque atualizado com sucesso!');
    console.log('Produto:', data[0]);
  }
}

corrigirEstoque();
