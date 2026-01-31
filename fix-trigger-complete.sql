-- PASSO 1: Remover trigger antigo que está causando erro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- PASSO 2: Tornar coluna senha opcional
ALTER TABLE public.operadores ALTER COLUMN senha DROP NOT NULL;

-- PASSO 3: Garantir que ID tem valor padrão
ALTER TABLE public.operadores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- PASSO 4: Criar função corrigida (sem conflitos)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  usuario_existente UUID;
BEGIN
  -- Verificar se já existe um operador com este email ou auth_user_id
  SELECT id INTO usuario_existente
  FROM public.operadores
  WHERE email = NEW.email OR auth_user_id = NEW.id
  LIMIT 1;

  -- Se não existir, criar novo operador
  IF usuario_existente IS NULL THEN
    INSERT INTO public.operadores (
      auth_user_id,
      nome,
      email,
      senha,
      ativo,
      suspenso,
      aguardando_pagamento
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
      NEW.email,
      NULL,
      false,
      true,
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se der erro, logar mas não bloquear criação do usuário
    RAISE WARNING 'Erro ao criar operador: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 5: Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASSO 6: Atualizar operadores existentes sem auth_user_id
UPDATE public.operadores o
SET auth_user_id = u.id
FROM auth.users u
WHERE o.email = u.email
  AND o.auth_user_id IS NULL
  AND u.id IS NOT NULL;
