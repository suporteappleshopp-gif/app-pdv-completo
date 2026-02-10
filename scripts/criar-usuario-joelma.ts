import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function criarUsuario() {
  const email = 'joelmamoura2@icloud.com';
  const senha = '123456';
  const nome = 'joelmamoura2';

  console.log('📝 Criando usuário:', email);

  // Criar operador diretamente no banco
  const { data, error } = await supabase
    .from('operadores')
    .insert({
      email: email,
      nome: nome,
      senha: senha,
      is_admin: false,
      ativo: false,
      suspenso: true,
      aguardando_pagamento: true,
      forma_pagamento: 'pix',
      valor_mensal: 59.90,
      dias_assinatura: 60,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar usuário:', error);
    return;
  }

  console.log('\n✅ Usuário criado com sucesso!');
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Nome:', data.nome);
  console.log('Suspenso:', data.suspenso);
  console.log('Aguardando Pagamento:', data.aguardando_pagamento);
  console.log('\n🎉 Agora o usuário pode fazer login com:');
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${senha}`);
  console.log('\n⚠️ Ele verá uma tela informando que está aguardando aprovação do admin.');
}

criarUsuario();
