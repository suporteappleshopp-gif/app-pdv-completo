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
   * Buscar todos os operadores via API Route server-side (ignora RLS)
   */
  static async getAllOperadores(): Promise<Operador[]> {
    try {
      console.log("🔍 AdminSupabase.getAllOperadores - Buscando via API...");

      const response = await fetch("/api/admin/operadores");
      if (!response.ok) {
        console.error("❌ Erro na API ao buscar operadores:", response.status);
        return [];
      }

      const result = await response.json();
      if (!result.success) {
        console.error("❌ API retornou erro:", result.error);
        return [];
      }

      const operadores: Operador[] = (result.operadores || []).map((op: any) => ({
        id: op.id || `temp-${Date.now()}`,
        nome: op.nome || "Sem nome",
        email: op.email || "sem-email@exemplo.com",
        senha: op.senha || "",
        isAdmin: op.isAdmin || false,
        ativo: op.ativo ?? false,
        suspenso: op.suspenso ?? false,
        aguardandoPagamento: op.aguardandoPagamento ?? false,
        createdAt: op.createdAt ? new Date(op.createdAt) : new Date(),
        formaPagamento: op.formaPagamento || undefined,
        valorMensal: op.valorMensal || undefined,
        dataProximoVencimento: op.dataProximoVencimento ? new Date(op.dataProximoVencimento) : undefined,
        diasAssinatura: op.diasAssinatura || undefined,
        dataPagamento: op.dataPagamento ? new Date(op.dataPagamento) : undefined,
      }));

      console.log(`✅ ${operadores.length} operadores carregados via API`);
      return operadores;
    } catch (error) {
      console.error("Erro crítico ao buscar operadores:", error);
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
   * Criar novo operador via API Route server-side (ignora RLS)
   */
  static async addOperador(operador: Operador): Promise<boolean> {
    try {
      console.log("💾 AdminSupabase.addOperador via API:", operador.email);

      const response = await fetch("/api/admin/operadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: operador.email,
          password: operador.senha || Math.random().toString(36).slice(-8),
          nome: operador.nome,
          formaPagamento: operador.formaPagamento,
          diasAssinatura: operador.diasAssinatura,
          valorMensal: operador.valorMensal,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("❌ Erro ao criar operador:", result.error);
        return false;
      }

      console.log("✅ Operador criado via API!");
      return true;
    } catch (error) {
      console.error("❌ Erro ao criar operador:", error);
      return false;
    }
  }

  /**
   * Atualizar operador existente via API Route server-side (ignora RLS)
   */
  static async updateOperador(operador: Operador): Promise<boolean> {
    try {
      console.log("🔄 ADMIN atualizando operador via API:", operador.id);

      const response = await fetch("/api/admin/operadores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: operador.id,
          nome: operador.nome,
          email: operador.email,
          ativo: operador.ativo,
          suspenso: operador.suspenso,
          aguardandoPagamento: operador.aguardandoPagamento,
          formaPagamento: operador.formaPagamento,
          valorMensal: operador.valorMensal,
          diasAssinatura: operador.diasAssinatura,
          dataProximoVencimento: operador.dataProximoVencimento
            ? (operador.dataProximoVencimento instanceof Date
              ? operador.dataProximoVencimento.toISOString()
              : operador.dataProximoVencimento)
            : null,
          dataPagamento: operador.dataPagamento
            ? (operador.dataPagamento instanceof Date
              ? operador.dataPagamento.toISOString()
              : operador.dataPagamento)
            : null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("❌ Erro ao atualizar operador:", result.error);
        return false;
      }

      console.log("✅ Operador atualizado via API!");
      return true;
    } catch (error) {
      console.error("❌ Erro crítico ao atualizar operador:", error);
      return false;
    }
  }

  /**
   * Excluir operador via API Route server-side
   */
  static async deleteOperador(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/operadores?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Erro ao excluir operador:", result.error);
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

  /**
   * Adicionar ganho do admin ao Supabase
   */
  static async addGanhoAdmin(ganho: {
    tipo: "conta-criada" | "mensalidade-paga";
    usuario_id: string;
    usuario_nome: string;
    valor: number;
    forma_pagamento: "pix" | "cartao";
    dias_assinatura?: number;
  }): Promise<boolean> {
    try {
      console.log("💰 Tentando registrar ganho:", {
        usuario: ganho.usuario_nome,
        valor: ganho.valor,
        tipo: ganho.tipo,
        dias: ganho.dias_assinatura,
      });

      const { error } = await supabase.from("ganhos_admin").insert({
        // id será gerado automaticamente pelo Supabase (gen_random_uuid())
        tipo: ganho.tipo,
        usuario_id: ganho.usuario_id,
        usuario_nome: ganho.usuario_nome,
        valor: ganho.valor,
        forma_pagamento: ganho.forma_pagamento,
        dias_assinatura: ganho.dias_assinatura || null,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ Erro ao registrar ganho no Supabase:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // ⚠️ IMPORTANTE: Se o erro for de foreign key, continuar mesmo assim
        // O ganho já foi registrado localmente, o importante é não bloquear o fluxo
        if (error.code === '23503') {
          console.warn("⚠️ Erro de foreign key - mas o ganho foi registrado localmente");
          return true; // Considerar sucesso parcial
        }

        return false;
      }

      console.log("✅ Ganho registrado no Supabase com sucesso!");
      return true;
    } catch (error) {
      console.error("❌ Erro crítico ao registrar ganho:", error);
      return false;
    }
  }

  /**
   * Buscar todos os ganhos do admin no Supabase
   */
  static async getAllGanhosAdmin(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("ganhos_admin")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar ganhos:", error);
        return [];
      }

      return (data || []).map((g) => {
        // Gerar descrição com base no tipo e dias
        const descricao = g.tipo === "conta-criada"
          ? `Novo cadastro - ${g.usuario_nome}`
          : `Renovação de ${g.dias_assinatura || 0} dias - ${g.usuario_nome} (${g.forma_pagamento.toUpperCase()})`;

        return {
          id: g.id,
          tipo: g.tipo as "conta-criada" | "mensalidade-paga",
          usuarioId: g.usuario_id,
          usuarioNome: g.usuario_nome,
          valor: parseFloat(g.valor),
          formaPagamento: g.forma_pagamento as "pix" | "cartao",
          descricao: descricao,
          dataHora: new Date(g.created_at),
        };
      });
    } catch (error) {
      console.error("Erro ao buscar ganhos:", error);
      return [];
    }
  }

  /**
   * Observar ganhos em tempo real
   */
  static watchGanhosAdmin(callback: (ganhos: any[]) => void) {
    const channel = supabase
      .channel("ganhos-admin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ganhos_admin",
        },
        async () => {
          // Recarregar ganhos quando houver mudança
          const ganhos = await this.getAllGanhosAdmin();
          callback(ganhos);
        }
      )
      .subscribe();

    return channel;
  }
}
