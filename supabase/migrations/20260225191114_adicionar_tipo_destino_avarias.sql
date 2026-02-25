-- Adicionar coluna tipo_destino na tabela avarias
ALTER TABLE avarias
ADD COLUMN IF NOT EXISTS tipo_destino TEXT DEFAULT 'avaria' CHECK (tipo_destino IN ('estoque', 'avaria'));

-- Adicionar coluna codigo_barras para vincular ao produto (necessário para atualizar estoque)
ALTER TABLE avarias
ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

-- Criar ou substituir função para atualizar estoque quando devolução é para estoque
CREATE OR REPLACE FUNCTION atualizar_estoque_devolucao()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a devolução é para estoque (não é avaria) e temos o código de barras
  IF NEW.tipo_destino = 'estoque' AND NEW.codigo_barras IS NOT NULL THEN
    -- Atualizar o estoque do produto correspondente
    UPDATE produtos
    SET estoque = estoque + NEW.quantidade,
        updated_at = NOW()
    WHERE codigo_barras = NEW.codigo_barras
      AND user_id = NEW.user_id;

    -- Log da operação
    RAISE NOTICE 'Estoque atualizado: produto % recebeu % unidades de volta', NEW.codigo_barras, NEW.quantidade;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função após inserção na tabela avarias
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_devolucao ON avarias;

CREATE TRIGGER trigger_atualizar_estoque_devolucao
AFTER INSERT ON avarias
FOR EACH ROW
EXECUTE FUNCTION atualizar_estoque_devolucao();

-- Comentários para documentação
COMMENT ON COLUMN avarias.tipo_destino IS 'Define o destino da devolução: "estoque" (volta ao estoque) ou "avaria" (produto descartado)';
COMMENT ON COLUMN avarias.codigo_barras IS 'Código de barras do produto para atualizar estoque automaticamente';
COMMENT ON FUNCTION atualizar_estoque_devolucao IS 'Atualiza automaticamente o estoque quando tipo_destino = estoque';
