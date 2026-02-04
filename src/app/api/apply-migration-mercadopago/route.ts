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

    console.log("🔧 Aplicando migração: adicionar colunas mercadopago_preference_id e mercadopago_payment_id...");

    // Executar SQL via RPC ou função administrativa
    const sql = `
      -- Adicionar colunas do MercadoPago
      DO $$
      BEGIN
        -- Adicionar mercadopago_preference_id se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'solicitacoes_renovacao'
          AND column_name = 'mercadopago_preference_id'
        ) THEN
          ALTER TABLE public.solicitacoes_renovacao
          ADD COLUMN mercadopago_preference_id TEXT;

          CREATE INDEX idx_solicitacoes_mercadopago_preference_id
          ON public.solicitacoes_renovacao(mercadopago_preference_id);
        END IF;

        -- Adicionar mercadopago_payment_id se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'solicitacoes_renovacao'
          AND column_name = 'mercadopago_payment_id'
        ) THEN
          ALTER TABLE public.solicitacoes_renovacao
          ADD COLUMN mercadopago_payment_id TEXT;

          CREATE INDEX idx_solicitacoes_mercadopago_payment_id
          ON public.solicitacoes_renovacao(mercadopago_payment_id);
        END IF;
      END $$;
    `;

    // Tentar executar via RPC (se houver função exec_sql)
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: "Migração aplicada com sucesso!",
      });
    } catch (rpcError: any) {
      // Se RPC falhar, tentar verificar se as colunas já existem
      const { data: testData, error: testError } = await supabase
        .from("solicitacoes_renovacao")
        .select("mercadopago_preference_id, mercadopago_payment_id")
        .limit(1);

      if (!testError) {
        return NextResponse.json({
          success: true,
          message: "Colunas já existem no banco de dados!",
        });
      }

      // Se falhar, retornar instruções para executar manualmente
      return NextResponse.json({
        success: false,
        error: "Não foi possível aplicar a migração automaticamente. Execute o SQL abaixo no Supabase Dashboard (SQL Editor):",
        sql: `
-- Adicionar colunas do MercadoPago
ALTER TABLE public.solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_preference_id
ON public.solicitacoes_renovacao(mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON public.solicitacoes_renovacao(mercadopago_payment_id);
        `,
        instructions: [
          "1. Acesse o Supabase Dashboard",
          "2. Vá em SQL Editor",
          "3. Cole o SQL acima e execute",
          "4. Recarregue esta página"
        ]
      });
    }
  } catch (error: any) {
    console.error("❌ Erro ao aplicar migração:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: "Erro ao aplicar migração no banco de dados"
    }, { status: 500 });
  }
}
