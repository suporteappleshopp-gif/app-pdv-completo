/**
 * Proteção de rotas de usuário
 * CRÍTICO: Bloqueia admin de acessar páginas de usuário comum
 */

import { AuthSupabase } from "./auth-supabase";

export async function protectUserRoute(router: any): Promise<{
  operador: any | null;
  blocked: boolean;
}> {
  try {
    const operador = await AuthSupabase.getCurrentOperador();

    if (!operador) {
      console.error("❌ Operador não encontrado - redirecionando para login");
      router.push("/");
      return { operador: null, blocked: true };
    }

    // 🔒 CRÍTICO: BLOQUEAR ADMIN DE ACESSAR PÁGINAS DE USUÁRIO
    if (operador.isAdmin) {
      console.error("❌ ADMIN tentando acessar área de usuário - redirecionando para painel admin");
      router.push("/admin");
      return { operador: null, blocked: true };
    }

    console.log("✅ Operador autorizado:", operador.email);
    return { operador, blocked: false };
  } catch (error) {
    console.error("❌ Erro na verificação de autenticação:", error);
    router.push("/");
    return { operador: null, blocked: true };
  }
}
