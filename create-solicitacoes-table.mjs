import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ynkuovfplntzckecruvk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA2NTAsImV4cCI6MjA4NTAzNjY1MH0.8dCQe242pXapIxiU6RZOlVxZAwa_RNcjoyzjcYrrAwQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔄 Criando tabela solicitacoes_renovacao...');

// SQL COMPLETO para criar a tabela
const sql = `
-- Remover tabela anterior se existir
DROP TABLE IF EXISTS public.solicitacoes_renovacao CASCADE;

-- Criar tabela de solicitações
CREATE TABLE public.solicitacoes_renovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_solicitados INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  mensagem_admin TEXT,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_resposta TIMESTAMP WITH TIME ZONE,
  admin_responsavel_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_solicitacoes_operador ON public.solicitacoes_renovacao(operador_id);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes_renovacao(status);
CREATE INDEX idx_solicitacoes_data ON public.solicitacoes_renovacao(data_solicitacao DESC);

-- Habilitar RLS
ALTER TABLE public.solicitacoes_renovacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Permitir acesso total (controle na aplicação)
CREATE POLICY "Permitir leitura de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir criacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR UPDATE
  USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_renovacao;
`;

try {
  // Tentar executar via fetch direto (API REST)
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  console.log('📡 Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erro:', errorText);
    throw new Error(errorText);
  }

  console.log('✅ Tabela criada com sucesso!');
} catch (error) {
  console.error('❌ Erro ao criar tabela:', error.message);
  console.log('\n📋 INSTRUÇÕES:');
  console.log('Copie o SQL abaixo e execute no SQL Editor do Supabase Dashboard:');
  console.log('👉 https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new');
  console.log('\n--- SQL ---');
  console.log(sql);
  console.log('--- FIM SQL ---\n');
}

// Testar se a tabela foi criada
console.log('\n🔍 Verificando se a tabela foi criada...');
const { data, error } = await supabase
  .from('solicitacoes_renovacao')
  .select('count')
  .limit(1);

if (error) {
  console.error('❌ Tabela ainda não existe:', error.message);
  process.exit(1);
} else {
  console.log('✅ Tabela criada e acessível!');
}

process.exit(0);
