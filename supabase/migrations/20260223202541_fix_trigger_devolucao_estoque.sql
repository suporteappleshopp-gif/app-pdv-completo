-- ===============================================
-- CORREÇÃO DEFINITIVA DO TRIGGER DE DEVOLUÇÃO
-- ===============================================
-- Corrige o trigger para usar os nomes corretos das colunas:
-- - produtos.user_id (não operador_id)
-- - produtos.estoque (não quantidade)
-- - avarias.user_id (já correto)
-- ===============================================

-- 1. Garantir que a coluna tipo_destino existe na tabela avarias
ALTER TABLE IF EXISTS avarias
ADD COLUMN IF NOT EXISTS tipo_destino text DEFAULT 'avaria'
CHECK (tipo_destino IN ('estoque', 'avaria'));

-- 2. Recriar a função com os nomes CORRETOS das colunas
CREATE OR REPLACE FUNCTION processar_devolucao_estoque()
RETURNS TRIGGER AS $$
DECLARE
  v_produto_encontrado INTEGER;
BEGIN
  -- Se o tipo de destino for 'estoque', atualizar automaticamente o estoque
  IF NEW.tipo_destino = 'estoque' THEN

    -- Verificar se o produto existe para este usuário
    SELECT COUNT(*) INTO v_produto_encontrado
    FROM produtos
    WHERE nome = NEW.produto_nome
      AND user_id = NEW.user_id::text;

    IF v_produto_encontrado > 0 THEN
      -- Incrementar o estoque do produto
      UPDATE produtos
      SET estoque = estoque + NEW.quantidade,
          updated_at = NOW()
      WHERE nome = NEW.produto_nome
        AND user_id = NEW.user_id::text;

      RAISE NOTICE '✅ Produto "%" devolvido ao estoque. Quantidade: % unidades (user_id: %)',
        NEW.produto_nome, NEW.quantidade, NEW.user_id;
    ELSE
      RAISE WARNING '⚠️ Produto "%" não encontrado no estoque do usuário % - devolução registrada mas estoque não atualizado',
        NEW.produto_nome, NEW.user_id;
    END IF;

  ELSE
    -- Se for avaria, apenas registrar (não volta ao estoque)
    RAISE NOTICE '⚠️ Produto "%" registrado como AVARIA. Quantidade: % unidades. NÃO voltará ao estoque.',
      NEW.produto_nome, NEW.quantidade;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS trigger_processar_devolucao_estoque ON avarias;
CREATE TRIGGER trigger_processar_devolucao_estoque
  AFTER INSERT ON avarias
  FOR EACH ROW
  EXECUTE FUNCTION processar_devolucao_estoque();

-- 4. Garantir que realtime está habilitado para as tabelas necessárias
DO $$
BEGIN
  -- Habilitar realtime para produtos (para ver atualização de estoque em tempo real)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Realtime já habilitado para produtos';
  END;

  -- Habilitar realtime para avarias
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE avarias;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Realtime já habilitado para avarias';
  END;

  -- Habilitar realtime para vendas
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Realtime já habilitado para vendas';
  END;

  -- Habilitar realtime para itens_venda
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Realtime já habilitado para itens_venda';
  END;
END $$;

-- 5. Criar índice para melhorar performance do trigger
CREATE INDEX IF NOT EXISTS idx_produtos_user_nome
ON produtos(user_id, nome);

-- 6. Comentários
COMMENT ON FUNCTION processar_devolucao_estoque() IS
  'Trigger que atualiza automaticamente o estoque quando tipo_destino = estoque.
   Se tipo_destino = avaria, apenas registra sem atualizar estoque.';

COMMENT ON COLUMN avarias.tipo_destino IS
  'Define o destino da devolução: "estoque" volta ao estoque automaticamente, "avaria" apenas registra';

-- 7. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ TRIGGER DE DEVOLUÇÃO CORRIGIDO COM SUCESSO';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 O que foi corrigido:';
  RAISE NOTICE '   1. ✅ Trigger usa produtos.user_id (não operador_id)';
  RAISE NOTICE '   2. ✅ Trigger usa produtos.estoque (não quantidade)';
  RAISE NOTICE '   3. ✅ Validação de produto existente antes de atualizar';
  RAISE NOTICE '   4. ✅ Logs detalhados para debug';
  RAISE NOTICE '   5. ✅ Realtime habilitado para todas as tabelas';
  RAISE NOTICE '   6. ✅ Índice otimizado para performance';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Como funciona:';
  RAISE NOTICE '   - Devolução com tipo_destino="estoque" → Produto volta ao estoque';
  RAISE NOTICE '   - Devolução com tipo_destino="avaria" → Produto NÃO volta ao estoque';
  RAISE NOTICE '   - Tudo acontece em tempo real via Realtime do Supabase';
  RAISE NOTICE '';
END $$;
