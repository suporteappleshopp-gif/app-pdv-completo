/**
 * Script para reprocessar manualmente o pagamento que falhou
 * Payment ID: 144453253004
 *
 * COMO USAR:
 * 1. Certifique-se de que as variáveis de ambiente estão configuradas
 * 2. Execute: node reprocessar-pagamento-144453253004.js
 */

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-1073669413723433-012917-14c775d457bda1529673c51b18c894a9-361417955';
const PAYMENT_ID = '144453253004';

async function reprocessarPagamento() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 REPROCESSANDO PAGAMENTO MANUALMENTE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('💳 Payment ID:', PAYMENT_ID);
  console.log('');

  try {
    // 1. Buscar dados do pagamento no Mercado Pago
    console.log('📡 Buscando dados do pagamento na API do Mercado Pago...');
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${PAYMENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento: ${response.status} ${response.statusText}`);
    }

    const payment = await response.json();

    console.log('✅ Pagamento encontrado!');
    console.log('');
    console.log('📋 DETALHES DO PAGAMENTO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆔 ID:', payment.id);
    console.log('📊 Status:', payment.status);
    console.log('💰 Valor:', `R$ ${payment.transaction_amount.toFixed(2)}`);
    console.log('📧 Email:', payment.payer?.email);
    console.log('🔖 External Reference (Usuario ID):', payment.external_reference);
    console.log('💳 Método:', payment.payment_method_id);
    console.log('📅 Data:', payment.date_approved || payment.date_created);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // 2. Verificar se foi aprovado
    if (payment.status !== 'approved') {
      console.log('⚠️ ATENÇÃO: Este pagamento NÃO está aprovado!');
      console.log('📊 Status atual:', payment.status);
      console.log('📝 Detalhes:', payment.status_detail);
      console.log('');
      console.log('❌ Não é possível processar um pagamento não aprovado.');
      return;
    }

    console.log('✅ Status: APROVADO');
    console.log('');

    // 3. Mostrar próximos passos
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 PRÓXIMOS PASSOS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Para processar este pagamento, você tem 2 opções:');
    console.log('');
    console.log('🔹 OPÇÃO 1: Usar o endpoint de reprocessamento (recomendado)');
    console.log('   Execute no terminal ou navegador:');
    console.log('   curl -X POST https://SUA-URL.vercel.app/api/webhook/reprocessar-pagamento \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"payment_id": "${PAYMENT_ID}"}'`);
    console.log('');
    console.log('🔹 OPÇÃO 2: Simular webhook manualmente');
    console.log('   Execute no terminal ou navegador:');
    console.log('   curl -X POST https://SUA-URL.vercel.app/api/webhook/mercadopago \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"action":"payment.updated","type":"payment","data":{"id":"' + PAYMENT_ID + '"}}\'');
    console.log('');
    console.log('🔹 OPÇÃO 3: Processar via Supabase (direto no banco)');
    console.log('   Acesse: https://supabase.com/dashboard');
    console.log('   Execute esta query SQL:');
    console.log('');
    console.log(`   -- ATENÇÃO: Substitua 'USUARIO_ID' pelo ID real do usuário`);
    console.log(`   UPDATE operadores SET`);
    console.log(`     ativo = true,`);
    console.log(`     suspenso = false,`);
    console.log(`     aguardando_pagamento = false,`);
    console.log(`     data_proximo_vencimento = NOW() + INTERVAL '60 days'`);
    console.log(`   WHERE id = '${payment.external_reference}';`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('');
    console.error('Verifique:');
    console.error('1. Se o MERCADOPAGO_ACCESS_TOKEN está correto');
    console.error('2. Se você tem internet');
    console.error('3. Se o Payment ID está correto');
  }
}

reprocessarPagamento();
