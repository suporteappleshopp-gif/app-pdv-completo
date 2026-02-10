import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function criarRegistroPagamento() {
  const operadorId = '57aa9a8e-d220-467f-8d70-d7ff22bbea47';

  console.log('📝 Criando registro de pagamento aprovado...\n');

  const { data, error } = await supabase
    .from('solicitacoes_renovacao')
    .insert({
      operador_id: operadorId,
      forma_pagamento: 'pix',
      dias_solicitados: 60,
      valor: 59.90,
      status: 'aprovado',
      mensagem_admin: 'Pagamento confirmado! Conta ativada com 60 dias de acesso.',
      data_solicitacao: new Date().toISOString(),
      data_resposta: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar registro:', error);
    return;
  }

  console.log('✅ Registro de pagamento criado!');
  console.log('ID:', data.id);
  console.log('Forma:', data.forma_pagamento);
  console.log('Dias:', data.dias_solicitados);
  console.log('Valor:', data.valor);
  console.log('Status:', data.status);
  console.log('\n🎉 Agora o usuário verá 60 dias comprados no extrato!');
}

criarRegistroPagamento();
