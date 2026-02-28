"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, ArrowLeft, X } from "lucide-react";

interface ItemVenda {
  produto_id: string;
  nome: string;
  codigo_barras?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

interface Venda {
  id: string;
  numero: number;
  operador_id: string;
  operador_nome: string;
  data_hora: string;
  total: number;
  status: string;
  tipo_pagamento?: string;
  valor_recebido?: number;
  troco?: number;
  itens_venda?: ItemVenda[];
}

export default function ImprimirNotaPage() {
  const router = useRouter();
  const params = useParams();
  const vendaId = params.id as string;

  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarVenda();
  }, [vendaId]);

  const carregarVenda = async () => {
    try {
      setLoading(true);
      console.log("🔍 Carregando venda para impressão:", vendaId);

      // Buscar venda no Supabase com itens
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          itens_venda (
            produto_id,
            nome,
            codigo_barras,
            quantidade,
            preco_unitario,
            subtotal
          )
        `)
        .eq("id", vendaId)
        .single();

      if (error) {
        console.error("❌ Erro ao carregar venda:", error);
        setErro("Venda não encontrada");
        return;
      }

      console.log("✅ Venda carregada:", data);
      setVenda(data);
    } catch (err) {
      console.error("Erro ao carregar venda:", err);
      setErro("Erro ao carregar dados da venda");
    } finally {
      setLoading(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando venda...</div>
      </div>
    );
  }

  if (erro || !venda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-3 mb-4">
            <X className="w-6 h-6 text-red-300" />
            <h2 className="text-xl font-bold text-red-300">Erro</h2>
          </div>
          <p className="text-red-200">{erro || "Venda não encontrada"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </div>
    );
  }

  const itens = venda.itens_venda || [];

  return (
    <>
      {/* Botões de ação - NÃO imprimir */}
      <div className="no-print fixed top-4 right-4 z-50 flex space-x-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <button
          onClick={imprimir}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir</span>
        </button>
      </div>

      {/* Conteúdo para impressão */}
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-3xl mx-auto">
          {/* Cabeçalho */}
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-3xl font-bold mb-2">CUPOM FISCAL</h1>
            <p className="text-lg">Venda #{venda.numero}</p>
            <p className="text-sm text-gray-600">
              {format(new Date(venda.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Informações da venda */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Operador:</p>
              <p>{venda.operador_nome}</p>
            </div>
            <div>
              <p className="font-semibold">Forma de Pagamento:</p>
              <p className="capitalize">{venda.tipo_pagamento || "Não informado"}</p>
            </div>
            {venda.valor_recebido && (
              <>
                <div>
                  <p className="font-semibold">Valor Recebido:</p>
                  <p>R$ {venda.valor_recebido.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold">Troco:</p>
                  <p>R$ {(venda.troco || 0).toFixed(2)}</p>
                </div>
              </>
            )}
          </div>

          {/* Tabela de itens */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-black pb-2">Itens da Venda</h2>
            <table className="w-full text-sm">
              <thead className="border-b-2 border-black">
                <tr>
                  <th className="text-left py-2">Produto</th>
                  <th className="text-center py-2">Qtd</th>
                  <th className="text-right py-2">Preço Unit.</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="py-2">
                      <div>
                        <p className="font-semibold">{item.nome}</p>
                        {item.codigo_barras && (
                          <p className="text-xs text-gray-600">Cód: {item.codigo_barras}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-2">{item.quantidade}x</td>
                    <td className="text-right py-2">R$ {item.preco_unitario.toFixed(2)}</td>
                    <td className="text-right py-2 font-semibold">
                      R$ {item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t-2 border-black pt-4 mb-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">TOTAL</h2>
              <p className="text-3xl font-bold">R$ {venda.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
            <p>Obrigado pela preferência!</p>
            <p className="mt-2">Sistema PDV - Lasy AI</p>
          </div>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
