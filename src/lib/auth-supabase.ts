import { supabase } from "./supabase";
import { Operador } from "./types";

/**
 * Biblioteca de autenticação com Supabase
 * Gerencia login, registro e sessão de usuários
 */
export class AuthSupabase {
  /**
   * Fazer login com email e senha
   */
  static async signIn(email: string, password: string): Promise<{
    success: boolean;
    operador?: Operador;
    error?: string;
  }> {
    try {
      // Tentar fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return {
          success: false,
          error: "Email ou senha incorretos",
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: "Erro ao fazer login",
        };
      }

      // Buscar dados do operador
      const { data: operadorData, error: operadorError } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (operadorError || !operadorData) {
        return {
          success: false,
          error: "Usuário não encontrado no sistema",
        };
      }

      // Verificar se o operador está ativo
      if (!operadorData.ativo && !operadorData.is_admin) {
        return {
          success: false,
          error: "Sua conta está suspensa. Entre em contato com o administrador.",
        };
      }

      // Montar objeto Operador
      const operador: Operador = {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "", // Não retornar senha por segurança
        isAdmin: operadorData.is_admin,
        ativo: operadorData.ativo,
        suspenso: operadorData.suspenso,
        aguardandoPagamento: operadorData.aguardando_pagamento,
        formaPagamento: operadorData.forma_pagamento,
        valorMensal: operadorData.valor_mensal,
        diasAssinatura: operadorData.dias_assinatura,
        dataProximoVencimento: operadorData.data_proximo_vencimento
          ? new Date(operadorData.data_proximo_vencimento)
          : undefined,
        dataPagamento: operadorData.data_pagamento
          ? new Date(operadorData.data_pagamento)
          : undefined,
        createdAt: new Date(operadorData.created_at),
      };

      return {
        success: true,
        operador,
      };
    } catch (error) {
      console.error("Erro no login:", error);
      return {
        success: false,
        error: "Erro ao conectar com o servidor",
      };
    }
  }

  /**
   * Registrar novo usuário
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
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
          },
        },
      });

      if (authError) {
        return {
          success: false,
          error: authError.message || "Erro ao criar conta",
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: "Erro ao criar conta",
        };
      }

      // Calcular valores baseado na forma de pagamento
      const valorPagamento = formaPagamento === "pix" ? 59.90 : 149.70;
      const diasAcesso = formaPagamento === "pix" ? 100 : 365;
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + diasAcesso);

      // Atualizar operador criado automaticamente pelo trigger
      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          forma_pagamento: formaPagamento,
          valor_mensal: valorPagamento,
          dias_assinatura: diasAcesso,
          data_proximo_vencimento: dataVencimento.toISOString(),
          ativo: false, // Inicia desativado até pagamento
          suspenso: true,
          aguardando_pagamento: true,
        })
        .eq("auth_user_id", authData.user.id);

      if (updateError) {
        console.error("Erro ao atualizar operador:", updateError);
      }

      // Buscar operador atualizado
      const { data: operadorData } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      const operador: Operador = {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "",
        isAdmin: false,
        ativo: false,
        suspenso: true,
        aguardandoPagamento: true,
        formaPagamento,
        valorMensal: valorPagamento,
        diasAssinatura: diasAcesso,
        dataProximoVencimento: dataVencimento,
        createdAt: new Date(operadorData.created_at),
      };

      return {
        success: true,
        operador,
      };
    } catch (error) {
      console.error("Erro no cadastro:", error);
      return {
        success: false,
        error: "Erro ao criar conta. Tente novamente.",
      };
    }
  }

  /**
   * Fazer logout
   */
  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: operadorData, error } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !operadorData) {
        return null;
      }

      return {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "",
        isAdmin: operadorData.is_admin,
        ativo: operadorData.ativo,
        suspenso: operadorData.suspenso,
        aguardandoPagamento: operadorData.aguardando_pagamento,
        formaPagamento: operadorData.forma_pagamento,
        valorMensal: operadorData.valor_mensal,
        diasAssinatura: operadorData.dias_assinatura,
        dataProximoVencimento: operadorData.data_proximo_vencimento
          ? new Date(operadorData.data_proximo_vencimento)
          : undefined,
        dataPagamento: operadorData.data_pagamento
          ? new Date(operadorData.data_pagamento)
          : undefined,
        createdAt: new Date(operadorData.created_at),
      };
    } catch (error) {
      console.error("Erro ao buscar operador:", error);
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
   * Nome será extraído automaticamente do email
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
      // Verificar se quem está criando é admin
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        return {
          success: false,
          error: "Apenas administradores podem criar usuários sem mensalidade",
        };
      }

      // Extrair nome do email (parte antes do @)
      const nome = email.split("@")[0];

      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
          },
        },
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: authError?.message || "Erro ao criar usuário",
        };
      }

      // Aguardar um pouco para o trigger criar o operador
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar operador para ter acesso livre
      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: null, // Sem forma de pagamento = acesso livre
          valor_mensal: null,
          dias_assinatura: null,
          data_proximo_vencimento: null,
        })
        .eq("auth_user_id", authData.user.id);

      if (updateError) {
        console.error("Erro ao atualizar operador:", updateError);
        return {
          success: false,
          error: "Erro ao configurar usuário",
        };
      }

      // Buscar operador criado
      const { data: operadorData } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      const operador: Operador = {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "",
        isAdmin: false,
        ativo: true,
        suspenso: false,
        aguardandoPagamento: false,
        createdAt: new Date(operadorData.created_at),
      };

      return {
        success: true,
        operador,
      };
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      return {
        success: false,
        error: "Erro ao criar usuário",
      };
    }
  }
}
