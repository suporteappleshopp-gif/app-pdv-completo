const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function limparTudo() {
  console.log('🧹 Limpando todos os dados...\n');
  
  // Deletar todas as vendas
  const { error: erroVendas } = await supabase
    .from('vendas')
    .delete()
    .neq('id', '00000000');
  
  if (erroVendas) {
    console.error('❌ Erro ao deletar vendas:', erroVendas.message);
  } else {
    console.log('✅ Todas as vendas deletadas');
  }
  
  // Deletar todos os produtos
  const { error: erroProdutos } = await supabase
    .from('produtos')
    .delete()
    .neq('id', '00000000');
  
  if (erroProdutos) {
    console.error('❌ Erro ao deletar produtos:', erroProdutos.message);
  } else {
    console.log('✅ Todos os produtos deletados');
  }
  
  // Buscar operador
  const { data: operadores } = await supabase
    .from('operadores')
    .select('id')
    .limit(1);
  
  if (!operadores || operadores.length === 0) {
    console.error('❌ Nenhum operador encontrado');
    return;
  }
  
  const userId = operadores[0].id;
  console.log('\n📦 Criando produto novo com estoque 10...\n');
  
  // Criar produto novo
  const produto = {
    id: 'produto-' + Date.now(),
    user_id: userId,
    nome: 'agua',
    codigo_barras: '123456',
    preco: 5.00,
    estoque: 10,
    estoque_minimo: 3,
    categoria: 'bebidas',
    descricao: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('produtos')
    .insert([produto])
    .select();
  
  if (error) {
    console.error('❌ Erro ao criar produto:', error.message);
  } else {
    console.log('✅ Produto criado com sucesso!');
    console.log('ID:', data[0].id);
    console.log('Nome:', data[0].nome);
    console.log('Estoque:', data[0].estoque);
  }
  
  console.log('\n✅ Banco de dados resetado com sucesso!');
  console.log('📊 Estoque inicial: 10 unidades');
}

limparTudo();
