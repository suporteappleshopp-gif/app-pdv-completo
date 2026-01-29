-- Schema SQL para o sistema PDV com autenticação Supabase
-- Execute este script no painel SQL do Supabase

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de operadores (usuários do sistema)
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  suspenso BOOLEAN DEFAULT FALSE,
  aguardando_pagamento BOOLEAN DEFAULT FALSE,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao')),
  valor_mensal NUMERIC(10, 2),
  dias_assinatura INTEGER,
  data_proximo_vencimento TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_barras TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  categoria TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero INTEGER NOT NULL,
  operador_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_nome TEXT NOT NULL,
  itens JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('concluida', 'cancelada')) DEFAULT 'concluida',
  tipo_pagamento TEXT CHECK (tipo_pagamento IN ('dinheiro', 'credito', 'debito', 'pix', 'outros')),
  motivo_cancelamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS mensagens_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operador_id UUID REFERENCES operadores(id) ON DELETE CASCADE,
  remetente TEXT CHECK (remetente IN ('admin', 'usuario')) NOT NULL,
  texto TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_operadores_email ON operadores(email);
CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON operadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_vendas_operador_id ON vendas(operador_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_hora ON vendas(data_hora);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON vendas(numero);
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_operador_id ON mensagens_chat(operador_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_operadores_updated_at BEFORE UPDATE ON operadores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_chat ENABLE ROW LEVEL SECURITY;

-- Política: Admin pode ver tudo
CREATE POLICY "Admin pode ver todos operadores" ON operadores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM operadores WHERE id = auth.uid()::text AND is_admin = TRUE
  )
);

CREATE POLICY "Admin pode atualizar operadores" ON operadores FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM operadores WHERE id = auth.uid()::text AND is_admin = TRUE
  )
);

CREATE POLICY "Admin pode inserir operadores" ON operadores FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM operadores WHERE id = auth.uid()::text AND is_admin = TRUE
  )
);

-- Política: Usuário pode ver seus próprios dados
CREATE POLICY "Usuário vê próprios dados" ON operadores FOR SELECT USING (
  id::text = auth.uid()::text
);

-- Política: Usuário pode ver apenas seus próprios produtos
CREATE POLICY "Usuário vê próprios produtos" ON produtos FOR SELECT USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode inserir próprios produtos" ON produtos FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode atualizar próprios produtos" ON produtos FOR UPDATE USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode deletar próprios produtos" ON produtos FOR DELETE USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

-- Política: Usuário pode ver apenas suas próprias vendas
CREATE POLICY "Usuário vê próprias vendas" ON vendas FOR SELECT USING (
  operador_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode inserir próprias vendas" ON vendas FOR INSERT WITH CHECK (
  operador_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

-- Política: Usuário pode ver apenas suas próprias empresas
CREATE POLICY "Usuário vê próprias empresas" ON empresas FOR SELECT USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode inserir próprias empresas" ON empresas FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Usuário pode atualizar próprias empresas" ON empresas FOR UPDATE USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

-- Política: Mensagens de chat
CREATE POLICY "Usuário vê próprias mensagens" ON mensagens_chat FOR SELECT USING (
  operador_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM operadores WHERE id = auth.uid()::text AND is_admin = TRUE)
);

CREATE POLICY "Usuário pode enviar mensagens" ON mensagens_chat FOR INSERT WITH CHECK (
  operador_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Admin pode enviar mensagens para todos" ON mensagens_chat FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM operadores WHERE id = auth.uid()::text AND is_admin = TRUE)
);

-- Inserir admin padrão (opcional - ajuste a senha conforme necessário)
-- IMPORTANTE: Após executar, crie o usuário admin no Authentication do Supabase
-- Email: admin@pdv.com
-- Senha: Sedexdez@1

-- Função para criar operador automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.operadores (auth_user_id, nome, email, is_admin, ativo)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome', NEW.email, FALSE, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar operador após signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentários para documentação
COMMENT ON TABLE operadores IS 'Tabela de operadores (usuários) do sistema PDV';
COMMENT ON TABLE produtos IS 'Tabela de produtos cadastrados no estoque';
COMMENT ON TABLE vendas IS 'Tabela de vendas realizadas e canceladas';
COMMENT ON TABLE empresas IS 'Tabela de dados da empresa para NFC-e';
COMMENT ON TABLE mensagens_chat IS 'Tabela de mensagens entre admin e usuários';
