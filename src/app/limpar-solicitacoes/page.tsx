"use client";

import { useState } from "react";
import { Trash2, CheckCircle } from "lucide-react";

export default function LimparSolicitacoes() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState("");

  const limparSolicitacoes = async () => {
    if (!confirm("Tem certeza que deseja limpar TODAS as solicitações de renovação?")) {
      return;
    }

    try {
      setLoading(true);
      setResultado("");
      const { supabase } = await import("@/lib/supabase");

      const { error, count } = await supabase
        .from("solicitacoes_renovacao")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.error("Erro ao limpar:", error);
        setResultado("❌ Erro ao limpar solicitações: " + error.message);
        return;
      }

      setResultado(`✅ Sucesso! Todas as solicitações foram removidas.`);
    } catch (err) {
      console.error("Erro:", err);
      setResultado("❌ Erro ao processar: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Limpar Solicitações de Renovação
          </h1>
          <p className="text-gray-600 text-sm">
            Esta ação removerá TODAS as solicitações de renovação do banco de dados.
          </p>
        </div>

        <button
          onClick={limparSolicitacoes}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Limpando...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-5 h-5" />
              <span>Limpar Todas as Solicitações</span>
            </>
          )}
        </button>

        {resultado && (
          <div className={`mt-4 p-4 rounded-lg ${
            resultado.includes("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            <p className="text-sm font-medium">{resultado}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Atenção:</strong> Esta é uma ferramenta de teste. Use com cuidado em produção.
          </p>
        </div>
      </div>
    </div>
  );
}
