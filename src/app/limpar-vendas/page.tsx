"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trash2, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

export default function LimparVendasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const limparTodasVendas = async () => {
    if (!confirm("⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!\n\nDeseja realmente DELETAR TODAS AS VENDAS de TODOS os usuários?\n\nClique em OK para confirmar.")) {
      return;
    }

    if (!confirm("⚠️ ÚLTIMA CONFIRMAÇÃO!\n\nTodas as vendas e itens de venda serão PERMANENTEMENTE deletados.\n\nTem certeza absoluta?")) {
      return;
    }

    try {
      setLoading(true);
      setErro("");
      setMensagem("");

      console.log("🗑️ Deletando todos os itens de venda...");
      const { error: errorItens } = await supabase
        .from("itens_venda")
        .delete()
        .neq("id", "");

      if (errorItens) {
        console.error("❌ Erro ao deletar itens de venda:", errorItens);
        setErro(`Erro ao deletar itens de venda: ${errorItens.message}`);
        return;
      }

      console.log("✅ Itens de venda deletados com sucesso!");

      console.log("🗑️ Deletando todas as vendas...");
      const { error: errorVendas } = await supabase
        .from("vendas")
        .delete()
        .neq("id", "");

      if (errorVendas) {
        console.error("❌ Erro ao deletar vendas:", errorVendas);
        setErro(`Erro ao deletar vendas: ${errorVendas.message}`);
        return;
      }

      console.log("✅ Vendas deletadas com sucesso!");
      setMensagem("✅ Todas as vendas foram deletadas com sucesso! Sistema pronto para uso.");

      setTimeout(() => {
        router.push("/admin");
      }, 3000);
    } catch (err: any) {
      console.error("❌ Erro crítico:", err);
      setErro(`Erro crítico: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Trash2 className="w-8 h-8 mr-3 text-red-500" />
            Limpar Todas as Vendas
          </h1>
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-red-300 font-bold text-xl mb-2">⚠️ ATENÇÃO - AÇÃO IRREVERSÍVEL</h2>
              <p className="text-red-200 text-sm mb-2">
                Esta ação irá <strong>DELETAR PERMANENTEMENTE</strong>:
              </p>
              <ul className="text-red-200 text-sm list-disc list-inside space-y-1">
                <li>Todas as vendas de TODOS os usuários</li>
                <li>Todos os itens de venda associados</li>
                <li>Todo o histórico de vendas do sistema</li>
              </ul>
              <p className="text-red-200 text-sm mt-3 font-bold">
                ⚠️ NÃO HÁ COMO DESFAZER ESTA AÇÃO!
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{erro}</p>
          </div>
        )}

        {mensagem && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300">{mensagem}</p>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-6 mb-6">
          <h3 className="text-white font-bold mb-3">O que será feito:</h3>
          <ul className="text-purple-200 text-sm space-y-2">
            <li>✓ Deletar todos os registros da tabela <code className="bg-white/10 px-2 py-1 rounded">itens_venda</code></li>
            <li>✓ Deletar todos os registros da tabela <code className="bg-white/10 px-2 py-1 rounded">vendas</code></li>
            <li>✓ Sistema ficará zerado e pronto para uso</li>
          </ul>
        </div>

        <button
          onClick={limparTodasVendas}
          disabled={loading}
          className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        >
          {loading ? (
            <>
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Deletando...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-6 h-6" />
              <span>Deletar Todas as Vendas</span>
            </>
          )}
        </button>

        <p className="text-purple-300 text-xs text-center mt-4">
          Após clicar, você será redirecionado para o painel admin automaticamente.
        </p>
      </div>
    </div>
  );
}
