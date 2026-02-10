import { createClient } from '@supabase/supabase-js';
import { addDays } from 'date-fns';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function ativarUsuario() {
  const email = 'joelmamoura2@icloud.com';
  const diasComprados = 60; // PIX = 60 dias

  console.log('🔄 Ativando usuário:', email);
  console.log('Dias comprados:', diasComprados);

  // Calcular data de vencimento
  const dataProximoVencimento = addDays(new Date(), diasComprados);

  const { data, error } = await supabase
    .from('operadores')
    .update({
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
      data_pagamento: new Date().toISOString(),
      data_proximo_vencimento: dataProximoVencimento.toISOString(),
      dias_assinatura: diasComprados,
    })
    .eq('email', email)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao ativar usuário:', error);
    return;
  }

  console.log('\n✅ Usuário ativado com sucesso!');
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Nome:', data.nome);
  console.log('Ativo:', data.ativo);
  console.log('Suspenso:', data.suspenso);
  console.log('Aguardando Pagamento:', data.aguardando_pagamento);
  console.log('Data Pagamento:', data.data_pagamento);
  console.log('Data Vencimento:', data.data_proximo_vencimento);
  console.log('Dias Assinatura:', data.dias_assinatura);

  // Registrar ganho do admin
  console.log('\n💰 Registrando ganho do admin...');

  const { error: ganhoError } = await supabase
    .from('ganhos_admin')
    .insert({
      tipo: 'conta-criada',
      usuario_id: data.id,
      usuario_nome: data.nome,
      valor: 59.90,
      forma_pagamento: 'pix',
      descricao: `Conta criada - ${data.nome} (PIX) - R$ 59,90 - 60 dias`,
      dias_comprados: 60,
    });

  if (ganhoError) {
    console.error('❌ Erro ao registrar ganho:', ganhoError);
  } else {
    console.log('✅ Ganho registrado com sucesso!');
  }

  console.log('\n🎉 Usuário ativado e ganho registrado!');
  console.log('O usuário agora pode fazer login e usar o app por 60 dias.');
}

ativarUsuario();
