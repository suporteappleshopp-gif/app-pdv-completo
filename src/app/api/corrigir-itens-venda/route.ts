import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Importar Supabase com service role key
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Supabase não configurado",
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔧 Executando correção da tabela itens_venda...");

    // Verificar se a coluna já existe
    const { data: testData, error: testError } = await supabase
      .from('itens_venda')
      .select('nome')
      .limit(1);

    if (!testError) {
      return NextResponse.json({
        success: true,
        message: "Coluna 'nome' já existe! Nenhuma ação necessária.",
        alreadyExists: true,
      });
    }

    console.log("⚠️ Coluna não encontrada, precisa ser criada via SQL");

    // Como não podemos executar ALTER TABLE diretamente via API,
    // retornar instruções para executar manualmente
    return NextResponse.json({
      success: false,
      needsManualFix: true,
      error: "A coluna 'nome' não existe na tabela itens_venda",
      sql: `-- Execute este SQL no Supabase SQL Editor:

ALTER TABLE itens_venda
ADD COLUMN IF NOT EXISTS nome TEXT;

UPDATE itens_venda
SET nome = COALESCE(nome, 'Produto')
WHERE nome IS NULL;

ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;`,
      instructions: [
        "1. Copie o SQL acima",
        "2. Abra o Supabase SQL Editor",
        "3. Cole e execute o SQL",
        "4. Teste criando uma nova venda no app"
      ]
    });

  } catch (error: any) {
    console.error("❌ Erro ao verificar itens_venda:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
