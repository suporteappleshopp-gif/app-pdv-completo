import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente do Supabase não configuradas",
      }, { status: 500 });
    }

    // Criar cliente com permissões de admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("🔧 Habilitando Realtime para vendas, ganhos e produtos...");

    // SQL para habilitar Realtime
    const sql = `
      -- Habilitar Realtime para tabela de vendas
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS vendas;

      -- Habilitar Realtime para tabela de itens_venda
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS itens_venda;

      -- Habilitar Realtime para tabela de ganhos_admin
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS ganhos_admin;

      -- Habilitar Realtime para tabela de produtos
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS produtos;
    `;

    // Tentar executar via RPC
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: "Realtime habilitado com sucesso!",
      });
    } catch (rpcError: any) {
      // Se RPC falhar, retornar instruções manuais
      return NextResponse.json({
        success: false,
        error: "Não foi possível habilitar automaticamente. Execute via Supabase Dashboard:",
        instructions: [
          "1. Acesse https://supabase.com/dashboard",
          "2. Selecione seu projeto",
          "3. Vá em Database → Replication",
          "4. Na seção 'supabase_realtime', habilite as tabelas:",
          "   - vendas",
          "   - itens_venda",
          "   - ganhos_admin",
          "   - produtos",
          "5. Clique em 'Save'"
        ],
        sql: sql.trim(),
      });
    }
  } catch (error: any) {
    console.error("❌ Erro ao habilitar Realtime:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: "Erro ao configurar Realtime no banco de dados"
    }, { status: 500 });
  }
}
