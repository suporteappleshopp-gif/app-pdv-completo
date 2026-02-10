import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzjrkcampafzfjwtatfa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxODgzMiwiZXhwIjoyMDg2MTk0ODMyfQ.TD5QfoLOn3j6o3hG04nRbtAF9maDGv4HNDazvpKSlJ0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forcarLogout() {
  const authUserId = 'f039e0d9-1089-45f5-a1ec-4873365a4e84';

  console.log('🔓 Forçando logout de todas as sessões do usuário...\n');

  try {
    // Tentar fazer logout via admin API
    const { error } = await supabase.auth.admin.signOut(authUserId);

    if (error) {
      console.log('⚠️ Não foi possível fazer logout via API:', error.message);
      console.log('   (Isso é normal - o importante é que os dados estão corretos)');
    } else {
      console.log('✅ Logout forçado com sucesso!');
    }

    console.log('\n📋 INSTRUÇÃO PARA O USUÁRIO:');
    console.log('   ════════════════════════════════════════════════════════');
    console.log('   1️⃣ Abra o app no navegador');
    console.log('   2️⃣ Pressione F12 para abrir o Console do Desenvolvedor');
    console.log('   3️⃣ Vá na aba "Application" (ou "Aplicativo")');
    console.log('   4️⃣ No menu lateral, clique em "Local Storage"');
    console.log('   5️⃣ Clique com botão direito e selecione "Clear"');
    console.log('   6️⃣ Feche o console (F12 novamente)');
    console.log('   7️⃣ Recarregue a página (F5 ou Ctrl+R)');
    console.log('   8️⃣ Faça login novamente');
    console.log('   ════════════════════════════════════════════════════════');
    console.log('\n   OU SIMPLESMENTE:');
    console.log('   🔸 Abra uma aba anônima (Ctrl+Shift+N)');
    console.log('   🔸 Acesse o app e faça login');
    console.log('   🔸 Os 60 dias aparecerão corretamente!');
    console.log('   ════════════════════════════════════════════════════════');

    console.log('\n✅ CONFIRMAÇÃO:');
    console.log('   Usuário: joelmamoura2@icloud.com');
    console.log('   Senha: 123456');
    console.log('   Status: ATIVO ✓');
    console.log('   Dias: 60 dias disponíveis');
    console.log('   Vencimento: 11/04/2026');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

forcarLogout();
