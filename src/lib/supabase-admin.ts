import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase ADMINISTRATIVO com SERVICE_ROLE_KEY
 *
 * ⚠️ CRÍTICO: Este arquivo só pode ser usado em CONTEXTOS DE SERVIDOR (API routes, Server Components)
 * NUNCA importar em componentes client-side (arquivos com "use client")
 *
 * Para operações admin no cliente, use API routes que chamam este módulo.
 */

// Verificar se estamos no servidor (Node.js)
const isServer = typeof window === 'undefined';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// No cliente, não criar o admin client
if (!isServer) {
  console.warn('⚠️ supabase-admin.ts: Este módulo deve ser usado apenas no servidor!');
}

// Fallback seguro: usar ANON_KEY se SERVICE_ROLE_KEY não estiver disponível
const clientKey = serviceRoleKey || process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, clientKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Função helper para verificar se o admin client está configurado corretamente
export const isAdminClientConfigured = (): boolean => {
  return !!(supabaseUrl && serviceRoleKey && supabaseUrl.startsWith('https://'));
};

// Verificar se temos a SERVICE_ROLE_KEY
export const hasServiceRoleKey = (): boolean => {
  return !!serviceRoleKey;
};
