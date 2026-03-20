-- Corrigir tabela empresas: adicionar policies RLS e remover dependência de user_id obrigatório

-- Desabilitar RLS temporariamente para ajustar
-- Criar policies para que o sistema PDV (sem autenticação) possa operar

-- Policy: permitir SELECT sem autenticação (sistema PDV local)
CREATE POLICY "allow_all_empresas_select"
ON public.empresas FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: permitir INSERT sem autenticação
CREATE POLICY "allow_all_empresas_insert"
ON public.empresas FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: permitir UPDATE sem autenticação
CREATE POLICY "allow_all_empresas_update"
ON public.empresas FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy: permitir DELETE sem autenticação
CREATE POLICY "allow_all_empresas_delete"
ON public.empresas FOR DELETE
TO anon, authenticated
USING (true);

-- Tornar user_id opcional na tabela empresas (já é nullable, mas garantir)
ALTER TABLE public.empresas ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.empresas ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE public.empresas ALTER COLUMN cnpj DROP NOT NULL;

-- Criar tabela config_nfce para armazenar configurações de NFC-e
CREATE TABLE IF NOT EXISTS public.config_nfce (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  serie_nfce TEXT NOT NULL DEFAULT '1',
  proximo_numero INTEGER NOT NULL DEFAULT 1,
  token_csc TEXT,
  id_csc TEXT,
  regime_tributario TEXT NOT NULL DEFAULT 'simples',
  aliquota_icms_padrao DECIMAL(5,2) NOT NULL DEFAULT 0,
  aliquota_pis_padrao DECIMAL(5,2) NOT NULL DEFAULT 0,
  aliquota_cofins_padrao DECIMAL(5,2) NOT NULL DEFAULT 0,
  cfop_padrao TEXT NOT NULL DEFAULT '5102',
  mensagem_nota TEXT,
  -- Campos para NFC-e Mato Grosso / Certificado A1 e Pagamento
  certificado_a1_base64 TEXT,
  certificado_a1_senha TEXT,
  cnpj_credenciadora TEXT,
  codigo_autorizacao_pagamento TEXT,
  tls_version TEXT DEFAULT '1.2',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.config_nfce ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para o sistema PDV
CREATE POLICY "allow_all_config_nfce_select"
ON public.config_nfce FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "allow_all_config_nfce_insert"
ON public.config_nfce FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "allow_all_config_nfce_update"
ON public.config_nfce FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_config_nfce_delete"
ON public.config_nfce FOR DELETE
TO anon, authenticated
USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER config_nfce_updated_at
  BEFORE UPDATE ON public.config_nfce
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
