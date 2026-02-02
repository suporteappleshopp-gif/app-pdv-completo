"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Copy, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function PagamentoPage() {
  const router = useRouter();
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix");
  const [pixCopiado, setPixCopiado] = useState(false);
  const [operadorNome, setOperadorNome] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [carregandoPagamento, setCarregandoPagamento] = useState(false);
  const [linkPagamento, setLinkPagamento] = useState("");
  const [mp, setMp] = useState<any>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [installments, setInstallments] = useState(1);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [cardError, setCardError] = useState("");
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [mensagemVerificacao, setMensagemVerificacao] = useState("");
  const [pixQrCode, setPixQrCode] = useState("");
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pixPaymentId, setPixPaymentId] = useState("");
  const [pixExibido, setPixExibido] = useState(false);

  const WHATSAPP_CONTATO = "5565981032239";

  // Verificar pagamento pendente periodicamente
  useEffect(() => {
    const verificarPagamentoPendente = async () => {
      const pendingPayment = localStorage.getItem("pending_payment");
      if (!pendingPayment) return;

      try {
        const paymentData = JSON.parse(pendingPayment);
        const tempoDecorrido = Date.now() - new Date(paymentData.timestamp).getTime();

        // Limpar pagamento pendente após 4 minutos (240.000ms)
        if (tempoDecorrido > 4 * 60 * 1000) {
          localStorage.removeItem("pending_payment");
          setPixExibido(false);
          setPixQrCode("");
          setPixCopiaCola("");
          return;
        }

        setVerificandoPagamento(true);
        setMensagemVerificacao("Verificando status do pagamento...");

        const queryParams = paymentData.payment_id
          ? `usuario_id=${paymentData.usuario_id}&payment_id=${paymentData.payment_id}`
          : `usuario_id=${paymentData.usuario_id}&preference_id=${paymentData.preference_id}`;

        const response = await fetch(`/api/check-payment-status?${queryParams}`);

        if (response.ok) {
          const data = await response.json();

          if (data.payment_approved && data.account_active) {
            // Pagamento aprovado e conta ativada!
            setMensagemVerificacao("✅ Pagamento confirmado! Redirecionando...");
            localStorage.removeItem("pending_payment");

            setTimeout(() => {
              alert("🎉 Pagamento aprovado com sucesso!\nSua conta foi ativada.");
              router.push("/caixa");
            }, 1500);
          } else if (data.payment_approved && data.waiting_webhook) {
            // Pagamento aprovado, aguardando webhook
            setMensagemVerificacao("✅ Pagamento aprovado! Ativando sua conta...");
          } else {
            setMensagemVerificacao("⏳ Aguardando confirmação do pagamento...");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
      } finally {
        setVerificandoPagamento(false);
      }
    };

    // Verificar imediatamente
    verificarPagamentoPendente();

    // Depois verificar a cada 5 segundos
    const interval = setInterval(verificarPagamentoPendente, 5000);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const nome = localStorage.getItem("operadorNome") || "Usuário";
    const id = localStorage.getItem("operadorId") || "";
    setOperadorNome(nome);
    setOperadorId(id);

    // Carregar SDK do Mercado Pago
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "APP_USR-ef9e4406-88e9-479f-a8ea-63b20a97ef4a";
      const mercadopago = new window.MercadoPago(publicKey, {
        locale: "pt-BR"
      });
      setMp(mercadopago);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const gerarLinkPagamento = async (tipo: "pix" | "cartao") => {
    if (!operadorId) {
      alert("Erro: Usuário não identificado. Por favor, faça login novamente.");
      router.push("/");
      return;
    }

    setCarregandoPagamento(true);

    try {
      console.log("🔄 Iniciando requisição para criar pagamento...");
      console.log("📋 Dados:", { usuario_id: operadorId, forma_pagamento: tipo });

      const response = await fetch("/api/create-payment-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: operadorId,
          forma_pagamento: tipo,
        }),
      });

      console.log("📡 Resposta recebida:", response.status, response.statusText);

      const data = await response.json();
      console.log("📦 Dados da resposta:", data);

      if (!response.ok || !data.success) {
        const errorMsg = data.error || "Erro ao gerar link de pagamento";
        const errorDetails = data.details ? `\n\nDetalhes: ${data.details}` : "";
        throw new Error(errorMsg + errorDetails);
      }

      // Salvar informações do pagamento para verificação posterior
      localStorage.setItem("pending_payment", JSON.stringify({
        preference_id: data.preference_id,
        usuario_id: operadorId,
        forma_pagamento: tipo,
        timestamp: new Date().toISOString(),
      }));

      // Abrir link de pagamento
      console.log("✅ Link de pagamento criado:", data.init_point);
      window.open(data.init_point, "_blank");
      setLinkPagamento(data.init_point);

      alert("Link de pagamento gerado com sucesso! Uma nova aba foi aberta.\n\nNão feche esta página! Aguarde a confirmação do pagamento.");
    } catch (error: any) {
      console.error("❌ Erro ao gerar link:", error);
      alert(`Erro ao gerar link de pagamento.\n\n${error.message}\n\nTente novamente ou entre em contato pelo WhatsApp.`);
    } finally {
      setCarregandoPagamento(false);
    }
  };

  const processarPagamentoPix = async () => {
    if (!operadorId) {
      alert("Erro: Usuário não identificado.");
      return;
    }

    setCarregandoPagamento(true);

    try {
      // Criar pagamento PIX transparente
      const response = await fetch("/api/create-pix-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: operadorId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar PIX");
      }

      // Salvar dados do PIX
      setPixQrCode(data.qr_code_base64);
      setPixCopiaCola(data.qr_code);
      setPixPaymentId(data.payment_id);
      setPixExibido(true);

      // Salvar informações do pagamento para verificação posterior
      localStorage.setItem("pending_payment", JSON.stringify({
        payment_id: data.payment_id,
        usuario_id: operadorId,
        forma_pagamento: "pix",
        timestamp: new Date().toISOString(),
      }));

      console.log("✅ PIX gerado com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro ao gerar PIX:", error);
      alert(`Erro ao gerar PIX.\n\n${error.message}\n\nTente novamente ou entre em contato pelo WhatsApp.`);
    } finally {
      setCarregandoPagamento(false);
    }
  };

  const copiarCodigoPix = () => {
    navigator.clipboard.writeText(pixCopiaCola);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  const processarPagamentoCartao = async () => {
    if (!operadorId) {
      alert("Erro: Usuário não identificado.");
      return;
    }

    if (!cardNumber || !cardHolder || !expirationDate || !securityCode) {
      setCardError("Por favor, preencha todos os campos do cartão");
      return;
    }

    if (!mp) {
      setCardError("SDK do Mercado Pago não carregado");
      return;
    }

    setCarregandoPagamento(true);
    setCardError("");

    try {
      // Separar mês e ano
      const [month, year] = expirationDate.split("/");

      // Criar token do cartão
      const cardToken = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName: cardHolder,
        cardExpirationMonth: month,
        cardExpirationYear: `20${year}`,
        securityCode: securityCode,
      });

      console.log("✅ Token criado:", cardToken.id);

      // Processar pagamento
      const response = await fetch("/api/process-card-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: operadorId,
          forma_pagamento: "cartao",
          token: cardToken.id,
          installments: installments,
          payment_method_id: "visa", // Detectar automaticamente seria ideal
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar pagamento");
      }

      if (data.status === "approved") {
        alert("Pagamento aprovado com sucesso! Sua conta foi ativada.");
        router.push("/caixa?payment=success");
      } else if (data.status === "in_process" || data.status === "pending") {
        alert("Pagamento em processamento. Você será notificado quando for aprovado.");
        router.push("/caixa?payment=pending");
      } else {
        throw new Error(`Pagamento ${data.status}: ${data.status_detail}`);
      }
    } catch (error: any) {
      console.error("❌ Erro ao processar pagamento:", error);
      setCardError(error.message || "Erro ao processar pagamento");
    } finally {
      setCarregandoPagamento(false);
    }
  };

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
  };

  const voltarParaCaixa = () => {
    router.push("/caixa");
  };

  const formatarNumeroCartao = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    const grupos = numeros.match(/.{1,4}/g);
    return grupos ? grupos.join(" ") : "";
  };

  const formatarDataExpiracao = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length >= 2) {
      return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}`;
    }
    return numeros;
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

        {/* Indicador de Verificação de Pagamento */}
        {verificandoPagamento && mensagemVerificacao && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl p-4 shadow-lg animate-pulse">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <div>
                <p className="font-semibold">Verificando pagamento</p>
                <p className="text-sm text-blue-100">{mensagemVerificacao}</p>
              </div>
            </div>
          </div>
        )}

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

            {!pixExibido ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Clique no botão abaixo para gerar seu QR Code de pagamento via PIX.
                </p>

                <button
                  onClick={processarPagamentoPix}
                  disabled={carregandoPagamento}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {carregandoPagamento ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gerando PIX...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">PIX</span>
                      </div>
                      <span>Gerar QR Code PIX</span>
                    </>
                  )}
                </button>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Rápido e fácil:</strong> O pagamento via PIX é aprovado instantaneamente e sua conta será ativada automaticamente.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-4">
                  <p className="text-sm text-gray-600 mb-4 text-center">
                    Escaneie o QR Code abaixo com o aplicativo do seu banco ou copie o código PIX:
                  </p>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      <img
                        src={`data:image/png;base64,${pixQrCode}`}
                        alt="QR Code PIX"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>

                  {/* Código Pix Copia e Cola */}
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-2 text-center">Código PIX (Copia e Cola)</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={pixCopiaCola}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700"
                      />
                      <button
                        onClick={copiarCodigoPix}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center space-x-2 transition-all"
                      >
                        {pixCopiado ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-sm">Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informações do Pagamento */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Valor:</span>
                      <span className="text-lg font-bold text-gray-800">R$ 59,90</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Validade:</span>
                      <span className="text-sm font-semibold text-gray-800">60 dias</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <Loader2 className="w-5 h-5 text-yellow-600 animate-spin flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Aguardando pagamento...</p>
                      <p>Estamos verificando automaticamente. Não feche esta página!</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPixExibido(false);
                    setPixQrCode("");
                    setPixCopiaCola("");
                  }}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all"
                >
                  Gerar novo QR Code
                </button>
              </>
            )}
          </div>
        )}

        {/* Detalhes do Pagamento Cartão - CHECKOUT TRANSPARENTE */}
        {formaPagamento === "cartao" && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <span>Pagamento via Cartão - R$ 149,70 (180 dias - 6 meses)</span>
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Preencha os dados do cartão para finalizar sua compra.
            </p>

            {/* Formulário de Cartão */}
            <div className="space-y-4">
              {/* Número do Cartão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do cartão
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatarNumeroCartao(e.target.value))}
                  maxLength={19}
                  placeholder="0000 0000 0000 0000"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                />
              </div>

              {/* Nome no Cartão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome impresso no cartão
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  placeholder="NOME SOBRENOME"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                />
              </div>

              {/* Data de Expiração e CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validade
                  </label>
                  <input
                    type="text"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(formatarDataExpiracao(e.target.value))}
                    maxLength={5}
                    placeholder="MM/AA"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ""))}
                    maxLength={4}
                    placeholder="123"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  />
                </div>
              </div>

              {/* Parcelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parcelas
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                >
                  <option value={1}>1x de R$ 149,70 sem juros</option>
                  <option value={2}>2x de R$ 74,85 sem juros</option>
                  <option value={3}>3x de R$ 49,90 sem juros</option>
                </select>
              </div>

              {/* Mensagem de Erro */}
              {cardError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{cardError}</p>
                </div>
              )}

              {/* Botão de Pagamento */}
              <button
                onClick={processarPagamentoCartao}
                disabled={carregandoPagamento}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {carregandoPagamento ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando pagamento...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Pagar R$ 149,70</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span><strong>Seguro:</strong> Seus dados são processados de forma segura pelo Mercado Pago.</span>
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
