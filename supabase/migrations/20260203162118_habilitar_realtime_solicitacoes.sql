-- =========================================================================
-- HABILITAR REALTIME PARA SOLICITAÇÕES DE RENOVAÇÃO
-- Permite que admins e usuários vejam atualizações em tempo real
-- =========================================================================

-- Habilitar publicação da tabela no Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_renovacao;

-- Comentário
COMMENT ON TABLE public.solicitacoes_renovacao IS 'Solicitações de renovação com suporte a tempo real';

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
