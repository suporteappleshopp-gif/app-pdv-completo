/**
 * IMPORTANTE: Para o sistema funcionar corretamente, execute este SQL no Supabase:
 *
 * ALTER TABLE operadores
 * ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP,
 * ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
 * ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
 * ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2),
 * ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;
 */

import { supabase } from "./supabase";
import { Operador } from "./types";

export interface MensagemChat {
  id: string;
  operador_id: string;
  remetente: "admin" | "usuario";
  texto: string;
  lida: boolean;
  created_at: Date;
}

/**
 * Gerenciador de operadores no Supabase com sincronização em tempo real
 */
export class AdminSupabase {
  /**
   * Verificar validade de 30 dias para logins sem mensalidade
   */
  static verificarValidadeOperador(operador: Operador): {
    valido: boolean;
    diasRestantes: number;
    expirado: boolean;
  } {
    // Admins sempre têm acesso válido
    if (operador.isAdmin) {
      return { valido: true, diasRestantes: 999, expirado: false };
    }

    // Para usuários comuns, verificar 30 dias desde criação
    const dataAtual = new Date();
    const dataCriacao = new Date(operador.createdAt);
    const diferencaDias = Math.floor(
      (dataAtual.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24)
    );
    const diasRestantes = 30 - diferencaDias;

    return {
      valido: diasRestantes > 0,
      diasRestantes: Math.max(0, diasRestantes),
      expirado: diasRestantes <= 0,
    };
  }

