import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para criar pagamento PIX transparente (sem redirecionar)
 * Retorna o QR Code e o código Pix Copia e Cola
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario_id } = body;

    console.log("═══════════════════════════════════════════════════════");
    console.log("💳 CRIANDO PAGAMENTO PIX TRANSPARENTE");
    console.log("🆔 Usuário ID:", usuario_id);
    console.log("═══════════════════════════════════════════════════════");

    if (!usuario_id) {
      return NextResponse.json(
        { error: "usuario_id é obrigatório", success: false },
        { status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
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

    console.log("✅ Operador encontrado:", operador.nome);

    // VERIFICAR SE JÁ EXISTE UM PAGAMENTO PENDENTE RECENTE (últimos 4 minutos)
    const quatroMinutosAtras = new Date();
    quatroMinutosAtras.setMinutes(quatroMinutosAtras.getMinutes() - 4);

    const { data: pagamentoRecente, error: checkError } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("usuario_id", usuario_id)
      .eq("status", "pendente")
      .eq("forma_pagamento", "pix")
      .gte("created_at", quatroMinutosAtras.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pagamentoRecente) {
      console.log("⚠️ Já existe pagamento pendente recente, retornando o mesmo");
      // Se já existe um pagamento pendente recente, não criar duplicado
      return NextResponse.json(
        { error: "Já existe um pagamento PIX pendente. Aguarde alguns minutos antes de gerar outro.", success: false },
        { status: 400 }
      );
    }

    // Definir plano PIX
    const plano = {
      valor: 59.9,
      dias: 60,
      titulo: "PDV Completo - PIX (60 dias)"
    };

    // Criar solicitação de renovação pendente para aprovação do admin
    const pagamentoId = `pix_${usuario_id}_${Date.now()}`;
    const agora = new Date();

    const { error: historicoError } = await supabase
      .from("historico_pagamentos")
      .insert({
        id: pagamentoId,
        usuario_id: operador.id,
        mes_referencia: `Solicitação ${plano.dias} dias - PIX`,
        valor: plano.valor,
        data_vencimento: agora.toISOString(), // Data da solicitação
        status: "pendente", // Aguardando aprovação do admin
        forma_pagamento: "pix",
        dias_comprados: plano.dias,
        tipo_compra: `renovacao-${plano.dias}`,
        created_at: agora.toISOString(),
        updated_at: agora.toISOString(),
      });

    if (historicoError) {
      console.error("⚠️ Erro ao criar histórico:", historicoError);
    } else {
      console.log("✅ Solicitação de renovação criada (aguardando aprovação do admin):", pagamentoId);
    }

    // Criar pagamento PIX no Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Token do Mercado Pago não encontrado", success: false },
        { status: 500 }
      );
    }

    // URL de notificação
    const baseUrl = process.env.NEXT_PUBLIC_URL || request.headers.get("origin") || "http://localhost:3000";

    // Criar pagamento PIX direto (não preferência)
    const pixPayment = {
      transaction_amount: plano.valor,
      description: plano.titulo,
      payment_method_id: "pix",
      payer: {
        email: operador.email,
        first_name: operador.nome.split(" ")[0],
        last_name: operador.nome.split(" ").slice(1).join(" ") || operador.nome.split(" ")[0],
      },
      notification_url: `${baseUrl}/api/webhook/mercadopago`,
      external_reference: operador.id,
    };

    console.log("📦 Criando pagamento PIX...");

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": pagamentoId, // Evitar duplicatas
      },
      body: JSON.stringify(pixPayment),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro ao criar PIX:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Erro ao criar pagamento PIX",
          success: false,
          details: errorText
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    console.log("✅ Pagamento PIX criado!");
    console.log("🆔 Payment ID:", data.id);
    console.log("📊 Status:", data.status);

    // Extrair dados do QR Code
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCodeText = data.point_of_interaction?.transaction_data?.qr_code;
    const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

    if (!qrCodeBase64 || !qrCodeText) {
      console.error("❌ QR Code não gerado:", data);
      return NextResponse.json(
        { error: "Erro ao gerar QR Code do PIX", success: false },
        { status: 500 }
      );
    }

    console.log("✅ QR Code gerado com sucesso!");
    console.log("═══════════════════════════════════════════════════════");

    // Atualizar registro com ID do pagamento
    await supabase
      .from("historico_pagamentos")
      .update({
        id: `mp_${data.id}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", pagamentoId);

    return NextResponse.json({
      success: true,
      payment_id: data.id,
      qr_code_base64: qrCodeBase64,
      qr_code: qrCodeText,
      ticket_url: ticketUrl,
      valor: plano.valor,
      status: data.status,
      expiration_date: data.date_of_expiration,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar PIX:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao criar pagamento PIX",
        success: false,
        details: error.message
      },
      { status: 500 }
    );
  }
}
