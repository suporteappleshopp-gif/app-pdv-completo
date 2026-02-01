import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API para corrigir RLS do historico_pagamentos automaticamente
 */
export async function POST() {
  try {
    console.log("🔧 Iniciando correção de RLS...");

    // SQL para corrigir as políticas RLS
    const sqlFix = `
      -- Remover políticas antigas
      DROP POLICY IF EXISTS "Usuarios podem ver seus proprios pagamentos" ON historico_pagamentos;
      DROP POLICY IF EXISTS "Sistema pode inserir pagamentos" ON historico_pagamentos;
      DROP POLICY IF EXISTS "Sistema pode atualizar pagamentos" ON historico_pagamentos;

      -- Criar novas políticas permissivas
      CREATE POLICY "Usuarios e API podem ver pagamentos"
      ON historico_pagamentos
      FOR SELECT
      USING (true);

      CREATE POLICY "API pode inserir pagamentos"
      ON historico_pagamentos
      FOR INSERT
      WITH CHECK (true);

      CREATE POLICY "API pode atualizar pagamentos"
      ON historico_pagamentos
      FOR UPDATE
      USING (true)
      WITH CHECK (true);

      CREATE POLICY "API pode deletar pagamentos"
      ON historico_pagamentos
      FOR DELETE
      USING (true);
    `;

    // Executar SQL
    const { error } = await supabase.rpc("exec_sql", { sql_query: sqlFix });

    if (error) {
      console.error("❌ Erro ao executar SQL:", error);

      // Se não tiver a função exec_sql, tentar método alternativo
      // Executar cada comando separadamente usando o client do Supabase
      return NextResponse.json({
        success: false,
        error: "Não foi possível executar SQL direto. Use a página de correção manual.",
        details: error.message,
      });
    }

    console.log("✅ RLS corrigido com sucesso!");

    return NextResponse.json({
      success: true,
      message: "RLS corrigido com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro crítico:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST para aplicar correção de RLS",
  });
}
