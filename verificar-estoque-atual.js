const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificar() {
  console.log('🔍 Verificando estoque atual no Supabase...\n');
  
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo_barras', '123456');
  
  if (produtos && produtos.length > 0) {
    console.log('✅ Produto encontrado:');
    console.log('Nome:', produtos[0].nome);
    console.log('Código:', produtos[0].codigo_barras);
    console.log('Estoque:', produtos[0].estoque);
    console.log('Última atualização:', produtos[0].updated_at);
  } else {
    console.log('❌ Produto não encontrado');
  }
}

verificar();
