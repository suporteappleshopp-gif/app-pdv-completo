-- =============================================================
-- FIX: Remover constraint CHECK de forma_pagamento em vendas
-- Problema: constraint "vendas_forma_pagamento_check" rejeita valor "outros"
-- usado em pagamentos múltiplos (dinheiro + crédito, pix + débito, etc.)
-- O controle de valores aceitos é feito na camada de aplicação.
-- =============================================================

-- Remover o constraint pelo nome exato reportado no erro
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_forma_pagamento_check;

-- Também remover variações do nome que possam existir
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS "vendas_forma_pagamento_check";

-- Garantir que forma_pagamento aceita qualquer valor TEXT (sem restrição)
-- Não adicionar novo constraint — o app já controla os valores válidos
