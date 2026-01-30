import { supabase } from "./supabase";
import { differenceInDays } from "date-fns";
import { AdminSupabase } from "./admin-supabase";

export interface Assinatura {
  id: string;
  user_id: string;
  status: "ativo" | "pendente" | "suspenso" | "cancelado";
  tipo_plano: "mensal" | "trimestral";
  data_inicio: Date | null;
  data_vencimento: Date | null;
  dias_restantes: number;
  created_at: Date;
  updated_at: Date;
}

export interface Pagamento {
  id: string;
  assinatura_id: string;
  valor: number;
  metodo_pagamento: "cartao_credito" | "pix";
  status_pagamento: "pendente" | "aprovado" | "recusado";
  data_pagamento: Date | null;
  created_at: Date;
}

export class GerenciadorAssinatura {
  /**
   * Verifica se o usuário pode usar as funcionalidades do app
   * REGRAS CORRIGIDAS:
   * - Usuários SEM mensalidade (criados pelo admin): acesso livre e permanente
   * - Usuários COM mensalidade: verificar validade e suspender se expirado
   */
  static async verificarAcesso(userId: string): Promise<{
    podeUsar: boolean;
    status: string;
    diasRestantes: number;
    mensagem: string;
    mostrarAviso: boolean;
  }> {
    try {
      // Verificar se é usuário sem mensalidade (criado pelo admin)
      const usuarioSemMensalidade = localStorage.getItem("usuarioSemMensalidade") === "true";
      
      if (usuarioSemMensalidade) {
        // Usuário sem mensalidade - acesso livre e permanente
        return {
          podeUsar: true,
          status: "ativo",
          diasRestantes: 999999, // Número alto para indicar "sem limite"
          mensagem: "Acesso livre (sem mensalidade)",
          mostrarAviso: false,
        };
      }

      // Usuário COM mensalidade - verificar no Supabase
      const operadores = await AdminSupabase.getAllOperadores();
      const operador = operadores.find(op => op.id === userId);

      // Se não encontrou operador E a lista está vazia, liberar acesso (Supabase pode estar com problema)
      if (!operador && operadores.length === 0) {
        console.warn("⚠️ Não foi possível buscar operadores do Supabase. Liberando acesso temporariamente.");
        return {
          podeUsar: true,
          status: "ativo",
          diasRestantes: 999,
          mensagem: "Acesso liberado (modo offline)",
          mostrarAviso: false,
        };
      }

      if (!operador) {
        return {
          podeUsar: false,
          status: "pendente",
          diasRestantes: 0,
          mensagem: "Usuário não encontrado.",
          mostrarAviso: false,
        };
      }

      // Se não tem forma de pagamento definida, é usuário sem mensalidade
      if (!operador.formaPagamento) {
        return {
          podeUsar: true,
          status: "ativo",
          diasRestantes: 999999,
          mensagem: "Acesso livre (sem mensalidade)",
          mostrarAviso: false,
        };
      }

      // Verificar se está aguardando pagamento
      if (operador.aguardandoPagamento) {
        return {
          podeUsar: false,
          status: "pendente",
          diasRestantes: 0,
          mensagem: "Pagamento pendente. Entre em contato com o administrador.",
          mostrarAviso: false,
        };
      }

      // Verificar se está suspenso
      if (operador.suspenso || !operador.ativo) {
        return {
          podeUsar: false,
          status: "suspenso",
          diasRestantes: 0,
          mensagem: "Conta suspensa. Entre em contato com o administrador para renovar.",
          mostrarAviso: false,
        };
      }

      // Calcular dias restantes
      if (operador.dataProximoVencimento) {
        const hoje = new Date();
        const vencimento = new Date(operador.dataProximoVencimento);
        const diasRestantes = differenceInDays(vencimento, hoje);

        // Se expirou, suspender automaticamente
        if (diasRestantes < 0) {
          const operadorAtualizado = {
            ...operador,
            ativo: false,
            suspenso: true,
            aguardandoPagamento: true,
          };
          await AdminSupabase.updateOperador(operadorAtualizado);

          return {
            podeUsar: false,
            status: "suspenso",
            diasRestantes: 0,
            mensagem: "Sua assinatura expirou. Entre em contato com o administrador para renovar.",
            mostrarAviso: false,
          };
        }

        // Mostrar aviso se faltar 5 dias ou menos
        const mostrarAviso = diasRestantes <= 5;

        return {
          podeUsar: true,
          status: "ativo",
          diasRestantes: diasRestantes,
          mensagem: `Assinatura ativa. ${diasRestantes} dias restantes.`,
          mostrarAviso: mostrarAviso,
        };
      }

      // Usuário ativo sem data de vencimento (caso especial)
      return {
        podeUsar: true,
        status: "ativo",
        diasRestantes: 0,
        mensagem: "Assinatura ativa.",
        mostrarAviso: false,
      };
    } catch (error) {
      console.error("Erro ao verificar acesso:", error);
      return {
        podeUsar: false,
        status: "erro",
        diasRestantes: 0,
        mensagem: "Erro ao verificar assinatura.",
        mostrarAviso: false,
      };
    }
  }

