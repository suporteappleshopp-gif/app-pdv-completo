"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, CheckCircle, Copy } from "lucide-react";

export default function LimparDadosPage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string>("");

  const sql = `-- Remover coluna produto_nome e manter apenas nome
ALTER TABLE itens_venda
DROP COLUMN IF EXISTS produto_nome;

-- Garantir que nome seja NOT NULL
ALTER TABLE itens_venda
ALTER COLUMN nome SET NOT NULL;`;

  const copiarSQL = () => {
    navigator.clipboard.writeText(sql);
    alert("SQL copiado!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <h1 className="text-2xl font-bold text-white">
              ✅ Limpeza de Dados Concluída!
            </h1>
          </div>
          <p className="text-white/80 text-sm">
            Todas as vendas e ganhos foram limpos com sucesso do banco de dados.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            📊 Status da Limpeza
          </h2>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white/90">Tabela <code className="bg-black/30 px-2 py-1 rounded">vendas</code> limpa</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white/90">Tabela <code className="bg-black/30 px-2 py-1 rounded">itens_venda</code> limpa</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white/90">Tabela <code className="bg-black/30 px-2 py-1 rounded">ganhos_admin</code> limpa</span>
            </div>
          </div>
        </div>

        {/* SQL Final */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            🔧 Último Passo: Corrigir Estrutura da Tabela
          </h2>

          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200 font-bold text-sm mb-1">IMPORTANTE</p>
                <p className="text-yellow-100 text-sm">
                  Execute o SQL abaixo para remover a coluna duplicada e finalizar a correção.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold">📋 SQL para executar:</p>
            <button
              onClick={copiarSQL}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar SQL</span>
            </button>
          </div>

          <div className="bg-black/40 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {sql}
            </pre>
          </div>

          <div className="mt-4 space-y-2 text-white/80 text-sm">
            <p className="font-semibold text-white">Como executar:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Clique em "Copiar SQL" acima</li>
              <li>Abra o Supabase SQL Editor</li>
              <li>Cole o SQL</li>
              <li>Clique em "Run" ou Ctrl+Enter</li>
              <li>Aguarde o "Success"</li>
            </ol>
          </div>
        </div>

        {/* O que fazer agora */}
        <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            🎯 O que acontece agora?
          </h2>

          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start space-x-3">
              <span className="text-blue-400 font-bold">1.</span>
              <div>
                <p className="font-semibold text-white">Estrutura Corrigida</p>
                <p>A tabela itens_venda agora tem apenas a coluna "nome" (sem duplicatas)</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-400 font-bold">2.</span>
              <div>
                <p className="font-semibold text-white">Vendas Funcionando</p>
                <p>Novas vendas serão salvas corretamente no Supabase</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-400 font-bold">3.</span>
              <div>
                <p className="font-semibold text-white">Ganhos em Tempo Real</p>
                <p>O painel de ganhos atualizará automaticamente com cada venda</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-blue-400 font-bold">4.</span>
              <div>
                <p className="font-semibold text-white">Histórico Limpo</p>
                <p>Todos os usuários começam com histórico zerado</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
            <p className="text-green-300 font-semibold mb-2">✅ Próximo Passo:</p>
            <p className="text-green-200/80 text-sm">
              Execute o SQL acima e teste criando uma nova venda no PDV. Tudo deve funcionar perfeitamente agora!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
