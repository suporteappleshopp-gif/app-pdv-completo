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
        console.log("✅ Pagamento aprovado!");

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

        // 1. Atualizar solicitação para aprovada
        const { error: updateSolicitacaoError } = await supabase
          .from("solicitacoes_renovacao")
          .update({
            status: "aprovado",
            mensagem_admin: "Pagamento aprovado automaticamente via MercadoPago",
            data_resposta: new Date().toISOString(),
          })
          .eq("mercadopago_preference_id", paymentInfo.additional_info?.items?.[0]?.id?.split("-")?.[0] || "");

        if (updateSolicitacaoError) {
          console.error("❌ Erro ao atualizar solicitação:", updateSolicitacaoError);
        }

        // 2. Criar registro no histórico de pagamentos
        const { error: insertHistoricoError } = await supabase
          .from("historico_pagamentos")
          .insert({
            usuario_id,
            mes_referencia: paymentInfo.description || `Renovação ${dias_comprados} dias`,
            valor: paymentInfo.transaction_amount,
            data_vencimento: new Date().toISOString(),
            data_pagamento: new Date().toISOString(),
            status: "pago",
            forma_pagamento,
            dias_comprados,
            tipo_compra,
            observacao_admin: `Pagamento MercadoPago ID: ${paymentId}`,
            aprovado_por: "sistema_automatico",
            data_aprovacao: new Date().toISOString(),
          });

        if (insertHistoricoError) {
          console.error("❌ Erro ao inserir no histórico:", insertHistoricoError);
        }

        // 3. Atualizar dias do operador
        const { data: operador, error: operadorError } = await supabase
          .from("operadores")
          .select("data_proximo_vencimento")
          .eq("id", usuario_id)
          .single();

        if (operadorError) {
          console.error("❌ Erro ao buscar operador:", operadorError);
        } else {
          // Calcular nova data de vencimento
          const dataAtual = operador?.data_proximo_vencimento
            ? new Date(operador.data_proximo_vencimento)
            : new Date();

          // Se a data já passou, usar data atual
          if (dataAtual < new Date()) {
            dataAtual.setTime(new Date().getTime());
          }

          // Adicionar dias comprados
          dataAtual.setDate(dataAtual.getDate() + dias_comprados);

          // Atualizar operador
          const { error: updateOperadorError } = await supabase
            .from("operadores")
            .update({
              data_proximo_vencimento: dataAtual.toISOString(),
              ativo: true,
              suspenso: false,
            })
            .eq("id", usuario_id);

          if (updateOperadorError) {
            console.error("❌ Erro ao atualizar operador:", updateOperadorError);
          } else {
            console.log(`✅ Operador atualizado! Novo vencimento: ${dataAtual.toISOString()}`);
          }
        }

        // 4. Registrar log do webhook
        const { error: logError } = await supabase
          .from("webhook_logs")
          .insert({
            provider: "mercadopago",
            event_type: type,
            payload: body,
            status: "processado",
            response: { success: true, message: "Pagamento aprovado e dias creditados" },
          });

        if (logError) {
          console.error("⚠️ Erro ao registrar log:", logError);
        }

        console.log("✅ Webhook processado com sucesso!");
        return NextResponse.json({ success: true, message: "Pagamento processado" });
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
