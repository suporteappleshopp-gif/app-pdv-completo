/**
 * ✅ APLICAR MIGRAÇÃO FOREIGN KEY NO SUPABASE
 *
 * Este script usa o Service Role para executar SQL direto no banco
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function aplicarMigracao() {
  console.log("🔧 APLICANDO MIGRAÇÃO: Foreign Key Constraint\n");

  // SQL para executar
  const sql = `
-- Remover constraint antiga se existir
ALTER TABLE public.solicitacoes_renovacao
DROP CONSTRAINT IF EXISTS solicitacoes_renovacao_operador_id_fkey;

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

SELECT 'Migração concluída com sucesso!' AS mensagem;
`;

  console.log("📝 Executando SQL via RPC...\n");

  try {
    // Tentar executar via rpc (se a função estiver disponível)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ data: null, error: null }));

    if (error) {
      console.log("⚠️  RPC não disponível. Tentando método alternativo...\n");

      // Método alternativo: Usar supabase-js para manipular dados (não DDL)
      console.log("ℹ️  O Supabase JS não permite executar DDL (ALTER TABLE) diretamente.");
      console.log("\n📋 INSTRUÇÕES PARA APLICAR MANUALMENTE:");
      console.log("=" .repeat(70));
      console.log("\n1. Acesse: https://supabase.com/dashboard");
      console.log("2. Selecione seu projeto");
      console.log("3. Vá em: SQL Editor (menu lateral)");
      console.log("4. Cole e execute o SQL abaixo:\n");
      console.log("=" .repeat(70));
      console.log(sql);
      console.log("=" .repeat(70));
      console.log("\n5. Clique em 'Run' para executar");
      console.log("\n✅ Após executar, o sistema de renovação funcionará perfeitamente!");

      return;
    }

    if (data) {
      console.log("✅ Migração aplicada com sucesso!");
      console.log("   Resultado:", data);
    }

  } catch (err: any) {
    console.error("❌ Erro ao aplicar migração:", err.message);
    console.log("\n📋 Execute o SQL manualmente no Supabase Dashboard:");
    console.log(sql);
  }

  // Testar se a migração funcionou
  console.log("\n🧪 TESTANDO RELACIONAMENTO...");

  const { data: teste, error: erroTeste } = await supabase
    .from("solicitacoes_renovacao")
    .select(`
      id,
      status,
      operadores (
        id,
        nome,
        email
      )
    `)
    .limit(1);

  if (teste && teste.length > 0 && teste[0].operadores) {
    console.log("✅ JOIN FUNCIONANDO!");
    console.log(`   Operador: ${teste[0].operadores.nome}`);
  } else if (erroTeste) {
    console.log("❌ JOIN ainda não funciona:", erroTeste.message);
    console.log("\n   Isso é normal se você ainda não executou o SQL manualmente.");
    console.log("   Siga as instruções acima para aplicar a migração.");
  }
}

aplicarMigracao().catch(console.error);
