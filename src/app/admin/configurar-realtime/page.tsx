"use client";

import { useState } from "react";
import { Zap, AlertCircle, CheckCircle, Database, ExternalLink } from "lucide-react";

export default function ConfigurarRealtimePage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const verificarRealtime = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch("/api/habilitar-realtime");
      const data = await response.json();
      setResultado(data);
    } catch (error: any) {
      setResultado({
        success: false,
        error: error.message || "Erro ao verificar Realtime",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <Zap className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">
              Configurar Realtime - Atualizações Automáticas
            </h1>
          </div>
          <p className="text-white/80 text-sm">
            Habilite o Realtime para que o histórico de vendas e painel de ganhos atualizem automaticamente sem precisar recarregar a página.
          </p>
        </div>

        {/* Status Atual */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Tabelas que precisam de Realtime:</span>
          </h2>

          <div className="space-y-2 mb-6">
            <div className="flex items-center space-x-3 text-white/80">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span><strong>vendas</strong> - Histórico de vendas dos usuários</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span><strong>itens_venda</strong> - Itens das vendas</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span><strong>ganhos_admin</strong> - Painel de ganhos do admin</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span><strong>produtos</strong> - Sincronização de estoque</span>
            </div>
          </div>

          <button
            onClick={verificarRealtime}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>{loading ? "Verificando..." : "Verificar / Tentar Habilitar"}</span>
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
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">{resultado.message}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Configuração Manual Necessária</span>
                  </div>
                  <p className="text-white/90 text-sm mb-3">{resultado.error}</p>

                  {resultado.instructions && (
                    <div className="mt-4">
                      <p className="text-white font-semibold mb-2">📋 Siga os passos:</p>
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

        {/* Instruções Manuais */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">
            📖 Como Habilitar Manualmente
          </h2>

          <div className="space-y-4 text-white/80 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">1. Acesse o Supabase Dashboard</p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span>https://supabase.com/dashboard</span>
              </a>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">2. Selecione seu projeto</p>
              <p className="text-white/60">Projeto: <code className="bg-black/30 px-2 py-1 rounded text-xs">ynkuovfplntzckecruvk</code></p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">3. Vá em Database → Replication</p>
              <p className="text-white/60">No menu lateral esquerdo</p>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">4. Na seção "supabase_realtime"</p>
              <p className="text-white/60 mb-2">Habilite as seguintes tabelas marcando o checkbox:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>vendas</li>
                <li>itens_venda</li>
                <li>ganhos_admin</li>
                <li>produtos</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">5. Clique em "Save"</p>
              <p className="text-white/60">As mudanças serão aplicadas imediatamente</p>
            </div>

            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-4">
              <p className="text-green-300 font-semibold mb-2">✅ Após habilitar:</p>
              <ul className="list-disc list-inside space-y-1 text-green-200/80 text-sm">
                <li>O histórico de vendas atualizará automaticamente quando houver nova venda</li>
                <li>O painel de ganhos mostrará novos ganhos em tempo real</li>
                <li>O estoque sincronizará entre dispositivos instantaneamente</li>
                <li>Não será mais necessário recarregar a página!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-white/70 text-sm">
            💡 <strong>Dica:</strong> Após habilitar o Realtime, as atualizações acontecerão em menos de 1 segundo automaticamente!
          </p>
        </div>
      </div>
    </div>
  );
}
