import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function vincularAuthOperador() {
  const email = 'joelmamoura2@icloud.com';
  const authUserId = 'f039e0d9-1089-45f5-a1ec-4873365a4e84';

  console.log('🔗 Vinculando operador ao Auth...');
  console.log('Email:', email);
  console.log('Auth User ID:', authUserId);

  const { data, error } = await supabase
    .from('operadores')
    .update({ auth_user_id: authUserId })
    .eq('email', email)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao vincular:', error);
    return;
  }

  console.log('\n✅ Operador vinculado com sucesso!');
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Auth User ID:', data.auth_user_id);
  console.log('\n🎉 Agora o login funcionará perfeitamente!');
}

vincularAuthOperador();
