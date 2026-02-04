"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Copy, Database } from "lucide-react";

export default function CorrigirVendasPage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const verificarCorrecao = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch("/api/corrigir-itens-venda", {
        method: "POST",
      });
      const data = await response.json();
      setResultado(data);
    } catch (error: any) {
      setResultado({
        success: false,
        error: error.message || "Erro ao verificar",
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarSQL = () => {
    if (resultado?.sql) {
      navigator.clipboard.writeText(resultado.sql);
      alert("SQL copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h1 className="text-2xl font-bold text-white">
              Corrigir Erro: Coluna "nome" em itens_venda
            </h1>
          </div>
          <p className="text-white/80 text-sm">
            Erro: <code className="bg-black/30 px-2 py-1 rounded">Could not find the 'nome' column of 'itens_venda'</code>
          </p>
        </div>

        {/* Verificação */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>1. Verificar Status</span>
          </h2>

          <button
            onClick={verificarCorrecao}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
          >
            {loading ? "Verificando..." : "Verificar Tabela itens_venda"}
          </button>

          {resultado && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                resultado.success
                  ? "bg-green-500/20 border border-green-500"
                  : "bg-yellow-500/20 border border-yellow-500"
              }`}
            >
              {resultado.success ? (
                <div>
                  <div className="flex items-center space-x-2 text-green-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold">{resultado.message}</span>
                  </div>
                  {resultado.alreadyExists && (
                    <p className="text-green-300 text-sm">
                      ✅ A tabela está correta! Vendas devem funcionar normalmente agora.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 text-yellow-400 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold">Correção Necessária</span>
                  </div>
                  <p className="text-white/90 text-sm mb-3">{resultado.error}</p>

                  {resultado.needsManualFix && resultado.sql && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-semibold">📋 SQL para executar:</p>
                        <button
                          onClick={copiarSQL}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                          {resultado.sql}
                        </pre>
                      </div>

                      {resultado.instructions && (
                        <div className="mt-4">
                          <p className="text-white font-semibold mb-2">📖 Instruções:</p>
                          <ol className="list-decimal list-inside space-y-1 text-white/80 text-sm">
                            {resultado.instructions.map((instruction: string, index: number) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instruções Detalhadas */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">
            📖 Como Corrigir
          </h2>

          <div className="space-y-4 text-white/80 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">Passo 1: Abra o SQL Editor</p>
              <p>No Supabase Dashboard, vá em: <strong>SQL Editor</strong></p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Passo 2: Execute o SQL</p>
              <p>Clique em <strong>"Copiar"</strong> acima e cole no SQL Editor</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Passo 3: Aguarde Sucesso</p>
              <p>Você verá a mensagem "Success" após executar</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">Passo 4: Teste no App</p>
              <p>Crie uma nova venda no PDV - o erro não deve mais aparecer</p>
            </div>
          </div>

          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
            <p className="text-green-300 font-semibold mb-2">✅ O que esta correção faz:</p>
            <ul className="list-disc list-inside space-y-1 text-green-200/80 text-sm">
              <li>Adiciona a coluna "nome" na tabela itens_venda</li>
              <li>Permite armazenar o nome do produto em cada item de venda</li>
              <li>Corrige o erro de sincronização das vendas com o Supabase</li>
              <li>Possibilita a análise de ganhos funcionar corretamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
