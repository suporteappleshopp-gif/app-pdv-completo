-- Corrigir função do trigger para usar apenas colunas que existem na tabela
CREATE OR REPLACE FUNCTION public.criar_operador_automatico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Verificar se já existe operador com este auth_user_id
  IF NOT EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = NEW.id) THEN
    INSERT INTO operadores (
      auth_user_id,
      nome,
      email,
      is_admin,
      ativo,
      suspenso,
      aguardando_pagamento
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
      NEW.email,
      false,      -- Não é admin
      false,      -- Inativo até aprovação
      true,       -- Suspenso até pagamento
      true        -- Aguardando pagamento
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Comentário
COMMENT ON FUNCTION criar_operador_automatico() IS
'Cria automaticamente um registro na tabela operadores quando um novo usuário é criado no Auth.';
