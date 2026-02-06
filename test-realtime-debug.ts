import { supabase } from './src/lib/supabase';

async function testRealtime() {
  console.log('🔧 Testando conexão Realtime do Supabase...');

  const channel = supabase
    .channel(`test_realtime_${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vendas',
    }, (payload) => {
      console.log('✅ Evento recebido:', payload);
    })
    .subscribe((status, err) => {
      console.log('📡 Status:', status);
      if (err) {
        console.error('❌ Erro:', err);
      }

      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime CONECTADO e FUNCIONANDO!');
        console.log('ℹ️  Agora faça uma venda em outro navegador para testar');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ ERRO: Realtime não está habilitado');
        console.error('💡 Verifique se a replicação está ativada na tabela "vendas"');
      }
    });

  // Manter ativo por 30 segundos
  setTimeout(() => {
    console.log('⏱️ Teste finalizado');
    channel.unsubscribe();
    process.exit(0);
  }, 30000);
}

testRealtime();
