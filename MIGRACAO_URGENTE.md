# 🚨 MIGRAÇÃO URGENTE - Corrigir erro HTTP 500 no pagamento

## Problema
A tabela `solicitacoes_renovacao` não tem as colunas necessárias para armazenar os IDs do MercadoPago, causando erro HTTP 500 ao tentar gerar link de pagamento.

## Solução
Execute o SQL abaixo no **Supabase Dashboard → SQL Editor**:

```sql
-- Adicionar colunas do MercadoPago
ALTER TABLE public.solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_preference_id
ON public.solicitacoes_renovacao(mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON public.solicitacoes_renovacao(mercadopago_payment_id);

-- Adicionar comentários descritivos
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_preference_id IS 'ID da preferência de pagamento criada no MercadoPago';
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_payment_id IS 'ID do pagamento confirmado pelo MercadoPago (preenchido pelo webhook)';
```

## Como executar
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Cole o SQL acima
5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Aguarde a confirmação "Success"
7. Teste o pagamento novamente no app

## Verificação
Após executar, verifique se as colunas foram criadas:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'solicitacoes_renovacao'
ORDER BY ordinal_position;
```

Você deve ver as colunas:
- `mercadopago_preference_id` (text)
- `mercadopago_payment_id` (text)
