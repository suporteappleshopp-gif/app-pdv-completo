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
      console.log("🔐 Tentando fazer login com email:", email);

      // OBRIGATÓRIO: Verificar se Supabase está configurado
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

      if (!supabaseConfigured) {
        // PROIBIDO: Modo local desabilitado - apenas Supabase
        console.error("❌ Supabase não configurado - login bloqueado");
        return {
          success: false,
          error: "Sistema requer conexão com a nuvem. Configure o Supabase para continuar.",
        };
      }

      // Tentar fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Se o Auth funcionou, usar o fluxo normal
      if (!authError && authData.user) {
        console.log("✅ Login no Auth bem-sucedido. User ID:", authData.user.id);

        // Buscar dados do operador
        const { data: operadorData, error: operadorError } = await supabase
          .from("operadores")
          .select("*")
          .eq("auth_user_id", authData.user.id)
          .single();

        if (!operadorError && operadorData) {
          console.log("✅ Operador encontrado:", {
            id: operadorData.id,
            nome: operadorData.nome,
            email: operadorData.email,
            is_admin: operadorData.is_admin,
            ativo: operadorData.ativo,
          });

          // Verificar se o operador está ativo (admins sempre podem logar)
          if (!operadorData.ativo && !operadorData.is_admin) {
            console.warn("⚠️ Operador inativo e não é admin");
            return {
              success: false,
              error: "Sua conta está suspensa. Entre em contato com o administrador.",
            };
          }

          // Montar objeto Operador com TODOS os campos
          const operador: Operador = {
            id: operadorData.id,
            nome: operadorData.nome,
            email: operadorData.email,
            senha: "", // Não retornar senha por segurança
            isAdmin: operadorData.is_admin || false,
            ativo: operadorData.ativo || false,
            suspenso: operadorData.suspenso || false,
            aguardandoPagamento: operadorData.aguardando_pagamento || false,
            createdAt: new Date(operadorData.created_at),
            formaPagamento: operadorData.forma_pagamento || undefined,
            valorMensal: operadorData.valor_mensal || undefined,
            dataProximoVencimento: operadorData.data_proximo_vencimento ? new Date(operadorData.data_proximo_vencimento) : undefined,
            diasAssinatura: operadorData.dias_assinatura || undefined,
            dataPagamento: operadorData.data_pagamento ? new Date(operadorData.data_pagamento) : undefined,
          };

          console.log("✅ Login bem-sucedido! Operador:", operador.nome, "| Admin:", operador.isAdmin);

          return {
            success: true,
            operador,
          };
        }
      }

      // Se Auth falhou ou operador não foi encontrado, tentar login direto no banco
      console.log("⚠️ Tentando login direto no banco de dados...");

      const { data: operadorDirectData, error: directError } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (directError || !operadorDirectData) {
        console.error("❌ Erro ao buscar operador no banco:", directError?.message);
        return {
          success: false,
          error: "Email ou senha incorretos",
        };
      }

      // Verificar senha (para operadores sem Auth)
      if (operadorDirectData.senha && operadorDirectData.senha === password) {
        console.log("✅ Login direto bem-sucedido:", operadorDirectData.email);

        // Verificar se o operador está ativo (admins sempre podem logar)
        if (!operadorDirectData.ativo && !operadorDirectData.is_admin) {
          console.warn("⚠️ Operador inativo e não é admin");
          return {
            success: false,
            error: "Sua conta está suspensa. Entre em contato com o administrador.",
          };
        }

        const operador: Operador = {
          id: operadorDirectData.id,
          nome: operadorDirectData.nome,
          email: operadorDirectData.email,
          senha: "",
          isAdmin: operadorDirectData.is_admin || false,
          ativo: operadorDirectData.ativo || false,
          suspenso: operadorDirectData.suspenso || false,
          aguardandoPagamento: operadorDirectData.aguardando_pagamento || false,
          createdAt: new Date(operadorDirectData.created_at),
          formaPagamento: operadorDirectData.forma_pagamento || undefined,
          valorMensal: operadorDirectData.valor_mensal || undefined,
          dataProximoVencimento: operadorDirectData.data_proximo_vencimento ? new Date(operadorDirectData.data_proximo_vencimento) : undefined,
          diasAssinatura: operadorDirectData.dias_assinatura || undefined,
          dataPagamento: operadorDirectData.data_pagamento ? new Date(operadorDirectData.data_pagamento) : undefined,
        };

        // Criar sessão temporária no localStorage (já que não temos Auth)
        if (typeof window !== 'undefined') {
          localStorage.setItem('operador_session', JSON.stringify(operador));
        }

        return {
          success: true,
          operador,
        };
      }

      console.error("❌ Senha incorreta para login direto");
      return {
        success: false,
        error: "Email ou senha incorretos",
      };
    } catch (error: any) {
      console.error("❌ Erro no login:", error);
      return {
        success: false,
        error: "Erro ao conectar com o servidor: " + (error?.message || "Erro desconhecido"),
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
          data: {
            nome,
          },
          emailRedirectTo: undefined, // Sem confirmação de email por enquanto
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
        return {
          success: false,
          error: "Erro ao criar conta",
        };
      }

      console.log("✅ Usuário criado no Auth:", authData.user.id);

      // PASSO 2: Criar operador manualmente (sem trigger)
      const { data: operadorData, error: insertError } = await supabase
        .from("operadores")
        .insert({
          auth_user_id: authData.user.id,
          nome: nome,
          email: email,
          senha: null, // Senha gerenciada pelo Auth
          ativo: false,
          suspenso: true,
          aguardando_pagamento: true,
          is_admin: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao criar operador:", insertError.message);

        // Se falhou ao criar operador, deletar usuário do Auth para manter consistência
        await supabase.auth.admin.deleteUser(authData.user.id);

        return {
          success: false,
          error: "Erro ao criar perfil de operador. Tente novamente.",
        };
      }

      console.log("✅ Operador criado:", operadorData.id);

      const operador: Operador = {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        senha: "",
        isAdmin: false,
        ativo: false,
        suspenso: true,
        aguardandoPagamento: true,
        createdAt: new Date(operadorData.created_at),
      };

      return {
        success: true,
        operador,
      };
    } catch (error: any) {
      console.error("❌ Erro no cadastro:", error);
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
    // Limpar também a sessão do localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('operador_session');
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

      // PRIMEIRO: Tentar buscar do localStorage (login direto - mais rápido)
      if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('operador_session');
        if (sessionStr) {
          try {
            const operador = JSON.parse(sessionStr);
            console.log("✅ Operador encontrado no localStorage:", operador.email);
            return {
              ...operador,
              createdAt: new Date(operador.createdAt),
              dataProximoVencimento: operador.dataProximoVencimento ? new Date(operador.dataProximoVencimento) : undefined,
              dataPagamento: operador.dataPagamento ? new Date(operador.dataPagamento) : undefined,
            };
          } catch (e) {
            console.warn("⚠️ Erro ao parsear sessão do localStorage:", e);
          }
        }
      }

      // SEGUNDO: Tentar buscar do Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log("🔍 Usuário Auth encontrado:", user.id);

        // Buscar apenas campos básicos (SEMPRE existem)
        const { data: operadorData, error } = await supabase
          .from("operadores")
          .select("id, nome, email, senha, is_admin, ativo, suspenso, aguardando_pagamento, created_at")
          .eq("auth_user_id", user.id)
          .single();

        if (error) {
          console.error("❌ Erro ao buscar operador por auth_user_id:", error);
          return null;
        }

        if (!operadorData) {
          console.warn("⚠️ Operador não encontrado no banco para auth_user_id:", user.id);
          return null;
        }

        console.log("✅ Operador encontrado no Supabase:", operadorData.email);

        const operador: Operador = {
          id: operadorData.id,
          nome: operadorData.nome,
          email: operadorData.email,
          senha: "",
          isAdmin: operadorData.is_admin || false,
          ativo: operadorData.ativo || false,
          suspenso: operadorData.suspenso || false,
          aguardandoPagamento: operadorData.aguardando_pagamento || false,
          createdAt: new Date(operadorData.created_at),
        };

        // Tentar buscar campos extras (podem não existir)
        try {
          const { data: extrasData } = await supabase
            .from("operadores")
            .select("forma_pagamento, valor_mensal, data_proximo_vencimento, dias_assinatura, data_pagamento")
            .eq("auth_user_id", user.id)
            .single();

          if (extrasData) {
            operador.formaPagamento = extrasData.forma_pagamento || undefined;
            operador.valorMensal = extrasData.valor_mensal || undefined;
            operador.dataProximoVencimento = extrasData.data_proximo_vencimento ? new Date(extrasData.data_proximo_vencimento) : undefined;
            operador.diasAssinatura = extrasData.dias_assinatura || undefined;
            operador.dataPagamento = extrasData.data_pagamento ? new Date(extrasData.data_pagamento) : undefined;
          }
        } catch (extrasError) {
          // Campos extras não existem - continuar sem eles
          console.log("⚠️ Campos extras não disponíveis");
        }

        return operador;
      }

      console.warn("⚠️ Nenhum usuário Auth encontrado");
      return null;
    } catch (error) {
      console.error("❌ Erro ao buscar operador:", error);

      // Fallback final: tentar localStorage novamente
      if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('operador_session');
        if (sessionStr) {
          try {
            const operador = JSON.parse(sessionStr);
            console.log("✅ Usando sessão do localStorage como fallback:", operador.email);
            return {
              ...operador,
              createdAt: new Date(operador.createdAt),
              dataProximoVencimento: operador.dataProximoVencimento ? new Date(operador.dataProximoVencimento) : undefined,
              dataPagamento: operador.dataPagamento ? new Date(operador.dataPagamento) : undefined,
            };
          } catch (e) {
            console.error("❌ Erro ao usar fallback do localStorage:", e);
          }
        }
      }

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
