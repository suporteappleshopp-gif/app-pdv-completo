import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase ADMINISTRATIVO com SERVICE_ROLE_KEY
 *
 * ⚠️ IMPORTANTE: Apenas para operações que requerem privilégios de admin
 * - Criar/atualizar/deletar operadores (bypassa RLS)
 * - Operações sensíveis de banco de dados
 *
 * NÃO usar para operações normais de usuário!
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('⚠️ Supabase Admin Client: Variáveis de ambiente não configuradas');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Função helper para verificar se o admin client está configurado
export const isAdminClientConfigured = (): boolean => {
  return !!(supabaseUrl && serviceRoleKey && supabaseUrl.startsWith('https://'));
};
