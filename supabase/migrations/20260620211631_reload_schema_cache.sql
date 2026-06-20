-- Forçar reload do schema cache do PostgREST
-- Necessário após adicionar colunas para que a API reconheça imediatamente
NOTIFY pgrst, 'reload schema';