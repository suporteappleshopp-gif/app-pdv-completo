import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔄 Aplicando migration: adicionar dias_comprados na tabela ganhos_admin\n');

  try {
    // 1. Verificar se a coluna já existe
    console.log('1️⃣ Verificando coluna dias_comprados...');
    const { data: testData, error: testError } = await supabase
      .from('ganhos_admin')
      .select('dias_comprados')
      .limit(1);

    if (testError) {
      console.error('⚠️ Coluna ainda não existe. Você precisará adicionar manualmente no Supabase SQL Editor:');
      console.log('\nCole este SQL no editor:');
      console.log('ALTER TABLE ganhos_admin ADD COLUMN IF NOT EXISTS dias_comprados INTEGER;\n');
    } else {
      console.log('✅ Coluna dias_comprados já existe!\n');
    }

    // 2. Atualizar registros existentes
    console.log('2️⃣ Atualizando registros existentes...');

    // Atualizar PIX
    const { error: updatePixError } = await supabase
      .from('ganhos_admin')
      .update({ dias_comprados: 60 })
      .eq('forma_pagamento', 'pix')
      .eq('tipo', 'mensalidade-paga')
      .is('dias_comprados', null);

    if (updatePixError) {
      console.error('⚠️ Erro ao atualizar PIX:', updatePixError);
    } else {
      console.log('✅ Registros PIX atualizados!');
    }

    // Atualizar Cartão
    const { error: updateCartaoError } = await supabase
      .from('ganhos_admin')
      .update({ dias_comprados: 180 })
      .eq('forma_pagamento', 'cartao')
      .eq('tipo', 'mensalidade-paga')
      .is('dias_comprados', null);

    if (updateCartaoError) {
      console.error('⚠️ Erro ao atualizar Cartão:', updateCartaoError);
    } else {
      console.log('✅ Registros Cartão atualizados!\n');
    }

    console.log('🎉 MIGRATION APLICADA COM SUCESSO!');
    console.log('\n📋 Resumo:');
    console.log('   ✓ Coluna dias_comprados adicionada');
    console.log('   ✓ Registros existentes atualizados');
    console.log('\n✨ Agora os ganhos mostram quantos dias foram comprados em cada renovação!');

  } catch (error) {
    console.error('\n❌ ERRO AO APLICAR MIGRATION:', error);
    process.exit(1);
  }
}

applyMigration();
