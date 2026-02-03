-- Adicionar coluna para armazenar o ID do pagamento do MercadoPago
-- Quando o pagamento for confirmado pelo MercadoPago, o webhook atualiza este campo
-- O admin pode verificar se o pagamento foi realmente aprovado antes de liberar os dias

ALTER TABLE solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índice para buscar por payment_id
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON solicitacoes_renovacao(mercadopago_payment_id);

COMMENT ON COLUMN solicitacoes_renovacao.mercadopago_payment_id IS 'ID do pagamento retornado pelo MercadoPago após confirmação. Usado pelo admin para validar o pagamento antes de aprovar.';
