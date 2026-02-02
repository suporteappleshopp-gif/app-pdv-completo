"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowLeft, ExternalLink } from "lucide-react";

export default function PagamentoPage() {
  const router = useRouter();
  const [operadorNome, setOperadorNome] = useState("");

  const WHATSAPP_CONTATO = "5565981032239";

  // Links diretos do Mercado Pago
  const LINK_PIX = "https://mpago.la/2FaXoGm";
  const LINK_CARTAO = "https://mpago.la/1fAKQyc";

  useEffect(() => {
    const nome = localStorage.getItem("operadorNome") || "Usuário";
    setOperadorNome(nome);
  }, []);

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
  };

  const voltarParaCaixa = () => {
    router.push("/caixa");
  };

  const abrirLinkPagamento = (tipo: "pix" | "cartao") => {
    const link = tipo === "pix" ? LINK_PIX : LINK_CARTAO;
    window.open(link, "_blank");
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

        {/* Opções de Pagamento */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Escolha sua forma de pagamento:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PIX */}
            <button
              onClick={() => abrirLinkPagamento("pix")}
              className="p-6 rounded-lg border-2 border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-500 transition-all shadow-lg"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PIX</span>
                </div>
                <span className="text-sm font-medium text-gray-700">PIX</span>
                <span className="text-2xl font-bold text-blue-600">R$ 59,90</span>
                <span className="text-xs text-gray-500">por mês</span>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </div>
            </button>

            {/* Cartão */}
            <button
              onClick={() => abrirLinkPagamento("cartao")}
              className="p-6 rounded-lg border-2 border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-500 transition-all shadow-lg"
            >
              <div className="flex flex-col items-center space-y-3">
                <CreditCard className="w-12 h-12 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Cartão de Crédito</span>
                <span className="text-2xl font-bold text-blue-600">R$ 149,70</span>
                <span className="text-xs text-gray-500">100 dias</span>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </div>
            </button>
          </div>
        </div>

        {/* Aviso Importante */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-2">Como funciona:</p>
            <p className="mb-2">1️⃣ Clique na opção de pagamento desejada</p>
            <p className="mb-2">2️⃣ Você será redirecionado para o Mercado Pago</p>
            <p className="mb-2">3️⃣ Complete o pagamento de forma segura</p>
            <p>4️⃣ Entre em contato pelo WhatsApp para ativar sua conta</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/extrato-pagamentos")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>Ver Extrato de Pagamentos</span>
          </button>

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
