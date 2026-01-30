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
        let diasAssinatura = 180;
        let formaPagamento = "cartao";

        // Se valor é R$ 59,90 = PIX (60 dias)
        // Se valor é R$ 149,70 = Cartão (180 dias)
        if (valorPago >= 59 && valorPago <= 60) {
          diasAssinatura = 60;
          formaPagamento = "pix";
        } else if (valorPago >= 149 && valorPago <= 150) {
          diasAssinatura = 180;
          formaPagamento = "cartao";
        }

        console.log(`💰 Valor pago: R$ ${valorPago} | Forma: ${formaPagamento} | Dias: ${diasAssinatura}`);

        // Calcular data de vencimento
        const dataAtivacao = new Date();
        const dataVencimento = new Date(dataAtivacao);
        dataVencimento.setDate(dataVencimento.getDate() + diasAssinatura);

        // Atualizar operador: ativar conta e remover flags de suspensão
        const { error: updateError } = await supabase
          .from("operadores")
          .update({
            ativo: true,
            suspenso: false,
            aguardando_pagamento: false,
            forma_pagamento: formaPagamento,
            data_pagamento: dataAtivacao.toISOString(),
            data_proximo_vencimento: dataVencimento.toISOString(),
            dias_assinatura: diasAssinatura,
            updated_at: new Date().toISOString(),
          })
          .eq("email", payerEmail);

        if (updateError) {
          console.error("❌ Erro ao ativar operador:", updateError.message);
          return NextResponse.json({ error: "Erro ao ativar conta" }, { status: 500 });
        }

        console.log("✅ Conta ativada com sucesso para:", payerEmail);
        console.log("📅 Vencimento:", dataVencimento.toISOString());

        return NextResponse.json({
          success: true,
          message: "Pagamento processado e conta ativada",
          email: payerEmail,
          vencimento: dataVencimento.toISOString(),
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
