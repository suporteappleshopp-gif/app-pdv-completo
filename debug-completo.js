const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCompleto() {
  console.log('🔍 DEBUG COMPLETO\n');
  
  // Verificar produtos no Supabase
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*');
  
  console.log('📦 PRODUTOS NO SUPABASE:');
  console.log('Total:', produtos?.length || 0);
  
  if (produtos && produtos.length > 0) {
    produtos.forEach(p => {
      console.log('\nID:', p.id);
      console.log('Nome:', p.nome);
      console.log('Código:', p.codigo_barras);
      console.log('Estoque:', p.estoque);
      console.log('User ID:', p.user_id);
      console.log('Criado:', p.created_at);
      console.log('Atualizado:', p.updated_at);
    });
  }
  
  // Verificar vendas
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  
  console.log('\n\n💰 VENDAS NO SUPABASE:');
  console.log('Total:', vendas?.length || 0);
  
  if (vendas && vendas.length > 0) {
    vendas.forEach(v => {
      console.log('\nVenda #' + v.numero);
      console.log('Total: R$', v.total);
      console.log('Status:', v.status);
      console.log('Data:', v.created_at);
    });
  }
  
  console.log('\n\n🎯 CONCLUSÃO:');
  if (produtos && produtos.length > 0) {
    const estoque = produtos[0].estoque;
    if (estoque === 10) {
      console.log('✅ Estoque no Supabase está correto: 10 unidades');
      console.log('❌ Mas a tela está mostrando: 3 unidades');
      console.log('🔴 PROBLEMA: Cache local desatualizado ou página não recarregou da nuvem');
    } else if (estoque === 3) {
      console.log('❌ Estoque no Supabase está ERRADO: 3 unidades');
      console.log('❌ Deveria estar: 10 unidades');
      console.log('🔴 PROBLEMA: Algo está atualizando o Supabase incorretamente');
    } else {
      console.log('⚠️ Estoque está em:', estoque, 'unidades');
    }
  }
}

debugCompleto();
