import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API para criar preferência de pagamento no Mercado Pago
 * Esta API cria um link de pagamento personalizado com external_reference
 * para identificar o usuário no webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario_id, forma_pagamento } = body;

    console.log("═══════════════════════════════════════════════════════");
    console.log("💳 CRIANDO PREFERÊNCIA DE PAGAMENTO");
    console.log("🆔 Usuário ID:", usuario_id);
    console.log("💰 Forma de pagamento:", forma_pagamento);
    console.log("═══════════════════════════════════════════════════════");

    if (!usuario_id || !forma_pagamento) {
      return NextResponse.json(
        { error: "usuario_id e forma_pagamento são obrigatórios" },
        { status: 400 }
      );
    }

    // Buscar dados do usuário
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuario_id)
      .single();

    if (operadorError || !operador) {
      console.error("❌ Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { error: "Usuário não encontrado" },
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
      return NextResponse.json(
        { error: "Forma de pagamento inválida" },
        { status: 400 }
      );
    }

    console.log("📋 Plano selecionado:", plano.titulo, "- R$", plano.valor);

    // Criar registro pendente no histórico de pagamentos
    const pagamentoId = `pending_${usuario_id}_${Date.now()}`;
    const agora = new Date();
    const vencimento = new Date(agora);
    vencimento.setDate(vencimento.getDate() + plano.dias);

    console.log("💾 Criando registro pendente no histórico...");

    const { error: historicoError } = await supabase
      .from("historico_pagamentos")
      .insert({
        id: pagamentoId,
        usuario_id: operador.id,
        mes_referencia: `Compra ${plano.dias} dias - ${forma_pagamento.toUpperCase()}`,
        valor: plano.valor,
        data_vencimento: vencimento.toISOString(),
        data_pagamento: agora.toISOString(),
        status: "pendente",
        forma_pagamento: forma_pagamento,
        dias_comprados: plano.dias,
        tipo_compra: `renovacao-${plano.dias}`,
        created_at: agora.toISOString(),
        updated_at: agora.toISOString(),
      });

    if (historicoError) {
      console.error("⚠️ Erro ao criar histórico pendente:", historicoError);
      // Não bloquear o processo por isso
    } else {
      console.log("✅ Registro pendente criado:", pagamentoId);
    }

    // Criar preferência de pagamento no Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Configuração de pagamento inválida" },
        { status: 500 }
      );
    }

    console.log("🌐 Criando preferência no Mercado Pago...");

    // URL de retorno (onde o usuário volta após pagar)
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const preference = {
      items: [
        {
          title: plano.titulo,
          quantity: 1,
          unit_price: plano.valor,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: operador.nome,
        email: operador.email,
      },
      external_reference: operador.id, // CRÍTICO: Identifica o usuário no webhook
      back_urls: {
        success: `${baseUrl}/caixa?payment=success`,
        failure: `${baseUrl}/pagamento?payment=failed`,
        pending: `${baseUrl}/caixa?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhook/mercadopago`, // Webhook
      statement_descriptor: "PDV Completo",
      payment_methods: {
        excluded_payment_types: forma_pagamento === "pix" ? [{ id: "credit_card" }, { id: "debit_card" }] : [],
        excluded_payment_methods: [],
        installments: forma_pagamento === "cartao" ? 3 : 1,
      },
    };

    console.log("📦 Dados da preferência:", JSON.stringify(preference, null, 2));

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro ao criar preferência:", response.status, errorText);
      return NextResponse.json(
        { error: "Erro ao criar link de pagamento" },
        { status: 500 }
      );
    }

    const data = await response.json();

    console.log("✅ Preferência criada com sucesso!");
    console.log("🆔 Preference ID:", data.id);
    console.log("🔗 Link de pagamento:", data.init_point);
    console.log("═══════════════════════════════════════════════════════");

    return NextResponse.json({
      success: true,
      init_point: data.init_point,
      preference_id: data.id,
      pagamento_id: pagamentoId,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar preferência:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar pagamento" },
      { status: 500 }
    );
  }
}
