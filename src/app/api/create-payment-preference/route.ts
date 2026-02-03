import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario_id, forma_pagamento } = body;

    if (!usuario_id || !forma_pagamento) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Importar funções do Supabase
    const { supabase } = await import("@/lib/supabase");

    // Buscar dados do operador
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuario_id)
      .single();

    if (operadorError || !operador) {
      console.error("Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { success: false, error: "Operador não encontrado" },
        { status: 404 }
      );
    }

    // Determinar valores com base na forma de pagamento
    let valor = 0;
    let dias_comprados = 0;
    let tipo_compra = "";
    let titulo = "";
    let descricao = "";

    if (forma_pagamento === "pix") {
      valor = 59.90;
      dias_comprados = 60;
      tipo_compra = "renovacao-60";
      titulo = "Renovação 60 dias - PIX";
      descricao = "Renovação de assinatura por 60 dias com pagamento via PIX";
    } else if (forma_pagamento === "cartao") {
      valor = 149.70;
      dias_comprados = 180;
      tipo_compra = "renovacao-180";
      titulo = "Renovação 180 dias (6 meses) - Cartão";
      descricao = "Renovação de assinatura semestral (180 dias) com pagamento via Cartão";
    } else {
      return NextResponse.json(
        { success: false, error: "Forma de pagamento inválida" },
        { status: 400 }
      );
    }

    // Importar MercadoPago
    const { MercadoPagoConfig, Preference } = await import("mercadopago");

    // Buscar access token do Supabase (ou usar variável de ambiente)
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

    if (!mercadoPagoAccessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        {
          success: false,
          error: "MercadoPago não configurado",
          details: "Chave de acesso do MercadoPago não encontrada",
        },
        { status: 500 }
      );
    }

    // Configurar cliente do MercadoPago
    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoAccessToken,
    });

    const preference = new Preference(client);

    // Criar preferência de pagamento
    const result = await preference.create({
      body: {
        items: [
          {
            id: `${tipo_compra}-${Date.now()}`,
            title: titulo,
            description: descricao,
            quantity: 1,
            unit_price: valor,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: operador.nome,
          email: operador.email,
        },
        payment_methods: {
          excluded_payment_types: forma_pagamento === "pix"
            ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }]
            : [{ id: "ticket" }],
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/caixa`,
          failure: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/financeiro`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/financeiro`,
        },
        auto_return: "approved",
        external_reference: JSON.stringify({
          usuario_id,
          forma_pagamento,
          dias_comprados,
          tipo_compra,
        }),
        notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/webhooks/mercadopago`,
      },
    });

    // Salvar a solicitação no banco (status pendente - aguardando aprovação do admin)
    const { error: insertError } = await supabase
      .from("solicitacoes_renovacao")
      .insert({
        operador_id: usuario_id,
        dias_solicitados: dias_comprados,
        valor: valor,
        forma_pagamento: forma_pagamento,
        status: "pendente",
        mercadopago_preference_id: result.id,
        mercadopago_payment_id: null, // Será preenchido quando o pagamento for confirmado
        data_solicitacao: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Erro ao salvar solicitação:", insertError);
      return NextResponse.json(
        { success: false, error: "Erro ao salvar solicitação no banco" },
        { status: 500 }
      );
    }

    console.log("✅ Solicitação criada com sucesso! Status: PENDENTE (aguardando pagamento e aprovação do admin)");

    return NextResponse.json({
      success: true,
      init_point: result.init_point,
      preference_id: result.id,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar preferência de pagamento:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao criar preferência de pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
