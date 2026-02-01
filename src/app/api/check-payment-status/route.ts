import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para verificar status do pagamento de um usuário
 * Usado para polling e detecção de pagamentos aprovados
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuario_id");
    const mercadopagoPaymentId = searchParams.get("payment_id");
    const preferenceId = searchParams.get("preference_id");

    console.log("🔍 Verificando status de pagamento");
    console.log("🆔 Usuário ID:", usuarioId);
    console.log("💳 Payment ID:", mercadopagoPaymentId);
    console.log("📋 Preference ID:", preferenceId);

    if (!usuarioId) {
      return NextResponse.json(
        { error: "usuario_id é obrigatório" },
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

    // Buscar operador para verificar status da conta
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuarioId)
      .maybeSingle();

    if (operadorError) {
      console.error("❌ Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { error: "Erro ao buscar dados do usuário" },
        { status: 500 }
      );
    }

    if (!operador) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ Operador encontrado:", operador.nome);
    console.log("📊 Status atual:", {
      ativo: operador.ativo,
      suspenso: operador.suspenso,
      aguardando_pagamento: operador.aguardando_pagamento,
    });

    // Se já está ativo e não suspenso, pagamento foi processado!
    if (operador.ativo && !operador.suspenso && !operador.aguardando_pagamento) {
      console.log("✅ CONTA ATIVA - Pagamento foi processado!");

      // Calcular dias restantes
      let diasRestantes = 0;
      if (operador.data_proximo_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(operador.data_proximo_vencimento);
        diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      }

      return NextResponse.json({
        success: true,
        payment_approved: true,
        account_active: true,
        operador: {
          id: operador.id,
          nome: operador.nome,
          email: operador.email,
          ativo: operador.ativo,
          suspenso: operador.suspenso,
          aguardando_pagamento: operador.aguardando_pagamento,
          forma_pagamento: operador.forma_pagamento,
          data_vencimento: operador.data_proximo_vencimento,
          dias_restantes: diasRestantes,
          dias_assinatura: operador.dias_assinatura,
          valor_mensal: operador.valor_mensal,
        },
      });
    }

    // Se temos um payment_id do Mercado Pago, vamos consultar diretamente
    if (mercadopagoPaymentId || preferenceId) {
      console.log("🔍 Consultando Mercado Pago diretamente...");

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("❌ Token do Mercado Pago não configurado");
      } else {
        try {
          // Se temos preference_id, buscar pagamentos relacionados
          if (preferenceId && !mercadopagoPaymentId) {
            console.log("📋 Buscando pagamentos por preference_id:", preferenceId);

            const searchResponse = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${usuarioId}&sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1HOURS&end_date=NOW`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              console.log("📦 Pagamentos encontrados:", searchData.results?.length || 0);

              if (searchData.results && searchData.results.length > 0) {
                // Pegar o pagamento mais recente
                const latestPayment = searchData.results[0];
                console.log("💳 Último pagamento:", {
                  id: latestPayment.id,
                  status: latestPayment.status,
                  status_detail: latestPayment.status_detail,
                });

                if (latestPayment.status === "approved") {
                  console.log("✅ PAGAMENTO APROVADO no Mercado Pago!");
                  console.log("🔄 Forçando processamento imediato...");

                  // Forçar processamento imediato do pagamento
                  try {
                    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
                    const forceResponse = await fetch(`${baseUrl}/api/force-payment-check`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        payment_id: latestPayment.id,
                        usuario_id: usuarioId,
                      }),
                    });

                    if (forceResponse.ok) {
                      const forceData = await forceResponse.json();
                      console.log("✅ Processamento forçado concluído!");
                      return NextResponse.json(forceData);
                    }
                  } catch (forceError) {
                    console.error("⚠️ Erro ao forçar processamento:", forceError);
                  }

                  return NextResponse.json({
                    success: true,
                    payment_approved: true,
                    account_active: false, // Ainda não processado pelo webhook
                    waiting_webhook: true,
                    mercadopago_status: "approved",
                    payment_id: latestPayment.id,
                    message: "Pagamento aprovado! Ativando sua conta...",
                  });
                }

                return NextResponse.json({
                  success: true,
                  payment_approved: false,
                  account_active: false,
                  mercadopago_status: latestPayment.status,
                  payment_id: latestPayment.id,
                  status_detail: latestPayment.status_detail,
                });
              }
            }
          }

          // Se temos payment_id direto, buscar específico
          if (mercadopagoPaymentId) {
            console.log("💳 Consultando payment_id direto:", mercadopagoPaymentId);

            const paymentResponse = await fetch(
              `https://api.mercadopago.com/v1/payments/${mercadopagoPaymentId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (paymentResponse.ok) {
              const payment = await paymentResponse.json();
              console.log("💳 Status do pagamento:", payment.status);

              if (payment.status === "approved") {
                console.log("✅ PAGAMENTO APROVADO!");
                console.log("🔄 Forçando processamento imediato...");

                // Forçar processamento imediato do pagamento
                try {
                  const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
                  const forceResponse = await fetch(`${baseUrl}/api/force-payment-check`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      payment_id: payment.id,
                      usuario_id: usuarioId,
                    }),
                  });

                  if (forceResponse.ok) {
                    const forceData = await forceResponse.json();
                    console.log("✅ Processamento forçado concluído!");
                    return NextResponse.json(forceData);
                  }
                } catch (forceError) {
                  console.error("⚠️ Erro ao forçar processamento:", forceError);
                }

                return NextResponse.json({
                  success: true,
                  payment_approved: true,
                  account_active: false, // Ainda não processado pelo webhook
                  waiting_webhook: true,
                  mercadopago_status: "approved",
                  payment_id: payment.id,
                  message: "Pagamento aprovado! Ativando sua conta...",
                });
              }

              return NextResponse.json({
                success: true,
                payment_approved: false,
                account_active: false,
                mercadopago_status: payment.status,
                payment_id: payment.id,
                status_detail: payment.status_detail,
              });
            }
          }
        } catch (mpError: any) {
          console.error("⚠️ Erro ao consultar Mercado Pago:", mpError.message);
          // Continua e retorna status do banco
        }
      }
    }

    // Conta ainda não está ativa
    console.log("⏳ Aguardando confirmação de pagamento...");
    return NextResponse.json({
      success: true,
      payment_approved: false,
      account_active: false,
      operador: {
        ativo: operador.ativo,
        suspenso: operador.suspenso,
        aguardando_pagamento: operador.aguardando_pagamento,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao verificar status:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error.message },
      { status: 500 }
    );
  }
}
