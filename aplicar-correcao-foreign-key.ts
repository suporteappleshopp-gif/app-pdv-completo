/**
 * ✅ APLICAR CORREÇÃO: Foreign Key entre solicitacoes_renovacao e operadores
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function aplicarCorrecao() {
  console.log("🔧 APLICANDO CORREÇÃO: Foreign Key\n");

  // SQL para corrigir relacionamento
  const sqlCorrecao = `
-- Remover constraint antiga se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'solicitacoes_renovacao_operador_id_fkey'
    AND table_name = 'solicitacoes_renovacao'
  ) THEN
    ALTER TABLE public.solicitacoes_renovacao
      DROP CONSTRAINT solicitacoes_renovacao_operador_id_fkey;
  END IF;
END $$;

-- Adicionar constraint com nome explícito
ALTER TABLE public.solicitacoes_renovacao
  ADD CONSTRAINT solicitacoes_renovacao_operador_id_fkey
  FOREIGN KEY (operador_id)
  REFERENCES public.operadores(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Garantir que o índice existe
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id
  ON public.solicitacoes_renovacao(operador_id);
`;

  console.log("📝 Executando SQL...");

  try {
    // Nota: Supabase JS não suporta execução direta de SQL complexo
    // Vamos tentar uma abordagem alternativa: verificar se a constraint existe

    console.log("\n⚠️  AVISO:");
    console.log("   O Supabase JS não suporta execução de SQL DDL diretamente.");
    console.log("   A migração foi criada em:");
    console.log("   supabase/migrations/20260203184011_fix_foreign_key_solicitacoes_operadores.sql");
    console.log("\n   Para aplicar a migração:");
    console.log("   1. Acesse o Supabase Dashboard");
    console.log("   2. Vá em SQL Editor");
    console.log("   3. Cole e execute o conteúdo da migração");
    console.log("\n   OU use o Supabase CLI quando disponível:");
    console.log("   npx supabase db push");

    // Testar se o JOIN funciona AGORA (pode já estar funcionando)
    console.log("\n🧪 TESTANDO JOIN ATUAL...");

    const { data: teste, error: erroTeste } = await supabase
      .from("solicitacoes_renovacao")
      .select(`
        id,
        operador_id,
        status,
        operadores (
          id,
          nome,
          email
        )
      `)
      .limit(1);

    if (teste && teste.length > 0 && teste[0].operadores) {
      console.log("✅ JOIN JÁ ESTÁ FUNCIONANDO!");
      console.log(`   Operador: ${teste[0].operadores.nome}`);
    } else if (erroTeste) {
      console.log("❌ JOIN ainda não funciona:", erroTeste.message);
      console.log("\n   🔧 SOLUÇÃO ALTERNATIVA:");
      console.log("   Vou modificar o código para não usar JOIN");
    } else {
      console.log("⚠️  Nenhuma solicitação para testar");
    }

  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

aplicarCorrecao().catch(console.error);
