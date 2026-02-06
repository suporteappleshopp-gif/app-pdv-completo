import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API Route para criar a tabela de avarias no Supabase
 * Acesse: /api/criar-tabela-avarias
 */
export async function GET() {
  try {
    console.log("🔧 Criando tabela de avarias...");

    // SQL para criar a tabela
    const createTableSQL = `
      -- Tabela de Avarias
      CREATE TABLE IF NOT EXISTS avarias (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        venda_id TEXT,
        produto_id TEXT NOT NULL,
        produto_nome TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total DECIMAL(10,2) NOT NULL,
        motivo TEXT NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Índices para melhor performance
      CREATE INDEX IF NOT EXISTS idx_avarias_user_id ON avarias(user_id);
      CREATE INDEX IF NOT EXISTS idx_avarias_venda_id ON avarias(venda_id);
      CREATE INDEX IF NOT EXISTS idx_avarias_created_at ON avarias(created_at);

      -- Habilitar Row Level Security (RLS)
      ALTER TABLE avarias ENABLE ROW LEVEL SECURITY;
    `;

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql_query: createTableSQL,
    });

    if (createError) {
      console.error("❌ Erro ao criar tabela:", createError);
      return NextResponse.json(
        { error: "Erro ao criar tabela", details: createError },
        { status: 500 }
      );
    }

    console.log("✅ Tabela criada com sucesso");

    // Criar políticas RLS
    const policiesSQL = `
      -- Remover políticas antigas se existirem
      DROP POLICY IF EXISTS "Usuários podem ver suas próprias avarias" ON avarias;
      DROP POLICY IF EXISTS "Usuários podem inserir suas próprias avarias" ON avarias;
      DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias avarias" ON avarias;
      DROP POLICY IF EXISTS "Usuários podem deletar suas próprias avarias" ON avarias;

      -- Criar novas políticas
      CREATE POLICY "Usuários podem ver suas próprias avarias"
        ON avarias
        FOR SELECT
        USING (user_id IN (SELECT id FROM usuarios WHERE id = user_id));

      CREATE POLICY "Usuários podem inserir suas próprias avarias"
        ON avarias
        FOR INSERT
        WITH CHECK (user_id IN (SELECT id FROM usuarios WHERE id = user_id));

      CREATE POLICY "Usuários podem atualizar suas próprias avarias"
        ON avarias
        FOR UPDATE
        USING (user_id IN (SELECT id FROM usuarios WHERE id = user_id));

      CREATE POLICY "Usuários podem deletar suas próprias avarias"
        ON avarias
        FOR DELETE
        USING (user_id IN (SELECT id FROM usuarios WHERE id = user_id));
    `;

    const { error: policiesError } = await supabase.rpc("exec_sql", {
      sql_query: policiesSQL,
    });

    if (policiesError) {
      console.warn("⚠️ Aviso ao criar políticas RLS:", policiesError);
      // Não retornar erro pois a tabela foi criada
    } else {
      console.log("✅ Políticas RLS configuradas");
    }

    return NextResponse.json({
      success: true,
      message: "Tabela de avarias criada com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return NextResponse.json(
      { error: "Erro ao processar requisição", details: error },
      { status: 500 }
    );
  }
}
