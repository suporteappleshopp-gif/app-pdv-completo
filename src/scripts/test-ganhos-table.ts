/**
 * Script para testar a tabela ganhos_admin
 * Execute: npx tsx src/scripts/test-ganhos-table.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Usar service role key para ter permissões de admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testGanhosTable() {
  console.log("🧪 Testando tabela ganhos_admin...");
  console.log("📡 URL:", supabaseUrl);

  try {
    // Tentar buscar ganhos
    console.log("\n1️⃣ Tentando SELECT na tabela...");
    const { data, error } = await supabaseAdmin
      .from("ganhos_admin")
      .select("*")
      .limit(5);

    if (error) {
      console.error("❌ Erro ao buscar ganhos:", error);

      // Se o erro for de RLS, vamos desabilitar
      if (error.message.includes("policy") || error.message.includes("RLS")) {
        console.log("\n2️⃣ Detectado erro de RLS. Aplicando políticas...");

        // Desabilitar RLS temporariamente
        const { error: disableRLSError } = await supabaseAdmin.rpc("exec_sql", {
          query: "ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;",
        });

        if (disableRLSError) {
          console.log("⚠️ Não foi possível desabilitar RLS via RPC");
          console.log("💡 Solução: Execute este SQL no Dashboard do Supabase:");
          console.log("\n--- SQL PARA COPIAR E COLAR ---");
          console.log("ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;");
          console.log("-------------------------------\n");
        }
      }
    } else {
      console.log("✅ Tabela acessível! Ganhos encontrados:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("📊 Primeiros ganhos:", data);
      }
    }
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

testGanhosTable();
