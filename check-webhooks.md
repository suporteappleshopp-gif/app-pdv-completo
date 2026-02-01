# 🔍 VERIFICAR WEBHOOKS E PAGAMENTOS

## 1. Verificar se webhook está recebendo notificações

### No Supabase (via SQL Editor):
```sql
-- Ver últimos webhooks recebidos
SELECT * FROM webhook_logs
ORDER BY created_at DESC
LIMIT 10;

-- Ver webhooks de sucesso
SELECT * FROM webhook_logs
WHERE status = 'processado'
ORDER BY created_at DESC;

-- Ver webhooks com erro
SELECT * FROM webhook_logs
WHERE status = 'erro'
ORDER BY created_at DESC;
```

## 2. Verificar pagamentos pendentes

```sql
-- Ver pagamentos pendentes
SELECT * FROM historico_pagamentos
WHERE status = 'pendente'
ORDER BY created_at DESC;

-- Ver pagamentos pagos
SELECT * FROM historico_pagamentos
WHERE status = 'pago'
ORDER BY data_pagamento DESC;
```

## 3. Verificar status dos usuários

```sql
-- Ver usuários aguardando pagamento
SELECT id, nome, email, aguardando_pagamento, data_proximo_vencimento
FROM operadores
WHERE aguardando_pagamento = true;

-- Ver usuários ativos
SELECT id, nome, email, ativo, data_proximo_vencimento
FROM operadores
WHERE ativo = true
ORDER BY data_proximo_vencimento DESC;
```

## 4. Verificar ganhos registrados

```sql
-- Ver últimos ganhos do admin
SELECT * FROM ganhos_admin
WHERE tipo = 'mensalidade-paga'
ORDER BY created_at DESC
LIMIT 10;

-- Total de ganhos
SELECT SUM(valor) as total_ganhos
FROM ganhos_admin
WHERE tipo = 'mensalidade-paga';
```

## 5. Testar webhook manualmente (via Postman ou cURL)

### Simular notificação do Mercado Pago:
```bash
curl -X POST https://lasy-8b4bcd9b.vercel.app/api/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

**Nota:** Este teste apenas verifica se o webhook está online. Para simular um pagamento real, você precisa criar um pagamento de teste no Mercado Pago.

## 6. URLs importantes

- **Webhook URL:** https://lasy-8b4bcd9b.vercel.app/api/webhook/mercadopago
- **App URL:** https://lasy-8b4bcd9b.vercel.app
- **Painel Mercado Pago:** https://www.mercadopago.com.br/developers/panel/app

## 7. Problemas comuns

### Webhook não está recebendo notificações:
1. Verifique se a URL está correta no painel do Mercado Pago
2. Confirme que os eventos `payment` estão selecionados
3. Teste a URL manualmente (GET request) para ver se está online

### Pagamento não ativa a conta:
1. Verifique os logs no `webhook_logs` para ver erros
2. Confirme que o `external_reference` está correto (deve ser o ID do usuário)
3. Verifique se o status do pagamento é "approved"

### Usuário não consegue fazer login após pagamento:
1. Verifique se o usuário foi atualizado no banco:
   ```sql
   SELECT * FROM operadores WHERE email = 'email@teste.com';
   ```
2. Confirme que `ativo = true` e `suspenso = false`
3. Verifique se há data em `data_proximo_vencimento`
