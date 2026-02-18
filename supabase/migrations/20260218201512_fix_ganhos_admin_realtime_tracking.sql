-- =====================================================
-- CORREÇÃO: RASTREAMENTO DE GANHOS ADMIN EM TEMPO REAL
-- =====================================================
-- Problema: Ganhos de renovação não eram registrados
-- porque a estrutura da tabela não correspondia ao código
-- Solução: Garantir estrutura correta e realtime ativo
-- =====================================================

-- 1. GARANTIR ESTRUTURA CORRETA DA TABELA ganhos_admin
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('conta-criada', 'mensalidade-paga')),
  usuario_id TEXT,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_assinatura INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. HABILITAR ROW LEVEL SECURITY
ALTER TABLE ganhos_admin ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS RLS PERMISSIVAS (controle feito via código)
DROP POLICY IF EXISTS "allow_all_ganhos" ON ganhos_admin;
CREATE POLICY "allow_all_ganhos" ON ganhos_admin
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON ganhos_admin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON ganhos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_usuario_id ON ganhos_admin(usuario_id);

-- 5. HABILITAR REALTIME NA TABELA
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ganhos_admin;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. COMENTÁRIOS EXPLICATIVOS
COMMENT ON TABLE ganhos_admin IS 'Registro de ganhos do admin (contas criadas e renovações). Atualiza em tempo real na carteira.';
COMMENT ON COLUMN ganhos_admin.tipo IS 'conta-criada = Novo cadastro (R$ 149,70 cartão ou R$ 59,90 PIX) | mensalidade-paga = Renovação de dias';
COMMENT ON COLUMN ganhos_admin.dias_assinatura IS 'Número de dias da assinatura (60 para PIX, 180 para cartão)';

-- =====================================================
-- ✅ MIGRATION COMPLETA
-- =====================================================
-- Agora o sistema deve:
-- 1. Registrar corretamente os ganhos de renovação
-- 2. Atualizar em tempo real o card laranja "Compras de Dias"
-- 3. Exibir todos os ganhos na carteira do admin
-- =====================================================
