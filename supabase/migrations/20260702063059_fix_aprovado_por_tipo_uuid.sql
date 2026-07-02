-- Garantir que aprovado_por existe como TEXT (operadores.id é TEXT neste projeto)
-- Remover qualquer FK conflitante se existir
DO $$
BEGIN
  -- Dropar FK se existir com tipo incompatível
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'historico_pagamentos'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'aprovado_por'
  ) THEN
    ALTER TABLE public.historico_pagamentos DROP CONSTRAINT IF EXISTS historico_pagamentos_aprovado_por_fkey;
  END IF;
END $$;

-- Garantir que a coluna existe como TEXT simples (sem FK)
ALTER TABLE public.historico_pagamentos ADD COLUMN IF NOT EXISTS aprovado_por TEXT;