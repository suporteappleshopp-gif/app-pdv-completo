-- ============================================
-- ESTRUTURA COMPLETA DO BANCO DE DADOS
-- Sistema de Gerenciamento de Caixa e Operadores
-- ============================================

-- 1. TABELA DE OPERADORES (usuários do sistema)
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT,
  is_admin BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT false,
  suspenso BOOLEAN DEFAULT true,
  aguardando_pagamento BOOLEAN DEFAULT true,
  forma_pagamento TEXT,
  valor_mensal NUMERIC(10,2),
  data_proximo_vencimento TIMESTAMP,
  dias_assinatura INTEGER,
  data_pagamento TIMESTAMP,
  dias_restantes INTEGER DEFAULT 0,
  total_dias_comprados INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_barras TEXT,
  preco NUMERIC(10,2) NOT NULL,
  estoque INTEGER DEFAULT 0,
  categoria TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  numero_venda INTEGER NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  tipo_pagamento TEXT NOT NULL,
  status TEXT DEFAULT 'concluida',
  items JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA DE HISTÓRICO DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS historico_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  dias_assinatura INTEGER,
  data_pagamento TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABELA DE SOLICITAÇÕES DE RENOVAÇÃO
CREATE TABLE IF NOT EXISTS solicitacoes_renovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  resposta_admin TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. TABELA DE MENSAGENS (CHAT ADMIN-USUÁRIO)
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL,
  texto TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABELA DE GANHOS DO ADMIN
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  usuario_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  dias_assinatura INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_operadores_email ON operadores(email);
CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON operadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_operador_id ON produtos(operador_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_vendas_operador_id ON vendas(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_id ON historico_pagamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_operador_id ON mensagens(operador_id);

-- ============================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================

ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ganhos_admin ENABLE ROW LEVEL SECURITY;

-- Políticas para OPERADORES
CREATE POLICY "Operadores podem ver seus dados" ON operadores FOR SELECT
  USING (auth.uid() = auth_user_id OR is_admin = true);

CREATE POLICY "Operadores podem atualizar seus dados" ON operadores FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins podem ver todos operadores" ON operadores FOR SELECT
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem atualizar operadores" ON operadores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem deletar operadores" ON operadores FOR DELETE
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Permitir inserção de novos operadores" ON operadores FOR INSERT
  WITH CHECK (true);

-- Políticas para PRODUTOS
CREATE POLICY "Operadores podem ver seus produtos" ON produtos FOR SELECT
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Operadores podem inserir produtos" ON produtos FOR INSERT
  WITH CHECK (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Operadores podem atualizar seus produtos" ON produtos FOR UPDATE
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Operadores podem deletar seus produtos" ON produtos FOR DELETE
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

-- Políticas para VENDAS
CREATE POLICY "Operadores podem ver suas vendas" ON vendas FOR SELECT
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Operadores podem inserir vendas" ON vendas FOR INSERT
  WITH CHECK (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

-- Políticas para HISTÓRICO
CREATE POLICY "Usuários podem ver seu histórico" ON historico_pagamentos FOR SELECT
  USING (usuario_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem ver todo histórico" ON historico_pagamentos FOR SELECT
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem inserir histórico" ON historico_pagamentos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

-- Políticas para SOLICITAÇÕES
CREATE POLICY "Usuários podem ver suas solicitações" ON solicitacoes_renovacao FOR SELECT
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuários podem criar solicitações" ON solicitacoes_renovacao FOR INSERT
  WITH CHECK (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem ver todas solicitações" ON solicitacoes_renovacao FOR SELECT
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem atualizar solicitações" ON solicitacoes_renovacao FOR UPDATE
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

-- Políticas para MENSAGENS
CREATE POLICY "Usuários podem ver suas mensagens" ON mensagens FOR SELECT
  USING (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuários podem enviar mensagens" ON mensagens FOR INSERT
  WITH CHECK (operador_id IN (SELECT id FROM operadores WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem ver todas mensagens" ON mensagens FOR SELECT
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem inserir mensagens" ON mensagens FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem atualizar mensagens" ON mensagens FOR UPDATE
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

-- Políticas para GANHOS
CREATE POLICY "Admins podem ver ganhos" ON ganhos_admin FOR SELECT
  USING (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins podem inserir ganhos" ON ganhos_admin FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operadores_updated_at BEFORE UPDATE ON operadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON solicitacoes_renovacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar operador automaticamente
CREATE OR REPLACE FUNCTION criar_operador_automatico()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO operadores (
    auth_user_id, nome, email, is_admin, ativo, suspenso, aguardando_pagamento
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email, false, false, true, true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_operador AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_operador_automatico();

-- ============================================
-- CORREÇÃO: Função SECURITY DEFINER para evitar recursão infinita
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_auth_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status 
  FROM operadores 
  WHERE auth_user_id = user_auth_id
  LIMIT 1;
  
  RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas para usar a função
DROP POLICY IF EXISTS "Operadores podem ver seus dados" ON operadores CASCADE;
DROP POLICY IF EXISTS "Admins podem ver todos operadores" ON operadores CASCADE;

CREATE POLICY "select_operadores_v2" ON operadores FOR SELECT
  USING (auth_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "update_operadores_v2" ON operadores FOR UPDATE
  USING (auth_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "delete_operadores_v2" ON operadores FOR DELETE
  USING (is_admin(auth.uid()));
