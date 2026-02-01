import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para forçar verificação e processamento de pagamento
 * Usado quando o webhook do Mercado Pago demora para ser chamado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_id, usuario_id } = body;

    console.log("═══════════════════════════════════════════════════════");
    console.log("🔄 FORÇANDO VERIFICAÇÃO DE PAGAMENTO");
    console.log("💳 Payment ID:", payment_id);
    console.log("🆔 Usuário ID:", usuario_id);
    console.log("═══════════════════════════════════════════════════════");

    if (!payment_id || !usuario_id) {
      return NextResponse.json(
        { error: "payment_id e usuario_id são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase não configurado");
      return NextResponse.json(
        { error: "Configuração do banco não encontrada" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar token do Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Token do Mercado Pago não configurado" },
        { status: 500 }
      );
    }

    // Buscar detalhes do pagamento no Mercado Pago
    console.log("🌐 Consultando Mercado Pago...");
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("❌ Erro ao buscar pagamento:", errorText);
      return NextResponse.json(
        { error: "Erro ao buscar pagamento no Mercado Pago" },
        { status: 500 }
      );
    }

    const payment = await paymentResponse.json();

    console.log("📋 Status do pagamento:", payment.status);
    console.log("💰 Valor:", payment.transaction_amount);

    // Se não está aprovado, retornar status atual
    if (payment.status !== "approved") {
      return NextResponse.json({
        success: false,
        payment_approved: false,
        status: payment.status,
        status_detail: payment.status_detail,
        message: `Pagamento com status: ${payment.status}`,
      });
    }

    console.log("✅ PAGAMENTO APROVADO! Processando...");

    // Buscar operador
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuario_id)
      .maybeSingle();

    if (operadorError || !operador) {
      console.error("❌ Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ Operador encontrado:", operador.nome);

    // Verificar se já foi processado
    const { data: pagamentoDuplicado } = await supabase
      .from("historico_pagamentos")
      .select("id")
      .eq("mercadopago_payment_id", payment.id.toString())
      .maybeSingle();

    if (pagamentoDuplicado) {
      console.log("⚠️ Pagamento já foi processado anteriormente");
      return NextResponse.json({
        success: true,
        payment_approved: true,
        account_active: true,
        message: "Pagamento já foi processado anteriormente",
        duplicate: true,
      });
    }

    // Determinar dias e forma de pagamento
    const valorPago = payment.transaction_amount;
    let diasComprados = 60;
    let formaPagamento = "pix";

    if (valorPago >= 59 && valorPago <= 60) {
      diasComprados = 60;
      formaPagamento = "pix";
    } else if (valorPago >= 149 && valorPago <= 150) {
      diasComprados = 180;
      formaPagamento = "cartao";
    }

    console.log("📊 Plano:", { diasComprados, formaPagamento, valorPago });

    // Calcular nova data de vencimento
    const dataAtual = new Date();
    let novaDataVencimento: Date;

    if (operador.data_proximo_vencimento) {
      const vencimentoAtual = new Date(operador.data_proximo_vencimento);

      if (vencimentoAtual > dataAtual) {
        // Somar ao vencimento atual
        novaDataVencimento = new Date(vencimentoAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
        console.log(`✅ Somando ${diasComprados} dias ao vencimento atual`);
      } else {
        // Começar de hoje
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
        console.log(`⚠️ Assinatura expirada. Iniciando ${diasComprados} dias de hoje`);
      }
    } else {
      // Primeira compra
      novaDataVencimento = new Date(dataAtual);
      novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
      console.log(`🆕 Primeira compra. Iniciando ${diasComprados} dias`);
    }

    // Atualizar operador
    console.log("💾 Ativando conta...");
    const { error: updateError } = await supabase
      .from("operadores")
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
      .eq("id", operador.id);

    if (updateError) {
      console.error("❌ Erro ao atualizar operador:", updateError);
      return NextResponse.json(
        { error: "Erro ao ativar conta" },
        { status: 500 }
      );
    }

    console.log("✅ Conta ativada!");

    // Registrar no histórico
    const pagamentoId = `mp_${payment.id}_${Date.now()}`;
    await supabase
      .from("historico_pagamentos")
      .insert({
        id: pagamentoId,
        usuario_id: operador.id,
        mes_referencia: `Renovação ${diasComprados} dias - ${formaPagamento.toUpperCase()}`,
        valor: valorPago,
        data_vencimento: novaDataVencimento.toISOString(),
        data_pagamento: dataAtual.toISOString(),
        status: "pago",
        forma_pagamento: formaPagamento,
        dias_comprados: diasComprados,
        tipo_compra: `renovacao-${diasComprados}`,
        mercadopago_payment_id: payment.id.toString(),
        created_at: dataAtual.toISOString(),
        updated_at: dataAtual.toISOString(),
      });

    console.log("✅ Histórico registrado!");

    // Registrar ganho do admin
    const ganhoId = `ganho_${payment.id}_${Date.now()}`;
    await supabase
      .from("ganhos_admin")
      .insert({
        id: ganhoId,
        tipo: "mensalidade-paga",
        usuario_id: operador.id,
        usuario_nome: operador.nome,
        valor: valorPago,
        forma_pagamento: formaPagamento,
        descricao: `Pagamento de ${diasComprados} dias via ${formaPagamento.toUpperCase()} - MP ID: ${payment.id}`,
        created_at: dataAtual.toISOString(),
      });

    console.log("✅ Ganho registrado!");

    console.log("═══════════════════════════════════════════════════════");
    console.log("🎉 PROCESSAMENTO CONCLUÍDO COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════");

    return NextResponse.json({
      success: true,
      payment_approved: true,
      account_active: true,
      usuario_nome: operador.nome,
      dias_adicionados: diasComprados,
      novo_vencimento: novaDataVencimento.toISOString(),
      message: "Pagamento processado e conta ativada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao forçar verificação:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error.message },
      { status: 500 }
    );
  }
}
