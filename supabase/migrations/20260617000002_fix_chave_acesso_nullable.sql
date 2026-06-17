-- Garantir que chave_acesso na notas_fiscais é nullable
-- Entradas manuais usam NULL (não string vazia) para evitar conflito na constraint UNIQUE
-- PostgreSQL permite múltiplos NULLs em colunas UNIQUE (cada NULL é distinto)
ALTER TABLE public.notas_fiscais ALTER COLUMN chave_acesso DROP NOT NULL;

-- Garantir que a constraint UNIQUE existe (pode não ter sido criada na migration anterior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notas_fiscais_chave_acesso_key'
      AND conrelid = 'public.notas_fiscais'::regclass
  ) THEN
    ALTER TABLE public.notas_fiscais ADD CONSTRAINT notas_fiscais_chave_acesso_key UNIQUE (chave_acesso);
  END IF;
END $$;

-- Corrigir registros existentes que têm chave_acesso = '' (string vazia) para NULL
-- Isso resolve o conflito de registros manuais anteriores
UPDATE public.notas_fiscais
SET chave_acesso = NULL
WHERE chave_acesso = '';
