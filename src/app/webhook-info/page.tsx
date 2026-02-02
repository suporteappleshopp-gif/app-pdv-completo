"use client";

import { useEffect, useState } from "react";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";

export default function WebhookInfoPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    // Obter URL base no cliente
    setBaseUrl(window.location.origin);

    // Testar se o webhook está respondendo
    fetch("/api/webhook/mercadopago")
      .then((res) => {
        if (res.ok) {
          setWebhookStatus("online");
        } else {
          setWebhookStatus("offline");
        }
      })
      .catch(() => {
        setWebhookStatus("offline");
      });
  }, []);

  const webhookUrl = baseUrl ? `${baseUrl}/api/webhook/mercadopago` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔔 Configuração do Webhook Mercado Pago
          </h1>
          <p className="text-gray-600">
            Use esta página para obter a URL correta e configurar o webhook no painel do Mercado Pago
          </p>
        </div>

        {/* Status do Webhook */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Status do Webhook
          </h2>
          <div className="flex items-center gap-3">
            {webhookStatus === "checking" && (
              <>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-gray-600">Verificando...</span>
              </>
            )}
            {webhookStatus === "online" && (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-green-600 font-medium">Webhook Online e Funcionando!</span>
              </>
            )}
            {webhookStatus === "offline" && (
              <>
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="text-red-600 font-medium">Webhook Offline</span>
              </>
            )}
          </div>
        </div>

        {/* URL do Webhook */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📝 URL do Webhook
          </h2>
          <p className="text-gray-600 mb-4">
            Copie a URL abaixo e configure no painel do Mercado Pago:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between gap-4">
              <code className="text-sm text-blue-600 font-mono break-all flex-1">
                {webhookUrl || "Carregando..."}
              </code>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                disabled={!webhookUrl}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Passo a Passo */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🚀 Passo a Passo
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  Copie a URL do webhook acima
                </h3>
                <p className="text-gray-600 text-sm">
                  Clique no botão "Copiar" para copiar a URL completa
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  Acesse o painel do Mercado Pago
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Entre no painel de desenvolvedor do Mercado Pago:
                </p>
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  Abrir Painel do Mercado Pago →
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  Configure o webhook
                </h3>
                <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                  <li>Selecione sua aplicação</li>
                  <li>Vá em "Webhooks" no menu lateral</li>
                  <li>Adicione ou edite o webhook existente</li>
                  <li>Cole a URL copiada no campo de URL</li>
                  <li>Selecione o evento "Pagamentos" (payment)</li>
                  <li>Salve as alterações</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  Teste o pagamento
                </h3>
                <p className="text-gray-600 text-sm">
                  Faça um novo teste de pagamento no seu app. O webhook agora deve processar o pagamento corretamente!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Problemas Comuns
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-amber-900 mb-1">❌ Erro 404 (Not Found)</p>
              <p className="text-amber-800">
                A URL está incorreta no painel do Mercado Pago. Verifique se copiou a URL completa corretamente.
              </p>
            </div>
            <div>
              <p className="font-semibold text-amber-900 mb-1">⏱️ Timeout</p>
              <p className="text-amber-800">
                O webhook está demorando muito para responder. Verifique os logs do Vercel.
              </p>
            </div>
            <div>
              <p className="font-semibold text-amber-900 mb-1">🔒 Erro de SSL</p>
              <p className="text-amber-800">
                Certifique-se de usar HTTPS (não HTTP) na URL do webhook.
              </p>
            </div>
          </div>
        </div>

        {/* Links Úteis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🔗 Links Úteis
          </h2>
          <div className="space-y-2">
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-blue-600 text-sm transition-colors"
            >
              📚 Documentação de Webhooks do Mercado Pago →
            </a>
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-blue-600 text-sm transition-colors"
            >
              🎛️ Painel de Desenvolvedor →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
