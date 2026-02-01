#!/bin/bash

# Script para verificar e reprocessar o pagamento do usuário joelmamoura2
# Payment ID do Mercado Pago: 144403884360

echo "🔍 VERIFICANDO PAGAMENTO DO USUÁRIO joelmamoura2"
echo "================================================"
echo ""
echo "📋 Dados do pagamento:"
echo "  - Payment ID: 144403884360"
echo "  - Valor: R$ 59,90"
echo "  - Dias: 60 dias"
echo "  - Data: 01/02/2026, 19:35:04 (UTC)"
echo ""

# URL da API (ajuste se necessário)
API_URL="https://app-pdv-completo.vercel.app"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ VERIFICANDO LOGS DE WEBHOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s "$API_URL/api/webhook/verificar-logs?payment_id=144403884360" | jq '.' || echo "❌ Erro ao buscar logs"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ REPROCESSANDO PAGAMENTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s -X POST "$API_URL/api/webhook/reprocessar-pagamento" \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "144403884360"}' | jq '.' || echo "❌ Erro ao reprocessar pagamento"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ VERIFICANDO STATUS DO WEBHOOK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

curl -s "$API_URL/api/webhook/mercadopago" | jq '.' || echo "❌ Erro ao verificar webhook"

echo ""
echo "================================================"
echo "✅ VERIFICAÇÃO CONCLUÍDA"
echo ""
echo "📌 PRÓXIMOS PASSOS:"
echo ""
echo "1. Se o pagamento foi reprocessado com sucesso, os 60 dias foram creditados"
echo "2. Verifique no painel do Mercado Pago se a URL do webhook está correta:"
echo "   ✅ CORRETO: $API_URL/api/webhook/mercadopago"
echo "   ❌ ERRADO: URLs com typos ou paths incorretos"
echo ""
echo "3. Configure a URL correta em: https://www.mercadopago.com.br/settings/account/webhooks"
echo ""
