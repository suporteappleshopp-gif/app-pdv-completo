import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    console.log("🔑 Token MP disponível:", !!process.env.MERCADOPAGO_ACCESS_TOKEN);
    console.log("═══════════════════════════════════════════════════════");

    if (!usuario_id || !forma_pagamento) {
      console.error("❌ Parâmetros faltando:", { usuario_id, forma_pagamento });
      return NextResponse.json(
        { error: "usuario_id e forma_pagamento são obrigatórios", success: false },
        { status: 400 }
      );
    }

    // Criar cliente Supabase no servidor (API routes precisam das variáveis sem NEXT_PUBLIC_)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    console.log("🔑 Supabase URL:", supabaseUrl ? supabaseUrl : 'NÃO CONFIGURADO');
    console.log("🔑 Supabase Key:", supabaseKey ? '***configurado***' : 'NÃO CONFIGURADO');

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase não configurado no servidor");
      return NextResponse.json(
        { error: "Configuração do Supabase não encontrada no servidor", success: false },
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

    // VERIFICAR SE JÁ EXISTE UM PAGAMENTO PENDENTE RECENTE (últimos 4 minutos)
    const quatroMinutosAtras = new Date();
    quatroMinutosAtras.setMinutes(quatroMinutosAtras.getMinutes() - 4);

    const { data: pagamentoRecente, error: checkError } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("usuario_id", usuario_id)
      .eq("status", "pendente")
      .eq("forma_pagamento", forma_pagamento)
      .gte("created_at", quatroMinutosAtras.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pagamentoRecente) {
      console.log("⚠️ Já existe pagamento pendente recente");
      // Se já existe um pagamento pendente recente, não criar duplicado
      return NextResponse.json(
        { error: "Já existe um pagamento pendente. Aguarde alguns minutos antes de tentar novamente.", success: false },
        { status: 400 }
      );
    }

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
      console.error("❌ ERRO CRÍTICO ao criar histórico pendente:", historicoError);
      console.error("Detalhes:", JSON.stringify(historicoError, null, 2));
      return NextResponse.json(
        {
          error: "Erro ao criar registro de pagamento no banco de dados",
          success: false,
          details: historicoError.message,
          hint: historicoError.hint
        },
        { status: 500 }
      );
    } else {
      console.log("✅ Registro pendente criado com sucesso:", pagamentoId);
    }

    // Criar preferência de pagamento no Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Configuração de pagamento inválida. Token do Mercado Pago não encontrado.", success: false },
        { status: 500 }
      );
    }

    console.log("🌐 Criando preferência no Mercado Pago...");

    // URL de retorno (onde o usuário volta após pagar)
    const baseUrl = process.env.NEXT_PUBLIC_URL || request.headers.get("origin") || "http://localhost:3000";

    // Criar preferência diferente para PIX e Cartão
    const preference: any = forma_pagamento === "pix"
      ? {
          // PREFERÊNCIA PARA PIX
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
          external_reference: operador.id,
          back_urls: {
            success: `${baseUrl}/caixa?payment=success`,
            failure: `${baseUrl}/pagamento?payment=failed`,
            pending: `${baseUrl}/caixa?payment=pending`,
          },
          auto_return: "approved",
          notification_url: `${baseUrl}/api/webhook/mercadopago`,
          statement_descriptor: "PDV Completo",
          payment_methods: {
            excluded_payment_types: [
              { id: "credit_card" },
              { id: "debit_card" },
              { id: "ticket" },
            ],
            installments: 1,
          },
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
        }
      : {
          // PREFERÊNCIA PARA CARTÃO
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
          external_reference: operador.id,
          back_urls: {
            success: `${baseUrl}/caixa?payment=success`,
            failure: `${baseUrl}/pagamento?payment=failed`,
            pending: `${baseUrl}/caixa?payment=pending`,
          },
          auto_return: "approved",
          notification_url: `${baseUrl}/api/webhook/mercadopago`,
          statement_descriptor: "PDV Completo",
          payment_methods: {
            excluded_payment_types: [{ id: "ticket" }],
            installments: 3,
            default_installments: 1,
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
        {
          error: "Erro ao criar link de pagamento no Mercado Pago",
          success: false,
          details: errorText
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    console.log("✅ Preferência criada com sucesso!");
    console.log("🆔 Preference ID:", data.id);
    console.log("🔗 Link de pagamento (init_point):", data.init_point);
    console.log("🔗 Link sandbox:", data.sandbox_init_point);
    console.log("📋 Client ID:", data.client_id);
    console.log("📋 Collector ID:", data.collector_id);
    console.log("═══════════════════════════════════════════════════════");

    // IMPORTANTE: Se o link está pedindo login, pode ser que a conta não tenha Checkout Pro ativo
    // Verificar se o init_point está válido
    if (!data.init_point || data.init_point.includes('login')) {
      console.warn("⚠️ AVISO: Link de pagamento pode estar incorreto!");
      console.warn("⚠️ Isso pode indicar que a conta do Mercado Pago não tem Checkout Pro ativado");
      console.warn("⚠️ Ou que o token não tem as permissões necessárias");
    }

    return NextResponse.json({
      success: true,
      init_point: data.init_point,
      preference_id: data.id,
      pagamento_id: pagamentoId,
      // Informações adicionais para debug
      collector_id: data.collector_id,
      client_id: data.client_id,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar preferência:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao criar pagamento",
        success: false,
        details: error.message
      },
      { status: 500 }
    );
  }
}
