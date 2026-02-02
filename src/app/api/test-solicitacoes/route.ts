import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Verificar se a tabela existe e buscar pendentes
    const { data: solicitacoes, error } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
      });
    }

    // Buscar TODAS as entradas para debug
    const { data: todos, error: errorTodos } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      pendentes: solicitacoes || [],
      total_pendentes: solicitacoes?.length || 0,
      ultimos_10_registros: todos || [],
      total_registros: todos?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
