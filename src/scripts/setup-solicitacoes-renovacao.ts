import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente não configuradas!");
  console.error("VITE_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setup() {
  console.log("🔧 Configurando tabela solicitacoes_renovacao...\n");

  // Verificar se a tabela já existe
  console.log("1. Verificando se tabela existe...");
  const { data: existingData, error: existingError } = await supabase
    .from("solicitacoes_renovacao")
    .select("id")
    .limit(1);

  if (!existingError) {
    console.log("✅ Tabela já existe!");
    console.log(`   Total de registros: ${existingData?.length || 0}\n`);

    // Listar todas as solicitações
    const { data: all, error: allError } = await supabase
      .from("solicitacoes_renovacao")
      .select("*")
      .order("data_solicitacao", { ascending: false });

    if (!allError && all) {
      console.log(`📋 Solicitações encontradas: ${all.length}\n`);
      all.forEach((sol, i) => {
        console.log(`${i + 1}. Status: ${sol.status} | Operador: ${sol.operador_id} | Valor: R$ ${sol.valor}`);
      });
    }

    return;
  }

  console.log("⚠️  Tabela não encontrada. Erro:", existingError.code);
  console.log("    Mensagem:", existingError.message);
  console.log("\n📝 SQL para criar a tabela:");
  console.log("====================================");

  const sql = `
-- Criar tabela de solicitações de renovação
CREATE TABLE IF NOT EXISTS solicitacoes_renovacao (
  id TEXT PRIMARY KEY DEFAULT ('sol_' || substr(md5(random()::text), 1, 16)),
  operador_id TEXT NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_solicitados INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  mensagem_admin TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  admin_responsavel_id TEXT REFERENCES operadores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes_renovacao(data_solicitacao DESC);

-- RLS
ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios podem ver suas solicitacoes"
  ON solicitacoes_renovacao FOR SELECT
  USING (
    operador_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.id = solicitacoes_renovacao.operador_id
    )
  );

CREATE POLICY "Admins podem ver todas solicitacoes"
  ON solicitacoes_renovacao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

CREATE POLICY "Usuarios podem criar solicitacoes"
  ON solicitacoes_renovacao FOR INSERT
  WITH CHECK (
    operador_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.id = operador_id
    )
  );

CREATE POLICY "Admins podem atualizar solicitacoes"
  ON solicitacoes_renovacao FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE operadores.auth_user_id = auth.uid()
      AND operadores.is_admin = true
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_solicitacoes_renovacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER solicitacoes_renovacao_updated_at
  BEFORE UPDATE ON solicitacoes_renovacao
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_renovacao_updated_at();
`;

  console.log(sql);
  console.log("====================================\n");

  console.log("📌 INSTRUÇÕES:");
  console.log("1. Acesse o Supabase Dashboard");
  console.log("2. Vá em 'SQL Editor'");
  console.log("3. Cole o SQL acima e execute");
  console.log("4. Execute este script novamente para verificar\n");
}

setup().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
