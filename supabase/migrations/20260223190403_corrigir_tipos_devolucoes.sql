-- Primeiro, remove a migration anterior se foi aplicada parcialmente
DROP TABLE IF EXISTS avaliacoes_produto CASCADE;
DROP TABLE IF EXISTS devolucoes CASCADE;
DROP TABLE IF EXISTS notificacoes_reembolso CASCADE;
DROP FUNCTION IF EXISTS atualizar_updated_at CASCADE;
DROP FUNCTION IF EXISTS calcular_prazo_devolucao CASCADE;
DROP FUNCTION IF EXISTS notificar_mudanca_status_devolucao CASCADE;

-- Criar tabela de devoluções (CORRIGIDO: user_id como TEXT)
CREATE TABLE devolucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_nome text NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('defeito', 'tamanho', 'nao_gostei', 'outro')),
  descricao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada', 'produto_recebido', 'reembolsado')),
  valor_reembolso decimal(10,2) NOT NULL,
  fotos_produto text[], -- URLs das fotos
  data_limite_devolucao timestamptz NOT NULL,
  data_criacao timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de notificações de reembolso
CREATE TABLE notificacoes_reembolso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucao_id uuid NOT NULL REFERENCES devolucoes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('status_atualizado', 'reembolso_processado', 'prazo_expirando')),
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  data_criacao timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de avaliações de produto
CREATE TABLE avaliacoes_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_nome text NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  data_criacao timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_devolucoes_user_id ON devolucoes(user_id);
CREATE INDEX idx_devolucoes_pedido_id ON devolucoes(pedido_id);
CREATE INDEX idx_devolucoes_status ON devolucoes(status);
CREATE INDEX idx_notificacoes_user_id ON notificacoes_reembolso(user_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes_reembolso(lida);
CREATE INDEX idx_avaliacoes_user_id ON avaliacoes_produto(user_id);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_atualizar_updated_at
  BEFORE UPDATE ON devolucoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at();

-- Função para calcular prazo de devolução (7 dias após pedido entregue)
CREATE OR REPLACE FUNCTION calcular_prazo_devolucao(pedido_id uuid)
RETURNS timestamptz AS $$
DECLARE
  data_entrega timestamptz;
BEGIN
  SELECT data_prevista_entrega INTO data_entrega
  FROM pedidos
  WHERE id = pedido_id;

  RETURN data_entrega + interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Função para notificar mudança de status
CREATE OR REPLACE FUNCTION notificar_mudanca_status_devolucao()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar notificação quando status mudar
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notificacoes_reembolso (devolucao_id, user_id, tipo, mensagem)
    VALUES (
      NEW.id,
      NEW.user_id,
      'status_atualizado',
      'Status da sua devolução foi atualizado para: ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificação
CREATE TRIGGER trigger_notificar_status
  AFTER UPDATE ON devolucoes
  FOR EACH ROW
  EXECUTE FUNCTION notificar_mudanca_status_devolucao();

-- RLS (Row Level Security) - Segurança
ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_reembolso ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_produto ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para devolucoes
CREATE POLICY "Usuários podem ver suas próprias devoluções"
  ON devolucoes FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem criar devoluções"
  ON devolucoes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem atualizar suas devoluções pendentes"
  ON devolucoes FOR UPDATE
  USING (auth.uid()::text = user_id AND status = 'pendente');

-- Políticas de acesso para notificacoes_reembolso
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON notificacoes_reembolso FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem marcar notificações como lidas"
  ON notificacoes_reembolso FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Políticas de acesso para avaliacoes_produto
CREATE POLICY "Todos podem ver avaliações"
  ON avaliacoes_produto FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Usuários podem criar suas próprias avaliações"
  ON avaliacoes_produto FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Inserir dados de exemplo
INSERT INTO devolucoes (pedido_id, user_id, produto_nome, motivo, descricao, valor_reembolso, data_limite_devolucao)
SELECT
  id,
  user_id,
  'Notebook Gamer RGB Pro',
  'defeito',
  'Teclado não funciona corretamente',
  3499.99,
  data_prevista_entrega + interval '7 days'
FROM pedidos
WHERE status = 'entregue'
LIMIT 1;
