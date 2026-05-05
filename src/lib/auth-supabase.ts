import { supabase } from "./supabase";
import { Operador } from "./types";

/**
 * Biblioteca de autenticação com Supabase
 * O login usa API Route server-side para contornar restrições de RLS no browser
 */
export class AuthSupabase {
  /**
   * Fazer login com email e senha via API Route (server-side)
   */
  static async signIn(email: string, password: string): Promise<{
    success: boolean;
    operador?: Operador;
    error?: string;
  }> {
    try {
      console.log("🔐 Tentando fazer login com email:", email);

      // Usar API Route server-side para evitar problemas de RLS/CORS no browser
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("❌ Login falhou:", result.error);
        return { success: false, error: result.error || "Email ou senha incorretos" };
      }

      console.log("✅ Login bem-sucedido:", result.operador.nome);

      const opData = result.operador;
      const operador: Operador = {
        id: opData.id,
        nome: opData.nome,
        email: opData.email,
        senha: "",
        isAdmin: opData.isAdmin || false,
        ativo: opData.ativo || false,
        suspenso: opData.suspenso || false,
        aguardandoPagamento: opData.aguardandoPagamento || false,
        createdAt: new Date(opData.createdAt),
        formaPagamento: opData.formaPagamento || undefined,
        valorMensal: opData.valorMensal || undefined,
        dataProximoVencimento: opData.dataProximoVencimento ? new Date(opData.dataProximoVencimento) : undefined,
        diasAssinatura: opData.diasAssinatura || undefined,
        dataPagamento: opData.dataPagamento ? new Date(opData.dataPagamento) : undefined,
      };

      // Salvar sessão no localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("operador_session", JSON.stringify(operador));
      }

      // Se tiver sessão do Supabase Auth, persistir no cliente também
      if (result.session) {
        await supabase.auth.setSession(result.session);
      }

