"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiagnosticoVendasUsuario() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<string>("");
  const [operadorId, setOperadorId] = useState<string>("");
  const [operadorNome, setOperadorNome] = useState<string>("");

  useEffect(() => {
    executarDiagnostico();
  }, []);

  const executarDiagnostico = async () => {
    try {
      setLoading(true);
      let log = "🔍 DIAGNÓSTICO DE VENDAS DO USUÁRIO\n";
      log += "=" + "=".repeat(50) + "\n\n";

      // Buscar operador logado
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        log += "❌ ERRO: Operador não encontrado. Faça login novamente.\n";
        setResultado(log);
        setLoading(false);
        return;
      }

      if (operador.isAdmin) {
        log += "❌ ERRO: Este diagnóstico é apenas para usuários comuns.\n";
        log += "👉 Admins devem usar o painel administrativo.\n";
        setResultado(log);
        setLoading(false);
        return;
      }

      setOperadorId(operador.id);
      setOperadorNome(operador.nome);

      log += `✅ Operador: ${operador.nome} (${operador.email})\n`;
      log += `🆔 ID: ${operador.id}\n\n`;

      // Buscar vendas do Supabase
      const { supabase } = await import("@/lib/supabase");

      log += "📊 VENDAS NO SUPABASE\n";
      log += "-".repeat(50) + "\n";

      const { data: vendas, error: errorVendas } = await supabase
        .from("vendas")
        .select("*")
        .eq("operador_id", operador.id)
        .order("created_at", { ascending: false });

      if (errorVendas) {
        log += `❌ ERRO ao buscar vendas: ${errorVendas.message}\n`;
      } else {
        log += `📦 Total de vendas encontradas: ${vendas?.length || 0}\n\n`;

        if (vendas && vendas.length > 0) {
          const totalGanhos = vendas
            .filter((v) => v.status !== "cancelada")
            .reduce((sum, v) => sum + parseFloat(v.total.toString()), 0);

          log += `💰 TOTAL DE GANHOS: R$ ${totalGanhos.toFixed(2)}\n\n`;

          log += "📋 DETALHES DAS VENDAS:\n";
          log += "-".repeat(50) + "\n";

          for (const venda of vendas.slice(0, 10)) {
            log += `\n🛒 Venda #${venda.numero || "SEM NÚMERO"}\n`;
            log += `   ID: ${venda.id}\n`;
            log += `   Total: R$ ${parseFloat(venda.total.toString()).toFixed(2)}\n`;
            log += `   Status: ${venda.status}\n`;
            log += `   Data: ${new Date(venda.created_at).toLocaleString("pt-BR")}\n`;
            log += `   Forma Pgto: ${venda.forma_pagamento || "não informado"}\n`;

            // Buscar itens da venda
            const { data: itens, error: errorItens } = await supabase
              .from("itens_venda")
              .select("*")
              .eq("venda_id", venda.id);

            if (errorItens) {
              log += `   ⚠️ Erro ao buscar itens: ${errorItens.message}\n`;
            } else if (itens && itens.length > 0) {
              log += `   Itens (${itens.length}):\n`;
              for (const item of itens) {
                log += `      • ${item.nome} - ${item.quantidade}x R$ ${parseFloat(item.preco_unitario.toString()).toFixed(2)} = R$ ${parseFloat(item.subtotal.toString()).toFixed(2)}\n`;
              }
            } else {
              log += `   ⚠️ Nenhum item encontrado\n`;
            }
          }

          if (vendas.length > 10) {
            log += `\n... e mais ${vendas.length - 10} vendas\n`;
          }
        } else {
          log += "❌ NENHUMA VENDA ENCONTRADA!\n";
          log += "\n🔍 Possíveis causas:\n";
          log += "   1. Você ainda não realizou nenhuma venda\n";
          log += "   2. As vendas não foram sincronizadas corretamente\n";
          log += "   3. As vendas foram limpas por alguma migração anterior\n";
        }
      }

      log += "\n\n✅ Diagnóstico concluído!\n";
      log += "\n💡 Se você realizou vendas mas elas não aparecem aqui:\n";
      log += "   • Vá ao caixa e faça uma nova venda de teste\n";
      log += "   • Volte aqui e verifique se a venda foi registrada\n";

      setResultado(log);
    } catch (error: any) {
      setResultado(
        `❌ ERRO CRÍTICO:\n\n${error.message || "Erro desconhecido"}\n\n${error.stack || ""}`
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Executando diagnóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
          <div className="bg-blue-600 px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold text-white">
              🔍 Diagnóstico de Vendas do Usuário
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Verificando vendas e ganhos no Supabase
            </p>
          </div>

          <div className="p-6">
            <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                {resultado}
              </pre>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/caixa")}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
              >
                ← Voltar ao Caixa
              </button>
              <button
                onClick={executarDiagnostico}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold"
              >
                🔄 Executar Novamente
              </button>
              <button
                onClick={() => router.push("/financeiro")}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-semibold"
              >
                💰 Ir para Financeiro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
