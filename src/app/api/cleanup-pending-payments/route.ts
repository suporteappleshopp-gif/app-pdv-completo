import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para limpar pagamentos pendentes antigos (mais de 4 minutos)
 * Esta API deve ser chamada periodicamente
 */
export async function POST(request: NextRequest) {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🧹 LIMPANDO PAGAMENTOS PENDENTES ANTIGOS");
    console.log("═══════════════════════════════════════════════════════");

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

    // Calcular timestamp de 4 minutos atrás
    const quatroMinutosAtras = new Date();
    quatroMinutosAtras.setMinutes(quatroMinutosAtras.getMinutes() - 4);

    console.log("📅 Removendo pagamentos pendentes antes de:", quatroMinutosAtras.toISOString());

    // Buscar pagamentos pendentes antigos
    const { data: pagamentosAntigos, error: fetchError } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("status", "pendente")
      .lt("created_at", quatroMinutosAtras.toISOString());

    if (fetchError) {
      console.error("❌ Erro ao buscar pagamentos:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos", success: false },
        { status: 500 }
      );
    }

    const quantidadeRemover = pagamentosAntigos?.length || 0;
    console.log(`📊 Encontrados ${quantidadeRemover} pagamentos pendentes antigos`);

    if (quantidadeRemover === 0) {
      console.log("✅ Nenhum pagamento pendente antigo para remover");
      return NextResponse.json({
        success: true,
        message: "Nenhum pagamento para limpar",
        removidos: 0
      });
    }

    // Remover pagamentos pendentes antigos
    const { error: deleteError } = await supabase
      .from("historico_pagamentos")
      .delete()
      .eq("status", "pendente")
      .lt("created_at", quatroMinutosAtras.toISOString());

    if (deleteError) {
      console.error("❌ Erro ao remover pagamentos:", deleteError);
      return NextResponse.json(
        { error: "Erro ao remover pagamentos", success: false },
        { status: 500 }
      );
    }

    console.log(`✅ ${quantidadeRemover} pagamentos pendentes removidos com sucesso!`);
    console.log("═══════════════════════════════════════════════════════");

    return NextResponse.json({
      success: true,
      message: `${quantidadeRemover} pagamento(s) pendente(s) removido(s)`,
      removidos: quantidadeRemover
    });
  } catch (error: any) {
    console.error("❌ Erro ao limpar pagamentos:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao limpar pagamentos",
        success: false,
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Permitir GET também para facilitar testes
export async function GET(request: NextRequest) {
  return POST(request);
}
