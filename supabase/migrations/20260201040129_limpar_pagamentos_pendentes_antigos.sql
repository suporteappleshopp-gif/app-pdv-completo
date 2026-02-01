-- Limpar todos os pagamentos pendentes que têm mais de 4 minutos
-- Isso remove tentativas antigas que não foram concluídas

DELETE FROM historico_pagamentos
WHERE status = 'pendente'
  AND created_at < (NOW() - INTERVAL '4 minutes');

-- Criar função para limpeza automática (pode ser chamada periodicamente)
CREATE OR REPLACE FUNCTION limpar_pagamentos_pendentes_antigos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM historico_pagamentos
  WHERE status = 'pendente'
    AND created_at < (NOW() - INTERVAL '4 minutes');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário sobre a função
COMMENT ON FUNCTION limpar_pagamentos_pendentes_antigos() IS
'Remove pagamentos pendentes criados há mais de 4 minutos. Retorna quantidade removida.';
