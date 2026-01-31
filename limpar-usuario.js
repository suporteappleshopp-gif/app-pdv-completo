const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function limpar() {
  console.log('🧹 Limpando dados do usuário diegomarqueshm...\n');
  
  // Buscar operador
  const { data: operadores } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', 'diegomarqueshm@icloud.com');
  
  if (!operadores || operadores.length === 0) {
    console.error('❌ Usuário não encontrado');
    return;
  }
  
  const userId = operadores[0].id;
  console.log('✅ Usuário encontrado:', operadores[0].nome);
  console.log('ID:', userId);
  
  // Deletar vendas
  const { error: erroVendas } = await supabase
    .from('vendas')
    .delete()
    .eq('operador_id', userId);
  
  if (erroVendas) {
    console.error('❌ Erro ao deletar vendas:', erroVendas.message);
  } else {
    console.log('✅ Vendas deletadas');
  }
  
  // Deletar produtos
  const { error: erroProdutos } = await supabase
    .from('produtos')
    .delete()
    .eq('user_id', userId);
  
  if (erroProdutos) {
    console.error('❌ Erro ao deletar produtos:', erroProdutos.message);
  } else {
    console.log('✅ Produtos deletados');
  }
  
  // Criar produto novo
  const produto = {
    id: 'produto-' + Date.now(),
    user_id: userId,
    nome: 'agua',
    codigo_barras: '123456',
    preco: 5.00,
    estoque: 20,
    estoque_minimo: 3,
    categoria: 'bebidas',
    descricao: null
  };
  
  const { error: erroProduto } = await supabase
    .from('produtos')
    .insert([produto]);
  
  if (erroProduto) {
    console.error('❌ Erro ao criar produto:', erroProduto.message);
  } else {
    console.log('✅ Produto criado: agua (estoque: 20)');
  }
  
  console.log('\n✅ Dados limpos com sucesso!');
}

limpar();