      return { success: true, operador };
    } catch (error: any) {
      console.error("❌ Erro no login:", error);
      return {
        success: false,
        error: "Erro ao conectar com o servidor. Tente novamente.",
      };
    }
  }

  /**
   * Registrar novo usuário com email e senha segura
   */
  static async signUp(
    email: string,
    password: string,
    nome: string,
    formaPagamento: "pix" | "cartao"
  ): Promise<{
    success: boolean;
    operador?: Operador;
    error?: string;
  }> {
    try {
      console.log("📝 Criando conta com email e senha:", email);

      // PASSO 1: Criar usuário no Supabase Auth (email + senha)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome },
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        console.error("❌ Erro ao criar usuário no Auth:", authError.message);
        return {
          success: false,
          error: authError.message || "Erro ao criar conta",
        };
      }

      if (!authData.user) {
        console.error("❌ Nenhum usuário foi criado");
        return { success: false, error: "Erro ao criar conta" };
      }

      console.log("✅ Usuário criado no Auth:", authData.user.id);

      // PASSO 2: Criar operador via API Route para garantir acesso com service role
      const response = await fetch("/api/admin/operadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nome,
          formaPagamento,
          // Já criamos no Auth acima, então passamos o auth_user_id
          _auth_user_id: authData.user.id,
          _skip_auth_creation: true,
        }),
      });

      // Se a API falhou, tentar inserir direto
      let operadorData: any = null;
      if (!response.ok) {
        const { error: insertError, data } = await supabase
          .from("operadores")
          .insert({
            auth_user_id: authData.user.id,
            nome,
            email,
            senha: null,
            ativo: false,
            suspenso: true,
            aguardando_pagamento: true,
            is_admin: false,
            dias_restantes: 0,
            total_dias_comprados: 0,
            forma_pagamento: formaPagamento,
          })
          .select()
          .single();

        if (insertError) {
          console.error("❌ Erro ao criar operador:", insertError.message);
          return {
            success: false,
            error: "Erro ao criar perfil de operador. Tente novamente.",
          };
        }
        operadorData = data;
      } else {
        const result = await response.json();
        operadorData = result.operador;
      }

      const operador: Operador = {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "",
        isAdmin: false,
        ativo: false,
        suspenso: true,
        aguardandoPagamento: true,
        createdAt: new Date(operadorData.createdAt || operadorData.created_at),
        diasRestantes: 0,
        totalDiasComprados: 0,
        formaPagamento: formaPagamento,
      };

      return { success: true, operador };
    } catch (error: any) {
      console.error("❌ Erro no cadastro:", error);
      return { success: false, error: "Erro ao criar conta. Tente novamente." };
    }
  }

  /**
   * Fazer logout
   */
  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("operador_session");
    }
  }

  /**
   * Obter sessão atual
   */
  static async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Obter operador logado
   */
  static async getCurrentOperador(): Promise<Operador | null> {
    try {
      console.log("🔍 Buscando operador atual...");

      // Verificar se há sessão no localStorage
      let emailParaBuscar: string | null = null;
      if (typeof window !== "undefined") {
        const sessionStr = localStorage.getItem("operador_session");
        if (sessionStr) {
          try {
            const operador = JSON.parse(sessionStr);
            emailParaBuscar = operador.email;
          } catch (e) {
            console.warn("⚠️ Erro ao parsear sessão:", e);
          }
        }
      }

      if (!emailParaBuscar) {
        // Tentar pelo Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) emailParaBuscar = user.email;
      }

      if (!emailParaBuscar) {
        console.warn("⚠️ Nenhuma sessão encontrada");
        return null;
      }

      // Buscar dados atualizados via API Route
      const response = await fetch("/api/admin/operadores");
      if (!response.ok) {
        // Fallback: usar dados do localStorage
        if (typeof window !== "undefined") {
          const sessionStr = localStorage.getItem("operador_session");
          if (sessionStr) {
            const opData = JSON.parse(sessionStr);
            return {
              ...opData,
              createdAt: new Date(opData.createdAt),
              dataProximoVencimento: opData.dataProximoVencimento ? new Date(opData.dataProximoVencimento) : undefined,
              dataPagamento: opData.dataPagamento ? new Date(opData.dataPagamento) : undefined,
            };
          }
        }
        return null;
      }

      const result = await response.json();
      if (!result.success) return null;

      // Encontrar o operador pelo email
      const opData = result.operadores.find((op: any) => op.email === emailParaBuscar);
      if (!opData) {
        console.warn("⚠️ Operador não encontrado:", emailParaBuscar);
        return null;
      }

      const operador: Operador = {
        id: opData.id,
        nome: opData.nome,
        email: opData.email,
        senha: "",
        isAdmin: opData.isAdmin || false,
        ativo: opData.ativo || false,
        suspenso: opData.suspenso || false,
        aguardandoPagamento: opData.aguardandoPagamento || false,
        createdAt: new Date(opData.createdAt),
        formaPagamento: opData.formaPagamento || undefined,
        valorMensal: opData.valorMensal || undefined,
        dataProximoVencimento: opData.dataProximoVencimento ? new Date(opData.dataProximoVencimento) : undefined,
        diasAssinatura: opData.diasAssinatura || undefined,
        dataPagamento: opData.dataPagamento ? new Date(opData.dataPagamento) : undefined,
      };

      // Atualizar localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("operador_session", JSON.stringify(operador));
      }

      return operador;
    } catch (error) {
      console.error("❌ Erro ao buscar operador:", error);
      return null;
    }
  }

  /**
   * Verificar se usuário é admin
   */
  static async isAdmin(): Promise<boolean> {
    const operador = await this.getCurrentOperador();
    return operador?.isAdmin || false;
  }

  /**
   * Criar usuário sem mensalidade (apenas admin)
   */
  static async createUserWithoutSubscription(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    operador?: Operador;
    error?: string;
  }> {
    try {
      const response = await fetch("/api/admin/operadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const opData = result.operador;
      const operador: Operador = {
        id: opData.id,
        nome: opData.nome,
        email: opData.email,
        senha: "",
        isAdmin: false,
        ativo: opData.ativo || true,
        suspenso: opData.suspenso || false,
        aguardandoPagamento: opData.aguardandoPagamento || false,
        createdAt: new Date(opData.createdAt),
      };

      return { success: true, operador };
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      return { success: false, error: "Erro ao criar usuário" };
    }
  }
}
