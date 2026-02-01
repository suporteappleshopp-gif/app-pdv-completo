import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para limpar pagamentos pendentes que têm mais de 4 minutos
 * Isso evita que a lista fique cheia de tentativas antigas
 */
export async function POST() {
  try {
    console.log("🧹 LIMPANDO PAGAMENTOS PENDENTES ANTIGOS...");

    // Criar cliente Supabase no servidor
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: "Supabase não configurado",
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular timestamp de 4 minutos atrás
    const quatroMinutosAtras = new Date();
    quatroMinutosAtras.setMinutes(quatroMinutosAtras.getMinutes() - 4);

    console.log("⏰ Removendo pagamentos pendentes criados antes de:", quatroMinutosAtras.toISOString());

    // Deletar pagamentos pendentes antigos
    const { data: deletedPayments, error: deleteError} = await supabase
      .from("historico_pagamentos")
      .delete()
      .eq("status", "pendente")
      .lt("created_at", quatroMinutosAtras.toISOString())
      .select();

    if (deleteError) {
      console.error("❌ Erro ao deletar pagamentos:", deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message,
      });
    }

    const quantidade = deletedPayments?.length || 0;
    console.log(`✅ ${quantidade} pagamento(s) pendente(s) removido(s)`);

    return NextResponse.json({
      success: true,
      removed: quantidade,
      message: `${quantidade} pagamento(s) pendente(s) removido(s)`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao limpar pagamentos:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// Permitir GET também
export async function GET() {
  return POST();
}
