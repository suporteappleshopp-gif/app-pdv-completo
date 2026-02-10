import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function limparDados() {
  console.log('🧹 Limpando dados do banco...\n');

  // Limpar operadores
  console.log('Limpando operadores...');
  const { error: opError } = await supabase
    .from('operadores')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (opError) {
    console.error('❌ Erro ao limpar operadores:', opError);
  } else {
    console.log('✅ Operadores limpos!');
  }

  // Limpar histórico de pagamentos
  console.log('Limpando histórico de pagamentos...');
  const { error: histError } = await supabase
    .from('historico_pagamentos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (histError) {
    console.error('❌ Erro ao limpar histórico:', histError);
  } else {
    console.log('✅ Histórico limpo!');
  }

  // Limpar solicitacoes_renovacao
  console.log('Limpando solicitações de renovação...');
  const { error: solError } = await supabase
    .from('solicitacoes_renovacao')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (solError) {
    console.error('❌ Erro ao limpar solicitações:', solError);
  } else {
    console.log('✅ Solicitações limpas!');
  }

  // Limpar ganhos_admin
  console.log('Limpando ganhos admin...');
  const { error: ganhosError } = await supabase
    .from('ganhos_admin')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (ganhosError) {
    console.error('❌ Erro ao limpar ganhos:', ganhosError);
  } else {
    console.log('✅ Ganhos limpos!');
  }

  // Limpar vendas
  console.log('Limpando vendas...');
  const { error: vendasError } = await supabase
    .from('vendas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (vendasError) {
    console.error('❌ Erro ao limpar vendas:', vendasError);
  } else {
    console.log('✅ Vendas limpas!');
  }

  // Limpar produtos
  console.log('Limpando produtos...');
  const { error: prodError } = await supabase
    .from('produtos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (prodError) {
    console.error('❌ Erro ao limpar produtos:', prodError);
  } else {
    console.log('✅ Produtos limpos!');
  }

  console.log('\n✅ Limpeza concluída!');
}

limparDados();
