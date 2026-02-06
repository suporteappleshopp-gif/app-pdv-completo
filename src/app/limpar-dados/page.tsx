"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LimparDadosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    detalhes: string[];
  } | null>(null);

  const limparDados = async () => {
    setLoading(true);
    setResultado(null);
    const detalhes: string[] = [];

    try {
      console.log("🧹 Iniciando limpeza de dados...");

      // 1. Limpar itens de venda
      console.log("🗑️ Limpando itens de venda...");
      const { error: errorItens } = await supabase
        .from("itens_venda")
        .delete()
        .neq("id", ""); // Delete all

      if (errorItens) {
        console.error("Erro ao limpar itens_venda:", errorItens);
        detalhes.push(`❌ Erro ao limpar itens de venda: ${errorItens.message}`);
      } else {
        console.log("✅ Itens de venda limpos");
        detalhes.push("✅ Itens de venda limpos");
      }

      // 2. Limpar vendas
      console.log("🗑️ Limpando vendas...");
      const { error: errorVendas } = await supabase
        .from("vendas")
        .delete()
        .neq("id", ""); // Delete all

      if (errorVendas) {
        console.error("Erro ao limpar vendas:", errorVendas);
        detalhes.push(`❌ Erro ao limpar vendas: ${errorVendas.message}`);
      } else {
        console.log("✅ Vendas limpas");
        detalhes.push("✅ Vendas limpas");
      }

      // 3. Resetar estoque de produtos para 0
      console.log("🗑️ Resetando estoque...");
      const { error: errorEstoque } = await supabase
        .from("produtos")
        .update({ estoque: 0 })
        .neq("id", ""); // Update all

      if (errorEstoque) {
        console.error("Erro ao resetar estoque:", errorEstoque);
        detalhes.push(`❌ Erro ao resetar estoque: ${errorEstoque.message}`);
      } else {
        console.log("✅ Estoque resetado para 0");
        detalhes.push("✅ Estoque resetado para 0");
      }

      // 4. Limpar ganhos do admin
      console.log("🗑️ Limpando ganhos do admin...");
      const { error: errorGanhos } = await supabase
        .from("ganhos_admin")
        .delete()
        .neq("id", ""); // Delete all

      if (errorGanhos) {
        console.error("Erro ao limpar ganhos_admin:", errorGanhos);
        detalhes.push(`⚠️ Ganhos do admin: ${errorGanhos.message}`);
      } else {
        console.log("✅ Ganhos do admin limpos");
        detalhes.push("✅ Ganhos do admin limpos");
      }

      // 5. Limpar pagamentos pendentes
      console.log("🗑️ Limpando pagamentos...");
      const { error: errorPagamentos } = await supabase
        .from("pagamentos")
        .delete()
        .neq("id", ""); // Delete all

      if (errorPagamentos) {
        console.error("Erro ao limpar pagamentos:", errorPagamentos);
        detalhes.push(`⚠️ Pagamentos: ${errorPagamentos.message}`);
      } else {
        console.log("✅ Pagamentos limpos");
        detalhes.push("✅ Pagamentos limpos");
      }

      console.log("🎉 Limpeza concluída!");

      setResultado({
        sucesso: true,
        mensagem: "Dados limpos com sucesso!",
        detalhes,
      });
    } catch (error: any) {
      console.error("❌ Erro crítico ao limpar dados:", error);

      setResultado({
        sucesso: false,
        mensagem: "Erro ao limpar dados",
        detalhes: [error.message || "Erro desconhecido"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Trash2 className="w-8 h-8" />
              <span>Limpar Dados</span>
            </h1>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Aviso */}
        <div className="bg-red-500/20 border border-red-500 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-300 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-red-100 mb-2">
                ⚠️ ATENÇÃO: Ação Irreversível
              </h3>
              <p className="text-red-200 mb-2">
                Esta ação vai limpar permanentemente:
              </p>
              <ul className="text-red-200 space-y-1 list-disc list-inside">
                <li>Todas as vendas de todos os usuários</li>
                <li>Todos os itens de venda</li>
                <li>Todo o estoque (resetado para 0)</li>
                <li>Todos os ganhos do administrador</li>
                <li>Todos os pagamentos pendentes</li>
              </ul>
              <p className="text-red-300 font-bold mt-3">
                ⚠️ Os dados NÃO podem ser recuperados!
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <button
            onClick={limparDados}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Limpando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-6 h-6" />
                <span>Limpar Todos os Dados</span>
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className={`backdrop-blur-md rounded-2xl shadow-2xl border p-8 ${
              resultado.sucesso
                ? "bg-green-500/20 border-green-500"
                : "bg-red-500/20 border-red-500"
            }`}
          >
            <div className="flex items-start space-x-3">
              {resultado.sucesso ? (
                <CheckCircle className="w-8 h-8 text-green-300 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-300 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`text-xl font-bold mb-4 ${
                    resultado.sucesso ? "text-green-100" : "text-red-100"
                  }`}
                >
                  {resultado.mensagem}
                </h3>

                <div className="space-y-2">
                  {resultado.detalhes.map((detalhe, idx) => (
                    <p
                      key={idx}
                      className={`text-sm ${
                        resultado.sucesso ? "text-green-200" : "text-red-200"
                      }`}
                    >
                      {detalhe}
                    </p>
                  ))}
                </div>

                {resultado.sucesso && (
                  <div className="mt-6 bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                    <p className="text-blue-200">
                      🎉 App pronto para começar do zero! Você pode voltar e
                      começar a usar normalmente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