  /**
   * Buscar todos os operadores ativos em tempo real
   */
  static async getAllOperadores(): Promise<Operador[]> {
    try {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Supabase não configurado - retornar array vazio silenciosamente
        return [];
      }

      return (data || []).map((op) => {
        const operador: Operador = {
          id: op.id,
          nome: op.nome,
          email: op.email,
          senha: op.senha,
          isAdmin: op.is_admin || false,
          ativo: op.ativo || false,
          suspenso: op.suspenso || false,
          aguardandoPagamento: op.aguardando_pagamento || false,
          createdAt: new Date(op.created_at),
          formaPagamento: op.forma_pagamento || undefined,
          valorMensal: op.valor_mensal || undefined,
          dataProximoVencimento: op.data_proximo_vencimento ? new Date(op.data_proximo_vencimento) : undefined,
          diasAssinatura: op.dias_assinatura || undefined,
          dataPagamento: op.data_pagamento ? new Date(op.data_pagamento) : undefined,
        };

        return operador;
      });
    } catch (error) {
      console.error("Erro ao buscar operadores:", error);
      return [];
    }
  }

  /**
   * Suspender operador por expiração de 30 dias
   */
  static async suspenderPorExpiracao(operadorId: string): Promise<void> {
    try {
      await supabase
        .from("operadores")
        .update({
          ativo: false,
          suspenso: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operadorId);
    } catch (error) {
      console.error("Erro ao suspender operador por expiração:", error);
    }
  }

  /**
   * Criar novo operador
   */
  static async addOperador(operador: Operador): Promise<boolean> {
    try {
      const insertData: any = {
        id: operador.id,
        nome: operador.nome,
        email: operador.email,
        senha: operador.senha,
        is_admin: operador.isAdmin,
        ativo: operador.ativo,
        suspenso: operador.suspenso || false,
        aguardando_pagamento: operador.aguardandoPagamento || false,
        created_at: operador.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Adicionar campos opcionais se existirem
      if (operador.dataProximoVencimento) {
        insertData.data_proximo_vencimento = operador.dataProximoVencimento instanceof Date
          ? operador.dataProximoVencimento.toISOString()
          : operador.dataProximoVencimento;
      }
      if (operador.diasAssinatura !== undefined) {
        insertData.dias_assinatura = operador.diasAssinatura;
      }
      if (operador.formaPagamento) {
        insertData.forma_pagamento = operador.formaPagamento;
      }
      if (operador.valorMensal !== undefined) {
        insertData.valor_mensal = operador.valorMensal;
      }

      const { error } = await supabase.from("operadores").insert(insertData);

      if (error) {
        console.error("❌ Erro ao criar operador:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        return false;
      }

      console.log("✅ Operador criado com sucesso!");
      return true;
    } catch (error) {
      console.error("❌ Erro ao criar operador:", error);
      return false;
    }
  }

  /**
   * Atualizar operador existente - ADMIN TEM CONTROLE TOTAL
   */
  static async updateOperador(operador: Operador): Promise<boolean> {
    try {
      console.log("🔄 ADMIN atualizando operador:", {
        id: operador.id,
        email: operador.email,
        nome: operador.nome,
        ativo: operador.ativo,
        suspenso: operador.suspenso,
        diasAssinatura: operador.diasAssinatura,
        dataProximoVencimento: operador.dataProximoVencimento,
      });

      // SEMPRE atualizar campos básicos primeiro (GARANTIDO DE FUNCIONAR)
      const updateBasico = {
        nome: operador.nome,
        email: operador.email,
        senha: operador.senha,
        is_admin: operador.isAdmin,
        ativo: operador.ativo,
        suspenso: operador.suspenso || false,
        aguardando_pagamento: operador.aguardandoPagamento || false,
        updated_at: new Date().toISOString(),
      };

      console.log("📤 ADMIN atualizando campos básicos...");

      const { data: dataBasico, error: errorBasico } = await supabase
        .from("operadores")
        .update(updateBasico)
        .eq("id", operador.id)
        .select();

      if (errorBasico) {
        console.error("❌ Erro ao atualizar campos básicos:", errorBasico);
        return false;
      }

      console.log("✅ Campos básicos atualizados!");

      // Tentar atualizar campos de mensalidade (pode falhar se não existirem)
      const updateExtras: any = {};

      if (operador.dataProximoVencimento) {
        updateExtras.data_proximo_vencimento = operador.dataProximoVencimento instanceof Date
          ? operador.dataProximoVencimento.toISOString()
          : new Date(operador.dataProximoVencimento).toISOString();
      }

      if (operador.diasAssinatura !== undefined && operador.diasAssinatura !== null) {
        updateExtras.dias_assinatura = operador.diasAssinatura;
      }

      if (operador.formaPagamento) {
        updateExtras.forma_pagamento = operador.formaPagamento;
      }

      if (operador.valorMensal !== undefined) {
        updateExtras.valor_mensal = operador.valorMensal;
      }

      if (operador.dataPagamento) {
        updateExtras.data_pagamento = operador.dataPagamento instanceof Date
          ? operador.dataPagamento.toISOString()
          : new Date(operador.dataPagamento).toISOString();
      }

      // Se houver campos extras para atualizar
      if (Object.keys(updateExtras).length > 0) {
        console.log("📤 Tentando atualizar campos extras:", updateExtras);

        const { data: dataExtras, error: errorExtras } = await supabase
          .from("operadores")
          .update(updateExtras)
          .eq("id", operador.id)
          .select();

        if (errorExtras) {
          console.warn("⚠️ Campos extras não atualizados (colunas podem não existir):", errorExtras.message);
          console.log("💡 Execute este SQL no Supabase para criar as colunas:");
          console.log(`
            ALTER TABLE operadores
            ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP,
            ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
            ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
            ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;
          `);
          // NÃO falhar aqui - campos básicos foram atualizados com sucesso
          return true;
        }

        console.log("✅ Campos extras atualizados!", dataExtras);
      }

      console.log("✅ ADMIN atualizou operador com SUCESSO!");
      return true;
    } catch (error) {
      console.error("❌ Erro crítico ao atualizar operador:", error);
      return false;
    }
  }

  /**
   * Excluir operador
   */
  static async deleteOperador(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("operadores")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir operador:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao excluir operador:", error);
      return false;
    }
  }

  /**
   * Buscar operador por ID
   */
  static async getOperadorById(id: string): Promise<Operador | null> {
    try {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        nome: data.nome,
        email: data.email,
        senha: data.senha,
        isAdmin: data.is_admin || false,
        ativo: data.ativo || false,
        suspenso: data.suspenso || false,
        aguardandoPagamento: data.aguardando_pagamento || false,
        createdAt: new Date(data.created_at),
        formaPagamento: data.forma_pagamento || undefined,
        valorMensal: data.valor_mensal || undefined,
        dataProximoVencimento: data.data_proximo_vencimento ? new Date(data.data_proximo_vencimento) : undefined,
        diasAssinatura: data.dias_assinatura || undefined,
        dataPagamento: data.data_pagamento ? new Date(data.data_pagamento) : undefined,
      };
    } catch (error) {
      console.error("Erro ao buscar operador:", error);
      return null;
    }
  }

  /**
   * Observar mudanças nos operadores em tempo real (watch/stream)
   */
  static watchOperadores(callback: (operadores: Operador[]) => void) {
    const channel = supabase
      .channel("operadores-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operadores",
        },
        async () => {
          // Recarregar todos os operadores quando houver mudança
          const operadores = await this.getAllOperadores();
          callback(operadores);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Adicionar mensagem de chat
   */
  static async addMensagem(mensagem: MensagemChat): Promise<boolean> {
    try {
      const { error } = await supabase.from("mensagens_chat").insert({
        id: mensagem.id,
        operador_id: mensagem.operador_id,
        remetente: mensagem.remetente,
        texto: mensagem.texto,
        lida: mensagem.lida,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Erro ao adicionar mensagem:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao adicionar mensagem:", error);
      return false;
    }
  }

  /**
   * Buscar mensagens de um operador
   */
  static async getMensagens(operadorId: string): Promise<MensagemChat[]> {
    try {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("operador_id", operadorId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar mensagens:", error);
        return [];
      }

      return (data || []).map((msg) => ({
        id: msg.id,
        operador_id: msg.operador_id,
        remetente: msg.remetente as "admin" | "usuario",
        texto: msg.texto,
        lida: msg.lida,
        created_at: new Date(msg.created_at),
      }));
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      return [];
    }
  }

  /**
   * Marcar mensagens como lidas
   */
  static async marcarMensagensComoLidas(
    operadorId: string,
    remetente: "admin" | "usuario"
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("mensagens_chat")
        .update({ lida: true })
        .eq("operador_id", operadorId)
        .eq("remetente", remetente)
        .eq("lida", false);

      if (error) {
        console.error("Erro ao marcar mensagens como lidas:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
      return false;
    }
  }

  /**
   * Contar mensagens não lidas
   */
  static async contarMensagensNaoLidas(
    operadorId?: string
  ): Promise<number> {
    try {
      let query = supabase
        .from("mensagens_chat")
        .select("id", { count: "exact", head: true })
        .eq("lida", false)
        .eq("remetente", "usuario");

      if (operadorId) {
        query = query.eq("operador_id", operadorId);
      }

      const { count, error } = await query;

      if (error) {
        // Supabase não configurado - retornar 0 silenciosamente
        return 0;
      }

      return count || 0;
    } catch (error) {
      // Supabase não configurado - retornar 0 silenciosamente
      return 0;
    }
  }

  /**
   * Observar mensagens em tempo real (watch/stream)
   */
  static watchMensagens(
    operadorId: string,
    callback: (mensagens: MensagemChat[]) => void
  ) {
    const channel = supabase
      .channel(`mensagens-${operadorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens_chat",
          filter: `operador_id=eq.${operadorId}`,
        },
        async () => {
          // Recarregar mensagens quando houver mudança
          const mensagens = await this.getMensagens(operadorId);
          callback(mensagens);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Observar todas as mensagens não lidas em tempo real
   */
  static watchMensagensNaoLidas(callback: (count: number) => void) {
    const channel = supabase
      .channel("mensagens-nao-lidas")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens_chat",
        },
        async () => {
          // Recarregar contagem quando houver mudança
          const count = await this.contarMensagensNaoLidas();
          callback(count);
        }
      )
      .subscribe();

    return channel;
  }
}
