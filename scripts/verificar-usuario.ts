import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarUsuario() {
  const email = 'joelmamoura2@icloud.com';

  console.log('🔍 Buscando usuário:', email);

  const { data, error } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data) {
    console.log('❌ Usuário não encontrado no banco');
    return;
  }

  console.log('\n✅ Usuário encontrado:');
  console.log('ID:', data.id);
  console.log('Nome:', data.nome);
  console.log('Email:', data.email);
  console.log('Senha:', data.senha ? '***' : 'NULL');
  console.log('Auth User ID:', data.auth_user_id || 'NULL (sem Auth)');
  console.log('Admin:', data.is_admin);
  console.log('Ativo:', data.ativo);
  console.log('Suspenso:', data.suspenso);
  console.log('Aguardando Pagamento:', data.aguardando_pagamento);
  console.log('Forma Pagamento:', data.forma_pagamento);
  console.log('Valor Mensal:', data.valor_mensal);
  console.log('Dias Assinatura:', data.dias_assinatura);
}

verificarUsuario();
