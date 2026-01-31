-- VERIFICAR GARANTIAS DE CONTA ÚNICA

-- 1. Verificar constraint UNIQUE no email
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.operadores'::regclass
    AND contype = 'u'
    AND conname LIKE '%email%';

-- 2. Verificar constraint UNIQUE no auth_user_id
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.operadores'::regclass
    AND contype = 'u'
    AND conname LIKE '%auth_user_id%';

-- 3. Verificar foreign key com auth.users
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.operadores'::regclass
    AND contype = 'f';
