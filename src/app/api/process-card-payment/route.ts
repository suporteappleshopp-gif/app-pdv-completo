import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment } from "mercadopago";

/**
 * API para processar pagamento transparente com cartão de crédito
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario_id, forma_pagamento, token, installments, payment_method_id } = body;

    console.log("═══════════════════════════════════════════════════════");
    console.log("💳 PROCESSANDO PAGAMENTO TRANSPARENTE");
    console.log("🆔 Usuário ID:", usuario_id);
    console.log("💰 Forma de pagamento:", forma_pagamento);
    console.log("🔑 Token recebido:", token ? "SIM" : "NÃO");
    console.log("📋 Parcelas:", installments);
    console.log("💳 Método:", payment_method_id);
    console.log("═══════════════════════════════════════════════════════");

    if (!usuario_id || !forma_pagamento || !token) {
      console.error("❌ Parâmetros faltando");
      return NextResponse.json(
        { error: "Dados incompletos", success: false },
        { status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase não configurado");
      return NextResponse.json(
        { error: "Configuração do Supabase não encontrada", success: false },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do usuário
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuario_id)
      .single();

    if (operadorError || !operador) {
      console.error("❌ Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { error: "Usuário não encontrado", success: false },
        { status: 404 }
      );
    }

    console.log("✅ Operador encontrado:", operador.nome, "-", operador.email);

    // Definir valores e dias
    const planos = {
      pix: { valor: 59.9, dias: 60, titulo: "PDV Completo - PIX (60 dias)" },
      cartao: { valor: 149.7, dias: 180, titulo: "PDV Completo - Cartão (180 dias)" },
    };

    const plano = planos[forma_pagamento as keyof typeof planos];

    if (!plano) {
      console.error("❌ Forma de pagamento inválida:", forma_pagamento);
      return NextResponse.json(
        { error: "Forma de pagamento inválida", success: false },
        { status: 400 }
      );
    }

    console.log("📋 Plano selecionado:", plano.titulo, "- R$", plano.valor);

    // Configurar Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Configuração de pagamento inválida", success: false },
        { status: 500 }
      );
    }

    const client = new MercadoPagoConfig({
      accessToken: accessToken,
      options: { timeout: 5000 }
    });
    const payment = new Payment(client);

    // Criar pagamento
    console.log("🌐 Processando pagamento...");

    const paymentData = {
      transaction_amount: plano.valor,
      token: token,
      description: plano.titulo,
      installments: installments || 1,
      payment_method_id: payment_method_id,
      payer: {
        email: operador.email,
        identification: {
          type: "CPF",
          number: "00000000000" // Você pode pedir o CPF no formulário
        }
      },
      external_reference: operador.id,
      statement_descriptor: "PDV Completo",
      notification_url: `${process.env.NEXT_PUBLIC_URL || request.headers.get("origin")}/api/webhook/mercadopago`
    };

    console.log("📦 Dados do pagamento:", JSON.stringify(paymentData, null, 2));

    const result = await payment.create({ body: paymentData });

    console.log("✅ Pagamento processado!");
    console.log("🆔 Payment ID:", result.id);
    console.log("📊 Status:", result.status);
    console.log("💰 Valor:", result.transaction_amount);

    // IMPORTANTE: O webhook do Mercado Pago vai processar tudo automaticamente
    // Mas se o pagamento for aprovado instantaneamente, já ativamos aqui também
    if (result.status === "approved") {
      const agora = new Date();
      const dataAtual = new Date();
      let novaDataVencimento: Date;

      // Usar mesma lógica do webhook: SOMAR dias ao vencimento existente
      if (operador.data_proximo_vencimento) {
        const vencimentoAtual = new Date(operador.data_proximo_vencimento);

        if (vencimentoAtual > dataAtual) {
          // Assinatura ativa: SOMAR dias
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + plano.dias);
          console.log(`✅ Somando ${plano.dias} dias ao vencimento atual`);
        } else {
          // Assinatura expirada: começar de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + plano.dias);
          console.log(`⚠️ Assinatura expirada. Iniciando ${plano.dias} dias de hoje`);
        }
      } else {
        // Primeira compra
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + plano.dias);
        console.log(`🆕 Primeira compra. Iniciando ${plano.dias} dias`);
      }

      // Criar registro no histórico
      const paymentId = result.id?.toString() || `temp_${Date.now()}`;
      const pagamentoId = `mp_${paymentId}_${Date.now()}`;
      await supabase
        .from("historico_pagamentos")
        .insert({
          id: pagamentoId,
          usuario_id: operador.id,
          mes_referencia: `Renovação ${plano.dias} dias - ${forma_pagamento.toUpperCase()}`,
          valor: plano.valor,
          data_vencimento: novaDataVencimento.toISOString(),
          data_pagamento: agora.toISOString(),
          status: "pago",
          forma_pagamento: forma_pagamento,
          dias_comprados: plano.dias,
          tipo_compra: `renovacao-${plano.dias}`,
          mercadopago_payment_id: paymentId,
          created_at: agora.toISOString(),
          updated_at: agora.toISOString(),
        });

      // Atualizar operador com os mesmos campos do webhook
      await supabase
        .from("operadores")
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: forma_pagamento,
          data_pagamento: agora.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: plano.dias,
          valor_mensal: plano.valor,
          updated_at: agora.toISOString(),
        })
        .eq("id", operador.id);

      // Registrar ganho do admin
      const ganhoId = `ganho_${paymentId}_${Date.now()}`;
      await supabase
        .from("ganhos_admin")
        .insert({
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          valor: plano.valor,
          forma_pagamento: forma_pagamento,
          descricao: `Pagamento de ${plano.dias} dias via ${forma_pagamento.toUpperCase()} - MP ID: ${paymentId}`,
          created_at: agora.toISOString(),
        });

      console.log("✅ Conta ativada até:", novaDataVencimento.toISOString());
    }

    return NextResponse.json({
      success: true,
      payment_id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      installments: result.installments,
    });
  } catch (error: any) {
    console.error("❌ Erro ao processar pagamento:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento",
        success: false,
        details: error.message
      },
      { status: 500 }
    );
  }
}
