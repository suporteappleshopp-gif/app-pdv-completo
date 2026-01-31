"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Copy, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";

export default function PagamentoPage() {
  const router = useRouter();
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix");
  const [pixCopiado, setPixCopiado] = useState(false);
  const [operadorNome, setOperadorNome] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [carregandoPagamento, setCarregandoPagamento] = useState(false);
  const [linkPagamento, setLinkPagamento] = useState("");

  const WHATSAPP_CONTATO = "5565981032239";

  useEffect(() => {
    const nome = localStorage.getItem("operadorNome") || "Usuário";
    const id = localStorage.getItem("operadorId") || "";
    setOperadorNome(nome);
    setOperadorId(id);
  }, []);

  const gerarLinkPagamento = async (tipo: "pix" | "cartao") => {
    if (!operadorId) {
      alert("Erro: Usuário não identificado. Por favor, faça login novamente.");
      router.push("/");
      return;
    }

    setCarregandoPagamento(true);

    try {
      const response = await fetch("/api/create-payment-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: operadorId,
          forma_pagamento: tipo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar link de pagamento");
      }

      // Abrir link de pagamento
      window.open(data.init_point, "_blank");
      setLinkPagamento(data.init_point);
    } catch (error: any) {
      console.error("Erro ao gerar link:", error);
      alert("Erro ao gerar link de pagamento. Tente novamente ou entre em contato pelo WhatsApp.");
    } finally {
      setCarregandoPagamento(false);
    }
  };

  const abrirPagamentoPix = () => gerarLinkPagamento("pix");
  const abrirPagamentoCartao = () => gerarLinkPagamento("cartao");

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
  };

  const voltarParaCaixa = () => {
    router.push("/caixa");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pagamento de Mensalidade</h1>
          <p className="text-gray-600">Olá, {operadorNome}! Escolha sua forma de pagamento</p>
        </div>

        {/* Seleção de Forma de Pagamento */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Escolha sua forma de pagamento:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setFormaPagamento("pix")}
              className={`p-4 rounded-lg border-2 transition-all ${
                formaPagamento === "pix"
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PIX</span>
                </div>
                <span className="text-sm font-medium text-gray-700">PIX</span>
                <span className="text-2xl font-bold text-blue-600">R$ 59,90</span>
                <span className="text-xs text-gray-500">por mês</span>
              </div>
            </button>
            
            <button
              onClick={() => setFormaPagamento("cartao")}
              className={`p-4 rounded-lg border-2 transition-all ${
                formaPagamento === "cartao"
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <CreditCard className="w-12 h-12 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Cartão de Crédito</span>
                <span className="text-2xl font-bold text-blue-600">R$ 49,90</span>
                <span className="text-xs text-gray-500">por mês</span>
              </div>
            </button>
          </div>
        </div>

        {/* Detalhes do Pagamento PIX */}
        {formaPagamento === "pix" && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">PIX</span>
              </div>
              <span>Pagamento via PIX - R$ 59,90 (60 dias)</span>
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para gerar seu link de pagamento personalizado via PIX.
            </p>

            <button
              onClick={abrirPagamentoPix}
              disabled={carregandoPagamento}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregandoPagamento ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando link...</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">PIX</span>
                  </div>
                  <span>Pagar com PIX</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Rápido e fácil:</strong> O pagamento via PIX é aprovado instantaneamente e sua conta será ativada automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* Detalhes do Pagamento Cartão */}
        {formaPagamento === "cartao" && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <span>Pagamento via Cartão - R$ 149,70 (180 dias - 6 meses)</span>
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para gerar seu link de pagamento personalizado via Cartão de Crédito.
            </p>

            <button
              onClick={abrirPagamentoCartao}
              disabled={carregandoPagamento}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregandoPagamento ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando link...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Pagar com Cartão de Crédito</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Parcele em até 3x:</strong> Você será redirecionado para o ambiente seguro do Mercado Pago para finalizar o pagamento.
              </p>
            </div>
          </div>
        )}

        {/* Aviso Importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Importante:</p>
              <p>Sua conta será ativada automaticamente após a confirmação do pagamento. Isso pode levar alguns minutos.</p>
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">✨ O que você ganha:</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Acesso completo ao sistema PDV</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Gestão de vendas e estoque</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Relatórios e análises</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Suporte técnico incluído</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <button
            onClick={abrirWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Contato WhatsApp - Suporte</span>
          </button>

          <button
            onClick={voltarParaCaixa}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para o Sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
}
