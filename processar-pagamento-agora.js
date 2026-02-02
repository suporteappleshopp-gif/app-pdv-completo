/**
 * Processar pagamento diretamente via Supabase
 * Payment ID: 144453253004
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ynkuovfplntzckecruvk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ2MDY1MCwiZXhwIjoyMDg1MDM2NjUwfQ.Sr6itq-mdbZX6pFx1CAChdLNRrCJA9VgdUFsxFFNf78';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

const USUARIO_ID = 'user-1770008567175-qgfr9e3ql';
const PAYMENT_ID = '144453253004';

async function processarPagamento() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('💳 PROCESSANDO PAGAMENTO VIA SUPABASE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🆔 Usuario ID:', USUARIO_ID);
  console.log('💳 Payment ID:', PAYMENT_ID);
  console.log('');

  try {
    // 1. Buscar usuário
    console.log('👤 Buscando operador no banco...');
    const { data: operador, error: findError } = await supabase
      .from('operadores')
      .select('*')
      .eq('id', USUARIO_ID)
      .maybeSingle();

    if (findError) {
      throw new Error(`Erro ao buscar operador: ${findError.message}`);
    }

    if (!operador) {
      throw new Error('Operador não encontrado');
    }

    console.log('✅ Operador encontrado:');
    console.log('   Nome:', operador.nome);
    console.log('   Email:', operador.email);
    console.log('   Vencimento atual:', operador.data_proximo_vencimento || 'Nenhum');
    console.log('');

    // 2. Verificar se já foi processado
    console.log('🔍 Verificando se pagamento já foi processado...');
    const { data: pagamentoDuplicado } = await supabase
      .from('historico_pagamentos')
      .select('id')
      .eq('mercadopago_payment_id', PAYMENT_ID)
      .maybeSingle();

    if (pagamentoDuplicado) {
      console.log('⚠️ PAGAMENTO JÁ FOI PROCESSADO!');
      console.log('🆔 ID do histórico:', pagamentoDuplicado.id);
      return;
    }

    console.log('✅ Pagamento ainda não processado. Continuando...');
    console.log('');

    // 3. Calcular nova data de vencimento
    const diasComprados = 60; // PIX - R$ 59,90
    const formaPagamento = 'pix';
    const valorPago = 59.90;

    const dataAtual = new Date();
    let novaDataVencimento = new Date();

    if (operador.data_proximo_vencimento) {
      const vencimentoAtual = new Date(operador.data_proximo_vencimento);
      if (vencimentoAtual > dataAtual) {
        // Assinatura ativa - somar dias
        novaDataVencimento = new Date(vencimentoAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
        console.log(`✅ Assinatura ativa - Somando ${diasComprados} dias`);
      } else {
        // Assinatura expirada - começar de hoje
        novaDataVencimento.setDate(dataAtual.getDate() + diasComprados);
        console.log(`✅ Assinatura expirada - Iniciando ${diasComprados} dias de hoje`);
      }
    } else {
      // Primeira compra
      novaDataVencimento.setDate(dataAtual.getDate() + diasComprados);
      console.log(`🆕 Primeira compra - Iniciando ${diasComprados} dias`);
    }

    console.log('📅 Nova data de vencimento:', novaDataVencimento.toLocaleDateString('pt-BR'));
    console.log('');

    // 4. Atualizar operador
    console.log('💾 Atualizando conta do operador...');
    const { error: updateError } = await supabase
      .from('operadores')
      .update({
        ativo: true,
        suspenso: false,
        aguardando_pagamento: false,
        forma_pagamento: formaPagamento,
        data_pagamento: dataAtual.toISOString(),
        data_proximo_vencimento: novaDataVencimento.toISOString(),
        dias_assinatura: diasComprados,
        valor_mensal: valorPago,
        updated_at: new Date().toISOString(),
      })
      .eq('id', USUARIO_ID);

    if (updateError) {
      throw new Error(`Erro ao atualizar operador: ${updateError.message}`);
    }

    console.log('✅ Conta ativada com sucesso!');
    console.log('');

    // 5. Registrar no histórico
    console.log('📝 Registrando no histórico de pagamentos...');
    const pagamentoId = `mp_${PAYMENT_ID}_${Date.now()}`;
    const { error: historyError } = await supabase
      .from('historico_pagamentos')
      .insert({
        id: pagamentoId,
        usuario_id: USUARIO_ID,
        mes_referencia: `Renovação ${diasComprados} dias - PIX`,
        valor: valorPago,
        data_vencimento: novaDataVencimento.toISOString(),
        data_pagamento: dataAtual.toISOString(),
        status: 'pago',
        forma_pagamento: formaPagamento,
        dias_comprados: diasComprados,
        tipo_compra: 'renovacao-60',
        mercadopago_payment_id: PAYMENT_ID,
        created_at: dataAtual.toISOString(),
        updated_at: dataAtual.toISOString(),
      });

    if (historyError) {
      console.error('⚠️ Erro ao registrar histórico:', historyError.message);
    } else {
      console.log('✅ Histórico registrado!');
    }
    console.log('');

    // 6. Registrar ganho do admin
    console.log('💰 Registrando ganho do admin...');
    const ganhoId = `ganho_${PAYMENT_ID}_${Date.now()}`;
    const { error: ganhoError } = await supabase
      .from('ganhos_admin')
      .insert({
        id: ganhoId,
        tipo: 'mensalidade-paga',
        usuario_id: USUARIO_ID,
        usuario_nome: operador.nome,
        valor: valorPago,
        forma_pagamento: formaPagamento,
        descricao: `Pagamento processado manualmente - ${diasComprados} dias via PIX - MP ID: ${PAYMENT_ID}`,
        created_at: dataAtual.toISOString(),
      });

    if (ganhoError) {
      console.error('⚠️ Erro ao registrar ganho:', ganhoError.message);
    } else {
      console.log('✅ Ganho registrado!');
    }
    console.log('');

    // 7. Salvar log
    console.log('📊 Salvando log do webhook...');
    await supabase.from('webhook_logs').insert({
      tipo: 'processamento_manual_cli',
      payment_id: PAYMENT_ID,
      usuario_id: USUARIO_ID,
      status: 'processado',
      dados_completos: {
        payment_id: PAYMENT_ID,
        operador: { id: operador.id, nome: operador.nome, email: operador.email },
        diasComprados,
        novaDataVencimento: novaDataVencimento.toISOString(),
        historyError: historyError?.message || null,
        ganhoError: ganhoError?.message || null,
      },
      created_at: new Date().toISOString(),
    });

    console.log('✅ Log salvo!');
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 PAGAMENTO PROCESSADO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMO:');
    console.log('  ✅ Conta:', operador.email);
    console.log('  ✅ Nome:', operador.nome);
    console.log('  ✅ Dias adicionados:', diasComprados);
    console.log('  ✅ Novo vencimento:', novaDataVencimento.toLocaleDateString('pt-BR'));
    console.log('  ✅ Histórico:', !historyError ? 'Registrado' : 'Erro');
    console.log('  ✅ Ganho admin:', !ganhoError ? 'Registrado' : 'Erro');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

processarPagamento();
