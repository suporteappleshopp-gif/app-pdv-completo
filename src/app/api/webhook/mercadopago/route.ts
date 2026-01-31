import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Webhook do Mercado Pago para processar notificações de pagamento
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("🔔 Webhook Mercado Pago recebido:", JSON.stringify(body, null, 2));

    // Mercado Pago envia diferentes tipos de notificações
    // Tipo "payment" indica uma atualização de pagamento
    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;

      console.log("💳 Processando pagamento ID:", paymentId);

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
        return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
      }

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        console.error("❌ Erro ao buscar pagamento no Mercado Pago");
        return NextResponse.json({ error: "Erro ao buscar pagamento" }, { status: 500 });
      }

      const payment = await paymentResponse.json();

      console.log("📋 Dados do pagamento:", {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        payer_email: payment.payer?.email,
        external_reference: payment.external_reference,
      });

      // Se o pagamento foi aprovado
      if (payment.status === "approved") {
        console.log("✅ Pagamento aprovado!");

        // Buscar email do pagador ou usar external_reference
        const payerEmail = payment.payer?.email || payment.external_reference;

        if (!payerEmail) {
          console.error("❌ Email do pagador não encontrado");
          return NextResponse.json({ error: "Email não encontrado" }, { status: 400 });
        }

        console.log("👤 Ativando conta para email:", payerEmail);

        // Buscar operador no banco
        const { data: operador, error: findError } = await supabase
          .from("operadores")
          .select("*")
          .eq("email", payerEmail)
          .maybeSingle();

        if (findError || !operador) {
          console.error("❌ Operador não encontrado:", findError?.message);
          return NextResponse.json({ error: "Operador não encontrado" }, { status: 404 });
        }

        // Determinar dias e forma de pagamento baseado no valor
        const valorPago = payment.transaction_amount;
        let diasComprados = 60;
        let formaPagamento = "pix";

        // Se valor é R$ 59,90 = PIX (60 dias)
        // Se valor é R$ 149,70 = Cartão (180 dias)
        if (valorPago >= 59 && valorPago <= 60) {
          diasComprados = 60;
          formaPagamento = "pix";
        } else if (valorPago >= 149 && valorPago <= 150) {
          diasComprados = 180;
          formaPagamento = "cartao";
        }

        console.log(`💰 Valor pago: R$ ${valorPago} | Forma: ${formaPagamento} | Dias comprados: ${diasComprados}`);

        // IMPORTANTE: SOMAR dias à assinatura existente (não substituir)
        const dataAtual = new Date();
        let novaDataVencimento: Date;

        // Se já tem data de vencimento E ainda não expirou, SOMAR os dias
        if (operador.data_proximo_vencimento) {
          const vencimentoAtual = new Date(operador.data_proximo_vencimento);

          // Se vencimento ainda está no futuro, somar a partir do vencimento atual
          if (vencimentoAtual > dataAtual) {
            novaDataVencimento = new Date(vencimentoAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
            console.log(`✅ Somando ${diasComprados} dias ao vencimento atual (${vencimentoAtual.toLocaleDateString()})`);
          } else {
            // Se já expirou, começar de hoje
            novaDataVencimento = new Date(dataAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
            console.log(`⚠️ Assinatura expirada. Iniciando ${diasComprados} dias a partir de hoje`);
          }
        } else {
          // Primeira compra - começar de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
          console.log(`🆕 Primeira compra: ${diasComprados} dias a partir de hoje`);
        }

        // Atualizar operador: ativar conta, remover flags de suspensão e SOMAR dias
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
            updated_at: new Date().toISOString(),
          })
          .eq("email", payerEmail);

        if (updateError) {
          console.error("❌ Erro ao ativar operador:", updateError.message);
          return NextResponse.json({ error: "Erro ao ativar conta" }, { status: 500 });
        }

        console.log("✅ Conta ativada com sucesso para:", payerEmail);
        console.log("📅 Novo vencimento:", novaDataVencimento.toISOString());
        console.log(`📊 Dias adicionados: ${diasComprados}`);

        return NextResponse.json({
          success: true,
          message: "Pagamento processado e conta ativada automaticamente",
          email: payerEmail,
          diasAdicionados: diasComprados,
          vencimento: novaDataVencimento.toISOString(),
        });
      } else {
        console.log(`⚠️ Pagamento com status: ${payment.status}`);
        return NextResponse.json({
          success: false,
          message: `Pagamento com status: ${payment.status}`,
        });
      }
    }

    // Para outros tipos de notificação, apenas retornar sucesso
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook", details: error.message },
      { status: 500 }
    );
  }
}

// Permitir GET para teste
export async function GET() {
  return NextResponse.json({
    status: "Webhook Mercado Pago ativo",
    message: "Use POST para enviar notificações",
  });
}
