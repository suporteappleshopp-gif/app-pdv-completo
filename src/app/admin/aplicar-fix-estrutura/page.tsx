"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Database, Play, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AplicarFixEstrutura() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const sqlMigracao = `-- FIX URGENTE: Adicionar coluna status em solicitacoes_renovacao
ALTER TABLE solicitacoes_renovacao
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado'));

-- Adicionar colunas na tabela operadores
ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
  ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_status ON historico_pagamentos(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_operadores_aguardando ON operadores(aguardando_pagamento) WHERE aguardando_pagamento = true;`;

  const aplicarFix = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const { supabase } = await import("@/lib/supabase");

      console.log("🔄 Aplicando correções na estrutura do banco...");

      // Executar cada ALTER separadamente
      const alterStatements = [
        "ALTER TABLE solicitacoes_renovacao ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'",
        "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS forma_pagamento TEXT",
        "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2)",
        "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP",
        "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER",
        "ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP",
      ];

      const indexStatements = [
        "CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status)",
        "CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id ON solicitacoes_renovacao(operador_id)",
        "CREATE INDEX IF NOT EXISTS idx_historico_usuario_status ON historico_pagamentos(usuario_id, status)",
      ];

      const resultados = [];

      // Executar ALTER TABLEs
      for (const sql of alterStatements) {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
          resultados.push({ sql: sql.substring(0, 60) + "...", status: "erro", message: error.message });
        } else {
          resultados.push({ sql: sql.substring(0, 60) + "...", status: "ok" });
        }
      }

      // Executar CREATE INDEXes
      for (const sql of indexStatements) {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
          resultados.push({ sql: sql.substring(0, 60) + "...", status: "erro", message: error.message });
        } else {
          resultados.push({ sql: sql.substring(0, 60) + "...", status: "ok" });
        }
      }

      const sucessos = resultados.filter(r => r.status === "ok").length;
      const erros = resultados.filter(r => r.status === "erro").length;

      setResultado({
        success: erros === 0,
        message: `Execução concluída: ${sucessos} OK, ${erros} erros`,
        detalhes: resultados
      });

    } catch (error: any) {
      setResultado({
        success: false,
        error: error.message || "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarSQL = () => {
    navigator.clipboard.writeText(sqlMigracao);
    alert("SQL copiado para a área de transferência!\n\nExecute no SQL Editor do Supabase Dashboard.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Corrigir Estrutura do Banco de Dados
            </h1>
          </div>
          <p className="text-gray-700 text-sm">
            Esta migração adiciona colunas necessárias na tabela <code className="bg-white px-2 py-1 rounded">operadores</code> e cria índices para melhorar a performance.
          </p>
        </div>

        {/* Método Automático */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Método 1: Aplicação Automática</span>
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Tenta aplicar as alterações automaticamente usando o Supabase Client.
          </p>

          <button
            onClick={aplicarFix}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>{loading ? "Aplicando..." : "Aplicar Correções"}</span>
          </button>

          {resultado && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                resultado.success
                  ? "bg-green-50 border-green-400"
                  : "bg-red-50 border-red-400"
              }`}
            >
              {resultado.success ? (
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">{resultado.message}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 text-red-700 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Erro: {resultado.error}</span>
                  </div>
                  {resultado.detalhes && (
                    <div className="mt-2 text-xs text-gray-600">
                      {resultado.detalhes.map((d: any, i: number) => (
                        <div key={i} className="mb-1">
                          <span className={d.status === "ok" ? "text-green-600" : "text-red-600"}>
                            {d.status === "ok" ? "✅" : "❌"}
                          </span>{" "}
                          {d.sql}
                          {d.message && <div className="ml-6 text-red-600">{d.message}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Método Manual */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Copy className="w-5 h-5" />
            <span>Método 2: Execução Manual no Supabase Dashboard</span>
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Se o método automático falhar, copie o SQL abaixo e execute manualmente no SQL Editor do Supabase Dashboard.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
            <pre className="text-green-400 text-xs font-mono whitespace-pre">
              {sqlMigracao}
            </pre>
          </div>

          <button
            onClick={copiarSQL}
            className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center space-x-2"
          >
            <Copy className="w-5 h-5" />
            <span>Copiar SQL</span>
          </button>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Passos:</strong>
            </p>
            <ol className="text-sm text-blue-700 list-decimal ml-6 mt-2 space-y-1">
              <li>Copie o SQL acima</li>
              <li>Abra o Supabase Dashboard (supabase.com)</li>
              <li>Vá em SQL Editor</li>
              <li>Cole o SQL e clique em "Run"</li>
            </ol>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className="mt-6">
          <button
            onClick={() => router.push("/admin")}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Voltar para Admin
          </button>
        </div>
      </div>
    </div>
  );
}
