import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listarOperadores() {
  console.log('📋 Listando todos os operadores...\n');

  const { data, error } = await supabase
    .from('operadores')
    .select('id, email, nome, senha, auth_user_id, is_admin, ativo, suspenso, aguardando_pagamento')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Nenhum operador encontrado no banco');
    return;
  }

  console.log(`✅ ${data.length} operador(es) encontrado(s):\n`);

  data.forEach((op, index) => {
    console.log(`[${index + 1}] ${op.email}`);
    console.log(`    Nome: ${op.nome}`);
    console.log(`    Senha: ${op.senha ? '***' : 'NULL'}`);
    console.log(`    Auth ID: ${op.auth_user_id || 'NULL'}`);
    console.log(`    Admin: ${op.is_admin}`);
    console.log(`    Ativo: ${op.ativo}`);
    console.log(`    Suspenso: ${op.suspenso}`);
    console.log(`    Aguardando: ${op.aguardando_pagamento}\n`);
  });
}

listarOperadores();
