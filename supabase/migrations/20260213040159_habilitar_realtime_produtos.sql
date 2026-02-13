-- Habilitar realtime (sincronização em tempo real) na tabela produtos
-- Isso permite que mudanças em produtos sejam refletidas automaticamente em todos os navegadores/dispositivos

-- 1. Habilitar publicação de mudanças para a tabela produtos
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;

-- 2. Garantir que a tabela produtos permite realtime
-- Isso já deve estar habilitado, mas garantimos aqui
COMMENT ON TABLE produtos IS 'Produtos dos usuários - Realtime habilitado';
