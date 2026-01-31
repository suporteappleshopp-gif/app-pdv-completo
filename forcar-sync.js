// Script para forçar sincronização dos produtos locais com Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function buscarOperador() {
  const { data: operadores } = await supabase
    .from('operadores')
    .select('*')
    .limit(10);
  
  console.log('👥 Operadores encontrados:', operadores?.length || 0);
  
  if (operadores && operadores.length > 0) {
    operadores.forEach(op => {
      console.log('- ID: ' + op.id + ', Email: ' + op.email + ', Nome: ' + op.nome);
    });
    return operadores[0].id;
  }
  
  return null;
}

async function criarProdutoTeste(userId) {
  console.log('\n📦 Criando produto de teste...');
  
  const produto = {
    id: 'produto-' + Date.now(),
    user_id: userId,
    nome: 'agua',
    codigo_barras: '123456',
    preco: 5.00,
    estoque: 4,
    estoque_minimo: 3,
    categoria: 'bebidas',
    descricao: null
  };
  
  const { data, error } = await supabase
    .from('produtos')
    .insert([produto])
    .select();
  
  if (error) {
    console.error('❌ Erro ao criar produto:', error.message);
    return false;
  }
  
  console.log('✅ Produto criado com sucesso!');
  console.log('Produto:', data[0]);
  return true;
}

async function main() {
  const userId = await buscarOperador();
  
  if (!userId) {
    console.error('❌ Nenhum operador encontrado!');
    return;
  }
  
  console.log('\n🔑 Usando operador: ' + userId);
  
  await criarProdutoTeste(userId);
  
  // Verificar se foi criado
  console.log('\n🔍 Verificando produtos...');
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('user_id', userId);
  
  console.log('✅ Total de produtos do usuário: ' + (produtos?.length || 0));
}

main();
