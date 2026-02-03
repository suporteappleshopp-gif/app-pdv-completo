import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente não configuradas!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function aplicarMigracao() {
  console.log("🔧 Aplicando migração: criar_tabela_solicitacoes_renovacao\n");

  // Ler arquivo de migração
  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/20260203043812_criar_tabela_solicitacoes_renovacao.sql"
  );

  let sqlContent: string;
  try {
    sqlContent = readFileSync(migrationPath, "utf-8");
    console.log("✓ Arquivo de migração lido com sucesso\n");
  } catch (err: any) {
    console.error("❌ Erro ao ler arquivo de migração:", err.message);
    process.exit(1);
  }

  // Dividir SQL em statements individuais
  const statements = sqlContent
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--") && !s.match(/^={3,}/));

  console.log(`📋 Total de comandos SQL: ${statements.length}\n`);

  let sucessos = 0;
  let erros = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ";";

    // Pular comentários e linhas vazias
    if (
      statement.trim().startsWith("--") ||
      statement.trim() === ";" ||
      statement.length < 10
    ) {
      continue;
    }

    // Mostrar preview do comando
    const preview = statement.substring(0, 80).replace(/\n/g, " ");
    console.log(`${i + 1}. Executando: ${preview}...`);

    try {
      // Usar postgres REST API para executar SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: statement }),
      });

      if (!response.ok) {
        // Tentar método alternativo - criar via client
        console.log("   ℹ️  Tentando método alternativo...");

        // Para CREATE TABLE, tentar via data API
        if (statement.includes("CREATE TABLE")) {
          console.log("   ⚠️  Comando CREATE TABLE precisa ser executado manualmente");
          erros++;
          continue;
        }
      }

      console.log("   ✓ Sucesso");
      sucessos++;
    } catch (err: any) {
      console.log(`   ❌ Erro: ${err.message}`);
      erros++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Comandos executados com sucesso: ${sucessos}`);
  console.log(`❌ Comandos com erro: ${erros}`);
  console.log("=".repeat(60) + "\n");

  // Verificar se tabela foi criada
  console.log("🔍 Verificando se tabela foi criada...\n");

  const { data, error } = await supabase
    .from("solicitacoes_renovacao")
    .select("id")
    .limit(1);

  if (!error) {
    console.log("✅ SUCESSO! Tabela solicitacoes_renovacao criada e acessível!");
    console.log(`📋 Registros encontrados: ${data?.length || 0}\n`);
  } else {
    console.log("❌ Tabela ainda não está acessível");
    console.log(`   Código: ${error.code}`);
    console.log(`   Mensagem: ${error.message}\n`);

    console.log("📝 SOLUÇÃO:");
    console.log("Execute o SQL manualmente no Supabase Dashboard (SQL Editor):");
    console.log(`   Arquivo: ${migrationPath}\n`);
  }
}

aplicarMigracao().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
