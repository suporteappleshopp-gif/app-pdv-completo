// Teste de variáveis de ambiente - Next.js

console.log('🔍 TESTANDO VARIÁVEIS DE AMBIENTE - NEXT.JS');
console.log('════════════════════════════════════════════════════════════\n');

console.log('📋 Variáveis disponíveis:\n');

// Next.js usa process.env
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ NÃO ENCONTRADA');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ CONFIGURADA' : '❌ NÃO ENCONTRADA');

console.log('\nVITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || '❌ NÃO ENCONTRADA');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ CONFIGURADA' : '❌ NÃO ENCONTRADA');

console.log('\n════════════════════════════════════════════════════════════');

// Testar login
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('\n🔧 Configuração do Supabase:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'CONFIGURADA ✅' : 'NÃO CONFIGURADA ❌');

if (supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  async function testar() {
    console.log('\n🔐 Testando login do usuário joelmamoura2@icloud.com...\n');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'joelmamoura2@icloud.com',
      password: '123456',
    });

    if (error) {
      console.error('❌ Erro no login:', error.message);
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);

      // Buscar operador
      const { data: operador, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('auth_user_id', data.user?.id)
        .single();

      if (opError) {
        console.error('❌ Erro ao buscar operador:', opError.message);
      } else {
        console.log('\n✅ Operador encontrado:');
        console.log('ID:', operador.id);
        console.log('Nome:', operador.nome);
        console.log('Email:', operador.email);
        console.log('Ativo:', operador.ativo);
        console.log('Suspenso:', operador.suspenso);
      }

      await supabase.auth.signOut();
    }
  }

  testar();
} else {
  console.error('\n❌ ERRO: Variáveis de ambiente não configuradas!');
}
