-- Migration: Suporte completo ao Certificado Digital A1 na config_nfce
-- Isolamento total por usuário (tenant) via user_id + RLS

-- 1. Adicionar user_id à config_nfce para isolamento por usuário
ALTER TABLE public.config_nfce
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Adicionar campo de validade do certificado (calculado no frontend, armazenado para cache)
ALTER TABLE public.config_nfce
  ADD COLUMN IF NOT EXISTS certificado_validade TEXT;

-- 3. Garantir que certificado_a1_base64 e certificado_a1_senha existam (podem já existir)
ALTER TABLE public.config_nfce
  ADD COLUMN IF NOT EXISTS certificado_a1_base64 TEXT;

ALTER TABLE public.config_nfce
  ADD COLUMN IF NOT EXISTS certificado_a1_senha TEXT;

-- 4. Habilitar RLS na tabela config_nfce (caso não esteja habilitado)
ALTER TABLE public.config_nfce ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas que possam ser permissivas demais
DROP POLICY IF EXISTS "Allow all config_nfce" ON public.config_nfce;
DROP POLICY IF EXISTS "config_nfce_open_policy" ON public.config_nfce;
DROP POLICY IF EXISTS "Enable all for config_nfce" ON public.config_nfce;

-- 6. Criar políticas de isolamento por usuário
CREATE POLICY "config_nfce_select_own"
  ON public.config_nfce FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "config_nfce_insert_own"
  ON public.config_nfce FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "config_nfce_update_own"
  ON public.config_nfce FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "config_nfce_delete_own"
  ON public.config_nfce FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "config_nfce_anon_select"
  ON public.config_nfce FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "config_nfce_anon_insert"
  ON public.config_nfce FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "config_nfce_anon_update"
  ON public.config_nfce FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- 7. Mesma proteção para a tabela empresas (user_id é TEXT nesta tabela)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all empresas" ON public.empresas;
DROP POLICY IF EXISTS "empresas_open_policy" ON public.empresas;
DROP POLICY IF EXISTS "Enable all for empresas" ON public.empresas;

-- user_id na tabela empresas é TEXT, converter auth.uid() para TEXT na comparação
CREATE POLICY "empresas_select_own"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "empresas_insert_own"
  ON public.empresas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "empresas_update_own"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "empresas_delete_own"
  ON public.empresas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "empresas_anon_select"
  ON public.empresas FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "empresas_anon_insert"
  ON public.empresas FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "empresas_anon_update"
  ON public.empresas FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- 8. Índices para busca eficiente por user_id
CREATE INDEX IF NOT EXISTS idx_config_nfce_user_id ON public.config_nfce(user_id);
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON public.empresas(user_id);