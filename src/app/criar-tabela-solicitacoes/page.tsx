"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CriarTabelaSolicitacoes() {
  const router = useRouter();
  const [resultado, setResultado] = useState("");
  const [loading, setLoading] = useState(false);

  const criarTabela = async () => {
    setLoading(true);
    setResultado("Criando tabela...\n");

    try {
      const { supabase } = await import("@/lib/supabase");

      // Tentar criar a tabela usando INSERT para testar
      setResultado((prev) => prev + "✓ Cliente Supabase conectado\n");

      // Verificar se tabela existe
      const { data: check1, error: checkError } = await supabase
        .from("solicitacoes_renovacao")
        .select("*")
        .limit(1);

      if (!checkError) {
        setResultado((prev) => prev + "✅ Tabela já existe!\n");
        setResultado((prev) => prev + `📋 Registros: ${check1?.length || 0}\n`);
      } else {
        setResultado((prev) => prev + "❌ Tabela não existe. Código: " + checkError.code + "\n");
        setResultado((prev) => prev + "Mensagem: " + checkError.message + "\n\n");

        setResultado((prev) => prev + "⚠️ A tabela precisa ser criada no Supabase Dashboard.\n\n");
        setResultado((prev) => prev + "Acesse: SQL Editor no Supabase e execute:\n\n");
        setResultado((prev) => prev + `CREATE TABLE IF NOT EXISTS solicitacoes_renovacao (
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

CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes_renovacao(data_solicitacao DESC);

ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

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
`);
      }

    } catch (error: any) {
      setResultado((prev) => prev + "❌ Erro: " + error.message + "\n");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={() => router.push("/caixa")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>

          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Criar Tabela Solicitações de Renovação
          </h1>

          <button
            onClick={criarTabela}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 mb-4"
          >
            {loading ? "Verificando..." : "Verificar/Criar Tabela"}
          </button>

          {resultado && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
              {resultado}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
