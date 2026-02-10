import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function forcarSincronizacao() {
  console.log('🔄 FORÇANDO SINCRONIZAÇÃO COMPLETA DO USUÁRIO\n');
  console.log('═'.repeat(60));

  const email = 'joelmamoura2@icloud.com';

  // 1. Buscar operador
  console.log('\n📍 PASSO 1: Buscar operador');
  const { data: operador, error: opError } = await supabase
    .from('operadores')
    .select('*')
    .eq('email', email)
    .single();

  if (opError || !operador) {
    console.error('❌ Operador não encontrado:', opError?.message);
    return;
  }

  console.log('✅ Operador encontrado:');
  console.log('   ID:', operador.id);
  console.log('   Email:', operador.email);
  console.log('   Nome:', operador.nome);
  console.log('   Ativo:', operador.ativo);
  console.log('   Dias:', operador.dias_assinatura);

  // 2. Buscar solicitações
  console.log('\n📍 PASSO 2: Verificar solicitações');
  const { data: solicitacoes, error: solError } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operador.id);

  if (solError) {
    console.error('❌ Erro ao buscar solicitações:', solError.message);
    return;
  }

  console.log('✅ Solicitações encontradas:', solicitacoes?.length || 0);

  if (solicitacoes && solicitacoes.length > 0) {
    solicitacoes.forEach((s, i) => {
      console.log(`   [${i + 1}] ${s.forma_pagamento} - R$ ${s.valor} - ${s.status} - ${s.dias_solicitados} dias`);
    });
  } else {
    console.log('❌ NENHUMA SOLICITAÇÃO ENCONTRADA!');
    console.log('\n🔧 CRIANDO SOLICITAÇÃO MANUALMENTE...');

    // Criar solicitação se não existe
    const { data: novaSol, error: criarError } = await supabase
      .from('solicitacoes_renovacao')
      .insert({
        operador_id: operador.id,
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

    if (criarError) {
      console.error('❌ Erro ao criar solicitação:', criarError.message);
    } else {
      console.log('✅ Solicitação criada com sucesso!');
      console.log('   ID:', novaSol.id);
    }
  }

  // 3. Forçar atualização do operador (trigger no banco)
  console.log('\n📍 PASSO 3: Atualizar timestamp do operador');
  const { error: updateError } = await supabase
    .from('operadores')
    .update({
      ultima_atividade: new Date().toISOString()
    })
    .eq('id', operador.id);

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError.message);
  } else {
    console.log('✅ Timestamp atualizado - triggers do Supabase executados');
  }

  // 4. Verificação final
  console.log('\n📍 PASSO 4: Verificação final');
  const { data: verificacao } = await supabase
    .from('solicitacoes_renovacao')
    .select('*')
    .eq('operador_id', operador.id);

  console.log('✅ Solicitações após sincronização:', verificacao?.length || 0);

  if (verificacao && verificacao.length > 0) {
    const totalDias = verificacao
      .filter(s => s.status === 'aprovado')
      .reduce((acc, s) => acc + s.dias_solicitados, 0);

    console.log('   🎯 Total de dias aprovados:', totalDias);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ SINCRONIZAÇÃO CONCLUÍDA!');
  console.log('   O usuário deve ver os dados atualizados no Extrato de Pagamentos');
  console.log('   Se ainda não aparecer, peça para ele:');
  console.log('   1. Recarregar a página (Ctrl+R ou Cmd+R)');
  console.log('   2. Limpar cache (Ctrl+Shift+R ou Cmd+Shift+R)');
  console.log('   3. Fazer logout e login novamente');
}

forcarSincronizacao();
