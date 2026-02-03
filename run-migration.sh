#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_REF="ynkuovfplntzckecruvk"
MIGRATION_FILE="supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql"

echo -e "${BLUE}🔧 Migration: Corrigir Solicitações de Renovação${NC}\n"

echo -e "${YELLOW}📋 Opções para aplicar a migration:${NC}\n"

echo -e "${GREEN}Opção 1 - Supabase Dashboard (Mais Fácil):${NC}"
echo "1. Acesse: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "2. Copie o conteúdo do arquivo: ${MIGRATION_FILE}"
echo "3. Cole no editor SQL e clique em 'Run'"
echo ""

echo -e "${GREEN}Opção 2 - Supabase CLI:${NC}"
echo "npx supabase login"
echo "npx supabase link --project-ref ${PROJECT_REF}"
echo "npx supabase db push"
echo ""

echo -e "${BLUE}📄 Conteúdo da Migration:${NC}"
echo "A migration faz o seguinte:"
echo "  • Remove a tabela solicitacoes_renovacao anterior (se existir)"
echo "  • Recria a tabela com tipos corretos (UUID para operador_id)"
echo "  • Adiciona foreign keys para operadores.id"
echo "  • Configura índices para performance"
echo "  • Habilita Row Level Security (RLS)"
echo "  • Cria políticas de acesso"
echo ""

echo -e "${YELLOW}💡 Problema Resolvido:${NC}"
echo "O erro 'foreign key constraint cannot be implemented' acontecia porque"
echo "havia incompatibilidade de tipos. A migration corrige isso garantindo"
echo "que operador_id seja UUID, compatível com operadores.id (também UUID)."
