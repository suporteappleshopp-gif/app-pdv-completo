import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("🔔 Webhook MercadoPago recebido:", JSON.stringify(body, null, 2));

    // MercadoPago envia notificações no formato:
    // { id: "123456", live_mode: true, type: "payment", ... }
    const { type, data } = body;

    // Processar apenas notificações de pagamento
    if (type === "payment") {
      const paymentId = data?.id;

      if (!paymentId) {
        console.error("❌ Payment ID não encontrado no webhook");
        return NextResponse.json({ success: false, error: "Payment ID não encontrado" }, { status: 400 });
      }

      // Importar MercadoPago SDK
      const { MercadoPagoConfig, Payment } = await import("mercadopago");

      const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

      if (!mercadoPagoAccessToken) {
        console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
        return NextResponse.json({ success: false, error: "MercadoPago não configurado" }, { status: 500 });
      }

      // Configurar cliente
      const client = new MercadoPagoConfig({ accessToken: mercadoPagoAccessToken });
      const payment = new Payment(client);

      // Buscar detalhes do pagamento
      const paymentInfo = await payment.get({ id: paymentId });

      console.log("💳 Detalhes do pagamento:", JSON.stringify(paymentInfo, null, 2));

      // Verificar se o pagamento foi aprovado
      if (paymentInfo.status === "approved") {
        console.log("✅ Pagamento MercadoPago aprovado!");

        // Extrair dados da external_reference
        const externalReference = paymentInfo.external_reference;

        if (!externalReference) {
          console.error("❌ External reference não encontrada");
          return NextResponse.json({ success: false, error: "External reference não encontrada" }, { status: 400 });
        }

        let referenceData: any = {};
        try {
          referenceData = JSON.parse(externalReference);
        } catch (error) {
          console.error("❌ Erro ao parsear external_reference:", error);
          return NextResponse.json({ success: false, error: "External reference inválida" }, { status: 400 });
        }

        const { usuario_id, forma_pagamento, dias_comprados, tipo_compra } = referenceData;

        // Importar Supabase
        const { supabase } = await import("@/lib/supabase");

        // ⏳ ATUALIZAR SOLICITAÇÃO: Marcar que o pagamento foi confirmado, mas manter PENDENTE para o admin aprovar
        // Verificar se a coluna mercadopago_payment_id existe
        const { data: testColumns, error: testError } = await supabase
          .from("solicitacoes_renovacao")
          .select("mercadopago_payment_id")
          .limit(1);

        if (!testError) {
          // Coluna existe, atualizar com payment_id
          const { error: updateSolicitacaoError } = await supabase
            .from("solicitacoes_renovacao")
            .update({
              mercadopago_payment_id: paymentId.toString(),
              // Status continua "pendente" - admin precisa aprovar manualmente
            })
            .eq("operador_id", usuario_id)
            .eq("status", "pendente")
            .is("mercadopago_payment_id", null)
            .order("data_solicitacao", { ascending: false })
            .limit(1);

          if (updateSolicitacaoError) {
            console.error("❌ Erro ao atualizar solicitação:", updateSolicitacaoError);
          } else {
            console.log("✅ Solicitação atualizada com payment_id. Status: PENDENTE (aguardando aprovação do admin)");
          }
        } else {
          console.warn("⚠️ Coluna mercadopago_payment_id não existe. Webhook processado mas solicitação não atualizada.");
          console.warn("⚠️ Execute a migração do banco de dados (MIGRACAO_URGENTE.md)");
        }

        // 📋 Registrar log do webhook
        const { error: logError } = await supabase
          .from("webhook_logs")
          .insert({
            provider: "mercadopago",
            event_type: type,
            payload: body,
            status: "processado",
            response: {
              success: true,
              message: "Pagamento confirmado. Aguardando aprovação do administrador.",
              usuario_id,
              payment_id: paymentId,
            },
          });

        if (logError) {
          console.error("⚠️ Erro ao registrar log:", logError);
        }

        console.log("✅ Webhook processado! Solicitação marcada como PAGA, mas continua PENDENTE para aprovação manual do admin.");
        return NextResponse.json({
          success: true,
          message: "Pagamento confirmado. Aguardando aprovação do administrador."
        });
      } else {
        console.log(`⏳ Pagamento com status: ${paymentInfo.status}`);

        // Registrar log para outros status
        const { supabase } = await import("@/lib/supabase");
        await supabase
          .from("webhook_logs")
          .insert({
            provider: "mercadopago",
            event_type: type,
            payload: body,
            status: "pendente",
            response: { status: paymentInfo.status },
          });

        return NextResponse.json({ success: true, message: `Status: ${paymentInfo.status}` });
      }
    }

    // Outros tipos de notificação
    console.log(`📬 Notificação do tipo ${type} recebida (não processada)`);
    return NextResponse.json({ success: true, message: "Notificação recebida" });
  } catch (error: any) {
    console.error("❌ Erro ao processar webhook:", error);

    // Tentar registrar erro no banco
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase
        .from("webhook_logs")
        .insert({
          provider: "mercadopago",
          event_type: "error",
          payload: { error: error.message },
          status: "erro",
          response: { error: error.message },
        });
    } catch (logError) {
      console.error("❌ Erro ao registrar log de erro:", logError);
    }

    return NextResponse.json(
      { success: false, error: "Erro ao processar webhook", details: error.message },
      { status: 500 }
    );
  }
}

// Aceitar GET também (MercadoPago pode fazer teste)
export async function GET(request: NextRequest) {
  return NextResponse.json({ success: true, message: "Webhook MercadoPago ativo" });
}
