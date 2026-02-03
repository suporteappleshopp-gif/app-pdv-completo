-- =========================================================================
-- CORRIGIR RELACIONAMENTO ENTRE solicitacoes_renovacao E operadores
-- Para permitir JOIN e Supabase reconhecer o relacionamento
-- =========================================================================

-- Verificar se o relacionamento já existe e recriar se necessário
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'solicitacoes_renovacao_operador_id_fkey'
    AND table_name = 'solicitacoes_renovacao'
  ) THEN
    ALTER TABLE public.solicitacoes_renovacao
      DROP CONSTRAINT solicitacoes_renovacao_operador_id_fkey;
  END IF;

  -- Adicionar constraint com nome explícito
  ALTER TABLE public.solicitacoes_renovacao
    ADD CONSTRAINT solicitacoes_renovacao_operador_id_fkey
    FOREIGN KEY (operador_id)
    REFERENCES public.operadores(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

  RAISE NOTICE 'Foreign key constraint recriada com sucesso';
END $$;

-- Garantir que o índice existe para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id
  ON public.solicitacoes_renovacao(operador_id);

-- Comentário para documentação
COMMENT ON CONSTRAINT solicitacoes_renovacao_operador_id_fkey
  ON public.solicitacoes_renovacao
  IS 'Relacionamento com tabela operadores para JOIN no Supabase';

-- =========================================================================
-- TESTAR RELACIONAMENTO
-- =========================================================================

-- Verificar se o relacionamento está funcionando
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Contar registros com JOIN
  SELECT COUNT(*) INTO test_count
  FROM public.solicitacoes_renovacao sr
  JOIN public.operadores op ON sr.operador_id = op.id;

  RAISE NOTICE 'Teste de JOIN bem-sucedido: % registros encontrados', test_count;
END $$;

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
