import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Tentar inserir um registro de teste
    const testId = `test_${Date.now()}`;

    const { data, error } = await supabase
      .from("historico_pagamentos")
      .insert({
        id: testId,
        usuario_id: "test_user",
        mes_referencia: "Teste",
        valor: 1.0,
        data_vencimento: new Date().toISOString(),
        data_pagamento: new Date().toISOString(),
        status: "pendente",
        forma_pagamento: "pix",
        dias_comprados: 1,
        tipo_compra: "personalizado",
      })
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: error.hint,
      });
    }

    // Deletar o teste
    await supabase.from("historico_pagamentos").delete().eq("id", testId);

    return NextResponse.json({
      success: true,
      message: "Tabela está funcionando corretamente",
      test_data: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
