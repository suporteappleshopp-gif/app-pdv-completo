const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function adicionarEstoque() {
  console.log('📦 Adicionando 20 unidades ao estoque...\n');
  
  const { data, error } = await supabase
    .from('produtos')
    .update({ estoque: 20, updated_at: new Date().toISOString() })
    .eq('codigo_barras', '123456')
    .select();
  
  if (error) {
    console.error('❌ Erro:', error.message);
  } else {
    console.log('✅ Estoque atualizado com sucesso!');
    console.log('Nome:', data[0].nome);
    console.log('Estoque novo:', data[0].estoque);
  }
}

adicionarEstoque();
