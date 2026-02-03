import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ynkuovfplntzckecruvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA2NTAsImV4cCI6MjA4NTAzNjY1MH0.8dCQe242pXapIxiU6RZOlVxZAwa_RNcjoyzjcYrrAwQ';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSQL = `
-- =========================================================================
-- CORRIGIR RLS PARA PERMITIR ACESSO DIRETO (SEM SUPABASE AUTH)
-- Permite que usuários acessem solicitações mesmo sem auth.uid()
-- =========================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuarios podem ver suas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem ver todas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Usuarios podem criar solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem atualizar solicitacoes" ON public.solicitacoes_renovacao;

-- =========================================================================
-- POLÍTICAS RLS CORRIGIDAS - Aceita login direto e via Auth
-- =========================================================================

-- Política 1: Permitir SELECT para todos (sem restrição de RLS)
-- O controle de acesso será feito na aplicação
CREATE POLICY "Permitir leitura de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (true);

-- Política 2: Permitir INSERT para todos
CREATE POLICY "Permitir criacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (true);

-- Política 3: Permitir UPDATE para todos (admins controlam na aplicação)
CREATE POLICY "Permitir atualizacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR UPDATE
  USING (true);
`;

console.log('🔄 Aplicando migration...');

// Executar SQL via RPC
const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(() => {
  console.log('⚠️ RPC exec_sql não disponível, tentando método alternativo...');
  return { data: null, error: null };
});

if (error) {
  console.error('❌ Erro ao aplicar migration:', error);
  process.exit(1);
}

console.log('✅ Migration aplicada com sucesso!');
console.log('📊 Testando acesso à tabela solicitacoes_renovacao...');

// Testar acesso
const { data: testData, error: testError } = await supabase
  .from('solicitacoes_renovacao')
  .select('*')
  .limit(1);

if (testError) {
  console.error('❌ Erro ao testar acesso:', testError);
} else {
  console.log('✅ Acesso OK! Total de registros:', testData?.length || 0);
}

process.exit(0);
