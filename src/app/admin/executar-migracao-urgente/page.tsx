"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Database, Play } from "lucide-react";

export default function ExecutarMigracaoUrgente() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const sqlMigracao = `-- Adicionar colunas do MercadoPago
ALTER TABLE public.solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_preference_id
ON public.solicitacoes_renovacao(mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON public.solicitacoes_renovacao(mercadopago_payment_id);

-- Adicionar comentários
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_preference_id IS 'ID da preferência de pagamento criada no MercadoPago';
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_payment_id IS 'ID do pagamento confirmado pelo MercadoPago (preenchido pelo webhook)';`;

  const verificarColunas = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch("/api/apply-migration-mercadopago");
      const data = await response.json();
      setResultado(data);
    } catch (error: any) {
      setResultado({
        success: false,
        error: error.message || "Erro ao verificar colunas",
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarSQL = () => {
    navigator.clipboard.writeText(sqlMigracao);
    alert("SQL copiado para a área de transferência!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-white">
              Migração Urgente - Corrigir Erro HTTP 500
            </h1>
          </div>
          <p className="text-white/80 text-sm">
            A tabela <code className="bg-black/30 px-2 py-1 rounded">solicitacoes_renovacao</code> não possui as colunas necessárias para armazenar os IDs do MercadoPago, causando erro ao gerar links de pagamento.
          </p>
        </div>

        {/* Verificação automática */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>1. Verificação Automática</span>
          </h2>

          <button
            onClick={verificarColunas}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>{loading ? "Verificando..." : "Verificar Status do Banco"}</span>
          </button>

          {resultado && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                resultado.success
                  ? "bg-green-500/20 border border-green-500"
                  : "bg-red-500/20 border border-red-500"
              }`}
            >
              {resultado.success ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">{resultado.message}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 text-red-400 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Erro: {resultado.error}</span>
                  </div>
                  {resultado.details && (
                    <p className="text-white/70 text-sm mt-2">{resultado.details}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instruções manuais */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">
            2. Executar Migração Manualmente
          </h2>

          <div className="space-y-4 mb-6">
            <div className="text-white/80 text-sm space-y-2">
              <p className="font-semibold">Siga os passos abaixo:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase Dashboard</a></li>
                <li>Selecione o projeto <code className="bg-black/30 px-1 py-0.5 rounded text-xs">ynkuovfplntzckecruvk</code></li>
                <li>Vá em <strong>SQL Editor</strong> no menu lateral</li>
                <li>Clique no botão abaixo para copiar o SQL</li>
                <li>Cole o SQL no editor e clique em <strong>Run</strong> (ou Ctrl+Enter)</li>
                <li>Aguarde a confirmação "Success"</li>
                <li>Recarregue esta página e clique em "Verificar Status" novamente</li>
              </ol>
            </div>
          </div>

          <button
            onClick={copiarSQL}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-bold transition-all mb-4"
          >
            📋 Copiar SQL para a Área de Transferência
          </button>

          <div className="bg-black/40 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {sqlMigracao}
            </pre>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-white/70 text-sm">
            💡 <strong>Dica:</strong> Após executar a migração com sucesso, os links de pagamento funcionarão normalmente. O erro HTTP 500 será corrigido automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
