/**
 * Script para habilitar RLS e criar políticas para a tabela ganhos_admin
 * Execute: npx tsx src/scripts/fix-ganhos-admin-rls.ts
 */

import { supabase } from "@/lib/supabase";

async function fixGanhosAdminRLS() {
  console.log("🔧 Configurando RLS para tabela ganhos_admin...");

  try {
    // 1. Habilitar RLS
    const { error: enableRLSError } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE ganhos_admin ENABLE ROW LEVEL SECURITY;",
    });

    if (enableRLSError) {
      console.log("⚠️ RLS pode já estar habilitado ou erro:", enableRLSError.message);
    } else {
      console.log("✅ RLS habilitado");
    }

    // 2. Criar política de SELECT
    const { error: selectPolicyError } = await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Permitir leitura de ganhos_admin para todos" ON ganhos_admin;
        CREATE POLICY "Permitir leitura de ganhos_admin para todos"
        ON ganhos_admin
        FOR SELECT
        USING (true);
      `,
    });

    if (selectPolicyError) {
      console.log("⚠️ Erro ao criar política SELECT:", selectPolicyError.message);
    } else {
      console.log("✅ Política SELECT criada");
    }

    // 3. Criar política de INSERT
    const { error: insertPolicyError } = await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Permitir inserção de ganhos_admin para todos" ON ganhos_admin;
        CREATE POLICY "Permitir inserção de ganhos_admin para todos"
        ON ganhos_admin
        FOR INSERT
        WITH CHECK (true);
      `,
    });

    if (insertPolicyError) {
      console.log("⚠️ Erro ao criar política INSERT:", insertPolicyError.message);
    } else {
      console.log("✅ Política INSERT criada");
    }

    // 4. Criar política de UPDATE
    const { error: updatePolicyError } = await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Permitir atualização de ganhos_admin para todos" ON ganhos_admin;
        CREATE POLICY "Permitir atualização de ganhos_admin para todos"
        ON ganhos_admin
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
      `,
    });

    if (updatePolicyError) {
      console.log("⚠️ Erro ao criar política UPDATE:", updatePolicyError.message);
    } else {
      console.log("✅ Política UPDATE criada");
    }

    // 5. Criar política de DELETE
    const { error: deletePolicyError } = await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Permitir exclusão de ganhos_admin para todos" ON ganhos_admin;
        CREATE POLICY "Permitir exclusão de ganhos_admin para todos"
        ON ganhos_admin
        FOR DELETE
        USING (true);
      `,
    });

    if (deletePolicyError) {
      console.log("⚠️ Erro ao criar política DELETE:", deletePolicyError.message);
    } else {
      console.log("✅ Política DELETE criada");
    }

    console.log("\n✅ Configuração de RLS concluída!");
    console.log("🎉 A tabela ganhos_admin agora está acessível!");
  } catch (error) {
    console.error("❌ Erro ao configurar RLS:", error);
  }
}

fixGanhosAdminRLS();
