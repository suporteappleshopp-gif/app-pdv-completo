"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Venda } from "@/lib/types";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  imprimirCupomFiscal,
  imprimirNFCe,
  imprimirNotaFiscalCompleta,
} from "@/lib/impressao";

export default function ImprimirNotaPage() {
  const params = useParams();
  const router = useRouter();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarVenda();
  }, [params.id]);

  const carregarVenda = async () => {
    try {
      setLoading(true);
      const vendaId = params.id as string;

      // Buscar venda no Supabase
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", vendaId)
        .single();

      if (error || !data) {
        setErro("Venda não encontrada");
        return;
      }

      // Buscar itens da venda
      const { data: itens, error: erroItens } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", vendaId);

      if (erroItens) {
        setErro("Erro ao carregar itens da venda");
        return;
      }

      // Montar objeto Venda
      const vendaCompleta: Venda = {
        id: data.id,
        numero: data.numero,
        operadorId: data.operador_id,
        operadorNome: data.operador_nome,
        total: data.total,
        dataHora: new Date(data.data_hora),
        tipoPagamento: data.tipo_pagamento,
        status: data.status,
        motivoCancelamento: data.motivo_cancelamento,
        itens: itens.map((item) => ({
          produtoId: item.produto_id,
          nome: item.nome,
          quantidade: item.quantidade,
          precoUnitario: item.preco_unitario,
          subtotal: item.subtotal,
        })),
      };

      setVenda(vendaCompleta);
    } catch (err) {
      console.error("Erro ao carregar venda:", err);
      setErro("Erro ao carregar venda");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando nota...</p>
        </div>
      </div>
    );
  }

  if (erro || !venda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Erro</h1>
          <p className="text-purple-200 mb-6">{erro || "Nota não encontrada"}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Nota Fiscal - Venda #{venda.numero}
                </h1>
                <p className="text-purple-200 text-sm">
                  {format(venda.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => imprimirCupomFiscal(venda)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all"
                title="Imprimir Cupom Fiscal"
              >
                <Printer className="w-5 h-5" />
                <span className="font-semibold">Cupom</span>
              </button>

              <button
                onClick={() => imprimirNFCe(venda)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                title="Imprimir NFC-e"
              >
                <Printer className="w-5 h-5" />
                <span className="font-semibold">NFC-e</span>
              </button>

              <button
                onClick={() => imprimirNotaFiscalCompleta(venda)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
                title="Imprimir Nota Fiscal Completa"
              >
                <Printer className="w-5 h-5" />
                <span className="font-semibold">Nota Completa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detalhes da Venda */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-purple-200 text-sm mb-1">Operador</p>
              <p className="text-white font-semibold text-lg">{venda.operadorNome}</p>
            </div>
            <div>
              <p className="text-purple-200 text-sm mb-1">Forma de Pagamento</p>
              <p className="text-white font-semibold text-lg">
                {venda.tipoPagamento === "dinheiro" ? "Dinheiro" :
                 venda.tipoPagamento === "credito" ? "Crédito" :
                 venda.tipoPagamento === "debito" ? "Débito" :
                 venda.tipoPagamento === "pix" ? "PIX" :
                 venda.tipoPagamento === "outros" ? "Outros" :
                 "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-purple-200 text-sm mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                venda.status === "concluida" ? "bg-green-500/20 text-green-300" :
                venda.status === "cancelada" ? "bg-red-500/20 text-red-300" :
                "bg-blue-500/20 text-blue-300"
              }`}>
                {venda.status || "concluída"}
              </span>
            </div>
            <div>
              <p className="text-purple-200 text-sm mb-1">Total</p>
              <p className="text-white font-bold text-2xl">R$ {venda.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Itens */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-white font-bold text-lg mb-4">Itens da Venda</h3>
            <div className="space-y-3">
              {venda.itens.map((item, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">{item.nome}</p>
                    <p className="text-purple-200 text-sm">
                      {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-white font-bold text-lg">
                    R$ {item.subtotal.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {venda.motivoCancelamento && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 text-sm">
                <strong>Motivo do Cancelamento:</strong> {venda.motivoCancelamento}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
