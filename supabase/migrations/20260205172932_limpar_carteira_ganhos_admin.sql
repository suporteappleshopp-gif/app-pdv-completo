-- =========================================================================
-- LIMPAR CARTEIRA DE GANHOS DO ADMIN
-- Remove todos os registros da tabela ganhos_admin para começar do zero
-- =========================================================================

-- Deletar todos os registros da tabela ganhos_admin
DELETE FROM ganhos_admin;

-- Log de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ Carteira de ganhos limpa com sucesso! Pronta para começar do zero.';
END $$;

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
