#!/bin/bash

# Script de teste do webhook Mercado Pago
# Este script simula as notificações enviadas pelo Mercado Pago

echo "🧪 TESTE DO WEBHOOK MERCADO PAGO"
echo "================================"
echo ""

# URL do webhook (ajuste conforme necessário)
WEBHOOK_URL="https://app-pdv-completo.vercel.app/api/webhook/mercadopago"

echo "📍 URL de teste: $WEBHOOK_URL"
echo ""

# Teste 1: GET (verificar se está ativo)
echo "📋 Teste 1: Verificando status (GET)..."
curl -s -X GET "$WEBHOOK_URL" | jq '.' || echo "Erro ao fazer GET"
echo ""
echo "---"
echo ""

# Teste 2: POST com notificação de pagamento
echo "📋 Teste 2: Simulando notificação de pagamento (POST)..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {
      "id": "143673334915"
    },
    "date_created": "2026-02-01T07:39:33Z",
    "id": 128710333892,
    "live_mode": true,
    "type": "payment",
    "user_id": "361417955"
  }' | jq '.' || echo "Erro ao fazer POST"

echo ""
echo "---"
echo ""

# Teste 3: POST com outro tipo de notificação
echo "📋 Teste 3: Simulando notificação genérica (POST)..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test.created",
    "api_version": "v1",
    "data": {
      "id": "test123"
    },
    "type": "test",
    "user_id": "361417955"
  }' | jq '.' || echo "Erro ao fazer POST"

echo ""
echo "================================"
echo "✅ Testes concluídos!"
echo ""
echo "📌 PRÓXIMOS PASSOS:"
echo ""
echo "1. No painel do Mercado Pago, corrija a URL de teste:"
echo "   ❌ ERRADO: https://app-pdv-completo.vercel.apebhook/mercadopago"
echo "   ✅ CORRETO: https://app-pdv-completo.vercel.app/api/webhook/mercadopago"
echo ""
echo "2. Verifique se a variável MERCADOPAGO_ACCESS_TOKEN está configurada no Vercel"
echo ""
echo "3. Teste novamente fazendo um pagamento real no modo teste"
echo ""
