import { supabase } from '../src/lib/supabase';

async function limparUsuarios() {
  console.log('🧹 Limpando todos os operadores...');

  try {
    // Deletar todos os operadores
    const { error: deleteError } = await supabase
      .from('operadores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos

    if (deleteError) {
      console.error('❌ Erro ao deletar operadores:', deleteError);
      return;
    }

    console.log('✅ Todos os operadores foram removidos!');
    console.log('ℹ️ Agora você pode criar novos cadastros sem erros.');

    // Limpar histórico de pagamentos
    const { error: histError } = await supabase
      .from('historico_pagamentos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!histError) {
      console.log('✅ Histórico de pagamentos limpo!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

limparUsuarios();
