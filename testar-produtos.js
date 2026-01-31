const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarProdutos() {
  console.log('🔍 Testando carregamento de produtos...\n');
  
  // Buscar todos os produtos
  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) {
    console.error('❌ Erro ao buscar produtos:', error.message);
    return;
  }
  
  console.log(`✅ Total de produtos encontrados: ${produtos.length}\n`);
  
  if (produtos.length === 0) {
    console.log('⚠️ Nenhum produto encontrado no banco!');
    return;
  }
  
  console.log('📦 Produtos no banco:\n');
  produtos.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`User ID: ${p.user_id}`);
    console.log(`Nome: ${p.nome}`);
    console.log(`Código de Barras: ${p.codigo_barras}`);
    console.log(`Preço: R$ ${p.preco}`);
    console.log(`Estoque: ${p.estoque}`);
    console.log(`Categoria: ${p.categoria}`);
    console.log('---');
  });
  
  // Testar busca por código específico
  console.log('\n🔍 Testando busca por código "123456"...\n');
  const { data: produtoBusca, error: erroBusca } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo_barras', '123456');
  
  if (erroBusca) {
    console.error('❌ Erro na busca:', erroBusca.message);
  } else {
    console.log(`✅ Produtos encontrados com código "123456": ${produtoBusca.length}`);
    if (produtoBusca.length > 0) {
      console.log('Produto encontrado:', produtoBusca[0]);
    }
  }
}

testarProdutos();
