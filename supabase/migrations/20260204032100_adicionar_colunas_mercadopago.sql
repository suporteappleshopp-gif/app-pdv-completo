-- Adicionar colunas do MercadoPago na tabela solicitacoes_renovacao
-- Essas colunas armazenam os IDs retornados pelo MercadoPago para rastreamento do pagamento

ALTER TABLE public.solicitacoes_renovacao
ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Criar índices para buscar por preference_id e payment_id
CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_preference_id
ON public.solicitacoes_renovacao(mercadopago_preference_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_mercadopago_payment_id
ON public.solicitacoes_renovacao(mercadopago_payment_id);

-- Adicionar comentários descritivos
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_preference_id IS 'ID da preferência de pagamento criada no MercadoPago';
COMMENT ON COLUMN public.solicitacoes_renovacao.mercadopago_payment_id IS 'ID do pagamento confirmado pelo MercadoPago (preenchido pelo webhook)';
