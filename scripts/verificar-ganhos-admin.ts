import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarGanhos() {
  console.log('📊 Verificando ganhos do admin...\n');

  const { data, error } = await supabase
    .from('ganhos_admin')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar ganhos:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Nenhum ganho encontrado');
    return;
  }

  console.log(`✅ ${data.length} ganho(s) encontrado(s):\n`);

  let totalGanhos = 0;

  data.forEach((ganho, index) => {
    console.log(`[${index + 1}] ${ganho.usuario_nome}`);
    console.log(`    Tipo: ${ganho.tipo}`);
    console.log(`    Valor: R$ ${ganho.valor}`);
    console.log(`    Forma: ${ganho.forma_pagamento}`);
    console.log(`    Dias: ${ganho.dias_comprados || ganho.dias_assinatura || 'N/A'}`);
    console.log(`    Descrição: ${ganho.descricao || 'N/A'}`);
    console.log(`    Data: ${new Date(ganho.created_at).toLocaleString('pt-BR')}\n`);

    totalGanhos += parseFloat(ganho.valor);
  });

  console.log(`💰 Total de ganhos: R$ ${totalGanhos.toFixed(2)}`);
}

verificarGanhos();
