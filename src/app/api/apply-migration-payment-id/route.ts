import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await import("@/lib/supabase");

    console.log("🔧 Aplicando migração: adicionar mercadopago_payment_id...");

    // Verificar se a coluna já existe
    const { data: testData, error: testError } = await supabase
      .from("solicitacoes_renovacao")
      .select("mercadopago_payment_id")
      .limit(1);

    if (testError) {
      if (testError.message.includes("column") || testError.message.includes("does not exist")) {
        return NextResponse.json({
          success: false,
          error: "Coluna não existe. Execute o SQL manualmente no Supabase Dashboard:",
          sql: `
ALTER TABLE solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON solicitacoes_renovacao(mercadopago_payment_id);
          `,
        });
      }

      return NextResponse.json({
        success: false,
        error: testError.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Coluna mercadopago_payment_id já existe!",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
