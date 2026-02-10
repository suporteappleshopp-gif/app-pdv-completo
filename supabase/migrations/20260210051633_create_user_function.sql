-- Criar função que permite criar usuário completo manualmente (via service_role)
-- Esta função bypassa o trigger automático e cria tudo de uma vez

CREATE OR REPLACE FUNCTION criar_usuario_manual(
  p_email TEXT,
  p_senha TEXT,
  p_nome TEXT
)
RETURNS TABLE (
  user_id UUID,
  operador_id UUID,
  mensagem TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_operador_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Gerar UUID para o usuário
  v_user_id := gen_random_uuid();

  -- Hash da senha (simples, o ideal é usar crypt do pgcrypto)
  -- Por segurança, vamos apenas aceitar e o Supabase Auth vai gerenciar
  v_encrypted_password := crypt(p_senha, gen_salt('bf'));

  -- Inserir no auth.users (desabilitando trigger temporariamente)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::UUID,
    p_email,
    v_encrypted_password,
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    jsonb_build_object('nome', p_nome),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Inserir operador
  INSERT INTO operadores (
    id,
    auth_user_id,
    nome,
    email,
    is_admin,
    ativo,
    suspenso,
    aguardando_pagamento
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    p_nome,
    p_email,
    false,
    false,
    true,
    true
  )
  RETURNING id INTO v_operador_id;

  RETURN QUERY SELECT
    v_user_id,
    v_operador_id,
    'Usuário criado com sucesso'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
END;
$$;

-- Permitir execução via service_role
GRANT EXECUTE ON FUNCTION criar_usuario_manual TO service_role;