  /**
   * Cria uma nova assinatura
   */
  static async criarAssinatura(
    userId: string,
    tipoPlano: "mensal" | "trimestral"
  ): Promise<Assinatura | null> {
    try {
      const { data, error } = await supabase
        .from("assinaturas")
        .insert({
          user_id: userId,
          status: "pendente",
          tipo_plano: tipoPlano,
          dias_restantes: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar assinatura:", error);
        return null;
      }

      return data as Assinatura;
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      return null;
    }
  }

  /**
   * Processar pagamento e ativar assinatura
   * PIX: R$ 59,90 - 60 dias
   * Cartão: R$ 149,70 - 180 dias
   */
  static async processarPagamento(
    assinaturaId: string,
    tipoPlano: "mensal" | "trimestral",
    metodoPagamento: "cartao_credito" | "pix" = "cartao_credito"
  ): Promise<boolean> {
    try {
      // Valores e dias baseados no método de pagamento
      let valor = 49.90; // Cartão padrão
      let diasPlano = 105; // Cartão: 105 dias
      
      if (metodoPagamento === "pix") {
        valor = 59.90; // PIX
        diasPlano = 35; // PIX: 35 dias
      }

      // Criar registro de pagamento
      const { data: pagamento, error: erroPagamento } = await supabase
        .from("pagamentos")
        .insert({
          assinatura_id: assinaturaId,
          valor,
          metodo_pagamento: metodoPagamento,
          status_pagamento: "aprovado",
          data_pagamento: new Date().toISOString(),
        })
        .select()
        .single();

      if (erroPagamento) {
        console.error("Erro ao registrar pagamento:", erroPagamento);
        return false;
      }

      // Ativar assinatura
      const dataInicio = new Date();
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + diasPlano);

      const { error: erroAtivacao } = await supabase
        .from("assinaturas")
        .update({
          status: "ativo",
          data_inicio: dataInicio.toISOString(),
          data_vencimento: dataVencimento.toISOString(),
          dias_restantes: diasPlano,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assinaturaId);

      if (erroAtivacao) {
        console.error("Erro ao ativar assinatura:", erroAtivacao);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      return false;
    }
  }

  /**
   * Suspender assinatura por falta de pagamento
   */
  static async suspenderAssinatura(assinaturaId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("assinaturas")
        .update({
          status: "suspenso",
          updated_at: new Date().toISOString(),
        })
        .eq("id", assinaturaId);

      if (error) {
        console.error("Erro ao suspender assinatura:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao suspender assinatura:", error);
      return false;
    }
  }

  /**
   * Verificar se deve mostrar lembrete de renovação
   * PIX: aviso 5 dias antes (após 55 dias)
   * Cartão: aviso 5 dias antes (após 175 dias)
   */
  static deveMostrarLembrete(diasRestantes: number, metodoPagamento: "pix" | "cartao_credito" = "pix"): boolean {
    if (metodoPagamento === "pix") {
      return diasRestantes <= 5 && diasRestantes > 0; // Aviso 5 dias antes do fim (após 30 dias)
    } else {
      return diasRestantes <= 5 && diasRestantes > 0; // Aviso 5 dias antes do fim (após 100 dias)
    }
  }

  /**
   * Obter assinatura do usuário (com watch/stream em tempo real)
   */
  static async obterAssinatura(userId: string): Promise<Assinatura | null> {
    try {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Assinatura;
    } catch (error) {
      console.error("Erro ao obter assinatura:", error);
      return null;
    }
  }

  /**
   * Observar mudanças na assinatura em tempo real (watch/stream)
   */
  static watchAssinatura(
    userId: string,
    callback: (assinatura: Assinatura | null) => void
  ) {
    const channel = supabase
      .channel(`assinatura-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assinaturas",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Mudança detectada na assinatura:", payload);
          if (payload.eventType === "DELETE") {
            callback(null);
          } else {
            callback(payload.new as Assinatura);
          }
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Observar mudanças nos pagamentos em tempo real (watch/stream)
   */
  static watchPagamentos(
    assinaturaId: string,
    callback: (pagamento: Pagamento) => void
  ) {
    const channel = supabase
      .channel(`pagamentos-${assinaturaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pagamentos",
          filter: `assinatura_id=eq.${assinaturaId}`,
        },
        (payload) => {
          console.log("Novo pagamento detectado:", payload);
          callback(payload.new as Pagamento);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Processar pagamento via PIX (R$ 59,90 - 60 dias)
   */
  static async processarPagamentoPix(
    assinaturaId: string,
    tipoPlano: "mensal" | "trimestral"
  ): Promise<boolean> {
    return await this.processarPagamento(assinaturaId, tipoPlano, "pix");
  }

  /**
   * Processar pagamento via Cartão de Crédito (R$ 149,70 - 180 dias)
   */
  static async processarPagamentoCartao(
    assinaturaId: string,
    tipoPlano: "mensal" | "trimestral"
  ): Promise<boolean> {
    return await this.processarPagamento(assinaturaId, tipoPlano, "cartao_credito");
  }
}
