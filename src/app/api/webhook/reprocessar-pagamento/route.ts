import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint para reprocessar manualmente um pagamento do Mercado Pago
 * Útil quando o webhook falha ou precisa ser executado novamente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_id } = body;

    if (!payment_id) {
      return NextResponse.json(
        { error: "payment_id é obrigatório" },
        { status: 400 }
      );
    }

    console.log("🔄 REPROCESSANDO PAGAMENTO:", payment_id);

    // Buscar detalhes do pagamento na API do Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token do Mercado Pago não configurado" },
        { status: 500 }
      );
    }

    console.log("🌐 Buscando pagamento no Mercado Pago...");
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
        { error: "Erro ao buscar pagamento no Mercado Pago", details: errorText },
        { status: 500 }
      );
    }

    const payment = await paymentResponse.json();

    console.log("✅ Pagamento obtido:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount,
    });

    // Verificar se já foi processado
    const { data: pagamentoDuplicado } = await supabase
      .from("historico_pagamentos")
      .select("id, status")
      .eq("mercadopago_payment_id", payment_id)
      .maybeSingle();

    if (pagamentoDuplicado) {
      console.log("⚠️ Pagamento já processado:", pagamentoDuplicado);
      return NextResponse.json({
        success: false,
        message: "Pagamento já foi processado anteriormente",
        historico_id: pagamentoDuplicado.id,
        status: pagamentoDuplicado.status,
        payment,
      });
    }

    // Se não foi aprovado, não processar
    if (payment.status !== "approved") {
      return NextResponse.json({
        success: false,
        message: `Pagamento não está aprovado. Status: ${payment.status}`,
        payment,
      });
    }

    // Buscar usuário
    const usuarioId = payment.external_reference;

    if (!usuarioId) {
      return NextResponse.json(
        { error: "external_reference não encontrado no pagamento" },
        { status: 400 }
      );
    }

    const { data: operador, error: findError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuarioId)
      .maybeSingle();

    if (findError || !operador) {
      return NextResponse.json(
        { error: "Operador não encontrado", details: findError?.message },
        { status: 404 }
      );
    }

    console.log("✅ Operador encontrado:", operador.nome);

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

    // Calcular nova data de vencimento
    const dataAtual = new Date();
    let novaDataVencimento: Date;

    if (operador.data_proximo_vencimento) {
      const vencimentoAtual = new Date(operador.data_proximo_vencimento);
      if (vencimentoAtual > dataAtual) {
        novaDataVencimento = new Date(vencimentoAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
      } else {
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
      }
    } else {
      novaDataVencimento = new Date(dataAtual);
      novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
    }

    // Atualizar operador
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
      return NextResponse.json(
        { error: "Erro ao atualizar operador", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ Operador atualizado");

    // Registrar no histórico
    const pagamentoId = `mp_${payment.id}_${Date.now()}`;
    const { error: historyError } = await supabase
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

    if (historyError) {
      console.error("⚠️ Erro ao registrar histórico:", historyError.message);
    }

    // Registrar ganho do admin
    const ganhoId = `ganho_${payment.id}_${Date.now()}`;
    const { error: ganhoError } = await supabase
      .from("ganhos_admin")
      .insert({
        id: ganhoId,
        tipo: "mensalidade-paga",
        usuario_id: operador.id,
        usuario_nome: operador.nome,
        valor: valorPago,
        forma_pagamento: formaPagamento,
        descricao: `Pagamento reprocessado manualmente - ${diasComprados} dias via ${formaPagamento.toUpperCase()} - MP ID: ${payment.id}`,
        created_at: dataAtual.toISOString(),
      });

    if (ganhoError) {
      console.error("⚠️ Erro ao registrar ganho:", ganhoError.message);
    }

    // Salvar log
    await supabase.from("webhook_logs").insert({
      tipo: "reprocessamento_manual",
      payment_id: payment_id,
      usuario_id: usuarioId,
      status: "processado",
      dados_completos: {
        payment,
        operador: { id: operador.id, nome: operador.nome, email: operador.email },
        diasComprados,
        novaDataVencimento: novaDataVencimento.toISOString(),
        historyError: historyError?.message || null,
        ganhoError: ganhoError?.message || null,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Pagamento reprocessado com sucesso",
      dados: {
        operador: {
          id: operador.id,
          nome: operador.nome,
          email: operador.email,
        },
        diasAdicionados: diasComprados,
        novoVencimento: novaDataVencimento.toISOString(),
        historico_registrado: !historyError,
        ganho_registrado: !ganhoError,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao reprocessar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao reprocessar pagamento", details: error.message },
      { status: 500 }
    );
  }
}
