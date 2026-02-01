import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API para verificar status de pagamento de um usuário
 * Útil para debug e diagnóstico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuario_id");

    if (!usuarioId) {
      return NextResponse.json(
        { error: "usuario_id é obrigatório" },
        { status: 400 }
      );
    }

    console.log("🔍 Verificando status do usuário:", usuarioId);

    // Buscar operador
    const { data: operador, error: operadorError } = await supabase
      .from("operadores")
      .select("*")
      .eq("id", usuarioId)
      .maybeSingle();

    if (operadorError) {
      console.error("❌ Erro ao buscar operador:", operadorError);
      return NextResponse.json(
        { error: "Erro ao buscar operador" },
        { status: 500 }
      );
    }

    if (!operador) {
      return NextResponse.json(
        { error: "Operador não encontrado" },
        { status: 404 }
      );
    }

    // Buscar histórico de pagamentos
    const { data: historico, error: historicoError } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (historicoError) {
      console.error("⚠️ Erro ao buscar histórico:", historicoError);
    }

    // Calcular dias restantes
    let diasRestantes = 0;
    if (operador.data_proximo_vencimento) {
      const hoje = new Date();
      const vencimento = new Date(operador.data_proximo_vencimento);
      diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    console.log("✅ Status encontrado:", {
      id: operador.id,
      nome: operador.nome,
      email: operador.email,
      ativo: operador.ativo,
      suspenso: operador.suspenso,
      aguardando_pagamento: operador.aguardando_pagamento,
      forma_pagamento: operador.forma_pagamento,
      data_vencimento: operador.data_proximo_vencimento,
      dias_restantes: diasRestantes,
    });

    return NextResponse.json({
      success: true,
      operador: {
        id: operador.id,
        nome: operador.nome,
        email: operador.email,
        ativo: operador.ativo,
        suspenso: operador.suspenso,
        aguardandoPagamento: operador.aguardando_pagamento,
        formaPagamento: operador.forma_pagamento,
        dataVencimento: operador.data_proximo_vencimento,
        diasRestantes: diasRestantes,
        valorMensal: operador.valor_mensal,
        diasAssinatura: operador.dias_assinatura,
      },
      historico: historico || [],
    });
  } catch (error: any) {
    console.error("❌ Erro ao verificar status:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error.message },
      { status: 500 }
    );
  }
}
