-- Alterar tipo da coluna id em empresas para TEXT (sistema usa ids como "empresa-1")
ALTER TABLE public.empresas ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Alterar tipo da coluna id em config_nfce (já é TEXT, confirmar)
-- config_nfce.id já é TEXT, OK

-- Adicionar default para created_at se não existir
ALTER TABLE public.empresas ALTER COLUMN created_at SET DEFAULT NOW();
