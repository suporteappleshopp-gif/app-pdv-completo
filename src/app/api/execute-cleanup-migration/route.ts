import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API para executar a migração de limpeza de pagamentos pendentes
 * Esta é uma rota administrativa que deve ser executada uma vez
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Configuração do Supabase não encontrada",
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🧹 Executando limpeza de pagamentos pendentes antigos...");

    // Executar DELETE direto
    const { data: deleted, error: deleteError } = await supabase
      .from("historico_pagamentos")
      .delete()
      .eq("status", "pendente")
      .lt("created_at", new Date(Date.now() - 4 * 60 * 1000).toISOString())
      .select();

    if (deleteError) {
      console.error("❌ Erro ao deletar:", deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message,
      }, { status: 500 });
    }

    const quantidade = deleted?.length || 0;
    console.log(`✅ ${quantidade} pagamento(s) pendente(s) removido(s)`);

    // Criar a função SQL
    const { error: functionError } = await supabase.rpc("exec_sql" as any, {
      sql: `
        CREATE OR REPLACE FUNCTION limpar_pagamentos_pendentes_antigos()
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM historico_pagamentos
          WHERE status = 'pendente'
            AND created_at < (NOW() - INTERVAL '4 minutes');

          GET DIAGNOSTICS deleted_count = ROW_COUNT;

          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `,
    });

    if (functionError) {
      console.warn("⚠️ Função SQL não criada:", functionError);
    } else {
      console.log("✅ Função limpar_pagamentos_pendentes_antigos() criada");
    }

    return NextResponse.json({
      success: true,
      removed: quantidade,
      message: `Limpeza concluída! ${quantidade} pagamento(s) removido(s)`,
    });
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
