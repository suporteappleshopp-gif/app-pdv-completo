import { readFileSync } from "fs";
import { join } from "path";

async function executarMigracao() {
  console.log("🔧 Executando migração da tabela solicitacoes_renovacao\n");

  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/20260203043812_criar_tabela_solicitacoes_renovacao.sql"
  );

  const sqlContent = readFileSync(migrationPath, "utf-8");

  // Usar o Supabase Service Role para executar SQL bruto
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variáveis de ambiente não encontradas");
    process.exit(1);
  }

  console.log("✓ Conectando ao Supabase...\n");

  // Preparar SQL - remover comentários de bloco
  const sqlLimpo = sqlContent
    .replace(/--[^\n]*/g, "") // Remove comentários de linha
    .replace(/={3,}/g, "") // Remove separadores
    .trim();

  // Executar via Management API
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Primeira tentativa: verificar se tabela já existe
    console.log("1. Verificando se tabela já existe...");
    const { data: checkData, error: checkError } = await supabase
      .from("solicitacoes_renovacao")
      .select("id")
      .limit(1);

    if (!checkError) {
      console.log("✅ Tabela já existe!");
      console.log(`   Registros: ${checkData?.length || 0}\n`);
      return;
    }

    console.log(`   ⚠️  Tabela não encontrada (${checkError.code})\n`);

    // Tentar criar via SQL Editor API
    console.log("2. Executando SQL via API...\n");

    // Separar SQL em blocos executáveis
    const blocos = [
      // Bloco 1: CREATE TABLE
      `CREATE TABLE IF NOT EXISTS public.solicitacoes_renovacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operador_id UUID NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
        forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
        dias_solicitados INTEGER NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
        mensagem_admin TEXT,
        data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data_resposta TIMESTAMP WITH TIME ZONE,
        admin_responsavel_id UUID REFERENCES public.operadores(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Bloco 2: Índices
      `CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador ON public.solicitacoes_renovacao(operador_id);
       CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_renovacao(status);
       CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON public.solicitacoes_renovacao(data_solicitacao DESC);`,

      // Bloco 3: RLS
      `ALTER TABLE public.solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;`,
    ];

    // Execute statements usando REST API diretamente
    console.log("⚠️  ATENÇÃO: A criação de tabelas requer acesso direto ao SQL Editor\n");
    console.log("📋 INSTRUÇÕES PARA CRIAR A TABELA:");
    console.log("=".repeat(70));
    console.log("\n1. Acesse o Supabase Dashboard");
    console.log("2. Vá em SQL Editor");
    console.log("3. Cole e execute o seguinte SQL:\n");
    console.log("=".repeat(70));
    console.log(sqlLimpo);
    console.log("=".repeat(70));
    console.log("\n4. Após executar, teste novamente a funcionalidade no app\n");

  } catch (err: any) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
}

executarMigracao();
