import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de teste para verificar se o webhook está acessível
 * Use esta URL para testar: https://seu-dominio.com/api/webhook-test
 */

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  return NextResponse.json({
    status: "✅ API funcionando!",
    message: "Seu app está no ar e a API está respondendo corretamente",

    webhook_info: {
      url_correta: `${baseUrl}/api/webhook/mercadopago`,
      como_configurar: "Copie a URL acima e configure no painel do Mercado Pago em Webhooks",
      painel_mercadopago: "https://www.mercadopago.com.br/developers/panel/app"
    },

    teste_webhook: {
      url_para_testar: `${baseUrl}/api/webhook/mercadopago`,
      metodo: "GET",
      resposta_esperada: "Deve retornar uma mensagem dizendo que o webhook está ativo"
    },

    seu_dominio: {
      base_url: baseUrl,
      webhook_url: `${baseUrl}/api/webhook/mercadopago`,
      instrucao: "Use a URL 'webhook_url' acima no painel do Mercado Pago"
    },

    timestamp: new Date().toISOString()
  }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({
    error: "Este é um endpoint de teste. Use /api/webhook/mercadopago para receber notificações"
  }, { status: 400 });
}
