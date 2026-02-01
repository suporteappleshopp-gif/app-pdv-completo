/**
 * Script para corrigir pagamentos pendentes do diegomarqueshm
 * Execute com: node corrigir-pagamentos-agora.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirPagamentos() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 CORREÇÃO AUTOMÁTICA DE PAGAMENTOS - DIEGOMARQUESHM');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // ETAPA 1: Buscar operador
    console.log('📋 ETAPA 1: Buscando usuário diegomarqueshm...');
    const { data: operador, error: erroOperador } = await supabase
      .from('operadores')
      .select('*')
      .eq('email', 'diegomarqueshm@icloud.com')
      .maybeSingle();

    if (erroOperador || !operador) {
      console.error('❌ Usuário não encontrado!');
      console.error('Erro:', erroOperador?.message);
      process.exit(1);
    }

    console.log('✅ Usuário encontrado:', operador.nome);
    console.log('📧 Email:', operador.email);
    console.log('🆔 ID:', operador.id);
    console.log('📅 Vencimento atual:', operador.data_proximo_vencimento || 'Nenhum');
    console.log('');

    // ETAPA 2: Buscar pagamentos pendentes
    console.log('📋 ETAPA 2: Buscando pagamentos pendentes...');
    const { data: pagamentosPendentes, error: erroPagamentos } = await supabase
      .from('historico_pagamentos')
      .select('*')
      .eq('usuario_id', operador.id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (erroPagamentos) {
      console.error('❌ Erro ao buscar pagamentos:', erroPagamentos.message);
      process.exit(1);
    }

    if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
      console.log('✅ Nenhum pagamento pendente encontrado!');
      console.log('🎉 TUDO CERTO! Não há nada para processar.');
      console.log('');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${pagamentosPendentes.length} pagamento(s) pendente(s)`);
    console.log('');

    // ETAPA 3: Processar cada pagamento
    console.log('📋 ETAPA 3: Processando pagamentos...');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const pagamento of pagamentosPendentes) {
      console.log('');
      console.log(`💳 Pagamento: ${pagamento.mes_referencia}`);
      console.log(`💰 Valor: R$ ${parseFloat(pagamento.valor).toFixed(2)}`);
      console.log(`📅 Dias: ${pagamento.dias_comprados}`);

      // Verificar tempo desde criação
      const tempoCriacao = new Date(pagamento.created_at).getTime();
      const tempoAtual = Date.now();
      const diferencaMinutos = (tempoAtual - tempoCriacao) / (1000 * 60);

      console.log(`⏱️ Criado há: ${diferencaMinutos.toFixed(1)} minutos`);

      // Cancelar se muito antigo
      if (diferencaMinutos > 10) {
        console.log('⚠️ Pagamento antigo (>10min) - Cancelando...');
        await supabase
          .from('historico_pagamentos')
          .update({
            status: 'cancelado',
            updated_at: new Date().toISOString()
          })
          .eq('id', pagamento.id);
        console.log('✅ Cancelado!');
        continue;
      }

      // Aguardar se muito recente
      if (diferencaMinutos < 4) {
        console.log('⏳ Muito recente (<4min) - Aguardar mais um pouco');
        continue;
      }

      // Processar (entre 4-10 minutos)
      console.log('🔄 Processando manualmente...');

      const dataAtual = new Date();
      let novaDataVencimento;

      if (operador.data_proximo_vencimento) {
        const vencimentoAtual = new Date(operador.data_proximo_vencimento);
        if (vencimentoAtual > dataAtual) {
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          console.log(`✅ Somando ${pagamento.dias_comprados} dias ao vencimento atual`);
        } else {
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          console.log(`✅ Iniciando ${pagamento.dias_comprados} dias a partir de hoje`);
        }
      } else {
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
        console.log(`✅ Primeira compra - ${pagamento.dias_comprados} dias`);
      }

      console.log(`📅 Novo vencimento: ${novaDataVencimento.toLocaleDateString('pt-BR')}`);

      // Atualizar operador
      const { error: erroOperadorUpdate } = await supabase
        .from('operadores')
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: pagamento.forma_pagamento,
          data_pagamento: dataAtual.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: pagamento.dias_comprados,
          valor_mensal: parseFloat(pagamento.valor),
          updated_at: dataAtual.toISOString(),
        })
        .eq('id', operador.id);

      if (erroOperadorUpdate) {
        console.error(`❌ Erro ao atualizar operador: ${erroOperadorUpdate.message}`);
        continue;
      }

      console.log('✅ Operador atualizado!');

      // Atualizar pagamento para pago
      const { error: erroPagamentoUpdate } = await supabase
        .from('historico_pagamentos')
        .update({
          status: 'pago',
          data_pagamento: dataAtual.toISOString(),
          updated_at: dataAtual.toISOString(),
        })
        .eq('id', pagamento.id);

      if (erroPagamentoUpdate) {
        console.error(`❌ Erro ao atualizar pagamento: ${erroPagamentoUpdate.message}`);
        continue;
      }

      console.log('✅ Pagamento marcado como PAGO!');

      // Registrar ganho
      const ganhoId = `ganho_manual_${pagamento.id}_${Date.now()}`;
      await supabase.from('ganhos_admin').insert({
        id: ganhoId,
        tipo: 'mensalidade-paga',
        usuario_id: operador.id,
        usuario_nome: operador.nome,
        valor: parseFloat(pagamento.valor),
        forma_pagamento: pagamento.forma_pagamento,
        descricao: `Pagamento manual de ${pagamento.dias_comprados} dias`,
        created_at: dataAtual.toISOString(),
      });

      console.log('✅ Ganho registrado!');
      console.log('');
      console.log('🎉 PAGAMENTO PROCESSADO COM SUCESSO!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ CORREÇÃO FINALIZADA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 RESUMO:');
    console.log(`  ✅ Usuário: ${operador.nome} (${operador.email})`);
    console.log(`  ✅ Pagamentos processados: ${pagamentosPendentes.length}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERRO CRÍTICO:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

// Executar
corrigirPagamentos();
