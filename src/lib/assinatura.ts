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
   * - Usuários COM mensalidade:
   *   - NUNCA suspender antes de consumir TODOS os dias de uso comprados
   *   - Com 5 dias do vencimento: APENAS AVISAR, NÃO SUSPENDER
   *   - Suspender SOMENTE quando não houver mais dias de uso (dias_restantes <= 0)
   *   - Usuários inativos: suspender após último dia de uso
   */
  static async verificarAcesso(userId: string): Promise<{
    podeUsar: boolean;
    status: string;
    diasRestantes: number;
    mensagem: string;
    mostrarAviso: boolean;
  }> {
    try {
      // 🔥 BUSCAR SEMPRE DIRETO DO SUPABASE - DADOS EM TEMPO REAL
      console.log("🔍 Verificando acesso do usuário:", userId);

      const { data: operador, error } = await supabase
        .from("operadores")
        .select("*")
        .eq("id", userId)
        .single();

      // Se deu erro ou não encontrou o operador
      if (error || !operador) {
        console.error("❌ Erro ao buscar operador:", error?.message || "Operador não encontrado");

        // Tentar buscar de forma alternativa (getAllOperadores) como fallback
        const operadores = await AdminSupabase.getAllOperadores();
        const operadorFallback = operadores.find(op => op.id === userId);

        if (!operadorFallback) {
          return {
            podeUsar: false,
            status: "erro",
            diasRestantes: 0,
            mensagem: "Usuário não encontrado. Faça login novamente.",
            mostrarAviso: false,
          };
        }

        // Usar operador do fallback
        console.log("✅ Operador encontrado via fallback");
      }

      console.log("✅ Operador encontrado:", {
        id: operador.id,
        nome: operador.nome,
        ativo: operador.ativo,
        suspenso: operador.suspenso,
        aguardandoPagamento: operador.aguardando_pagamento,
        dataVencimento: operador.data_proximo_vencimento,
        formaPagamento: operador.forma_pagamento,
        diasRestantes: operador.dias_restantes,
        totalDiasComprados: operador.total_dias_comprados,
      });

      // 🔥 REGISTRAR ATIVIDADE: Atualizar última atividade sempre que verificar acesso
      // Isso garante que temos um registro de quando o usuário usou o sistema
      await this.registrarAtividade(userId);

      // 🔒 CORREÇÃO CRÍTICA: Verificar se é usuário sem mensalidade
      // Usuário sem mensalidade tem: forma_pagamento = NULL E ativo = TRUE E suspenso = FALSE
      // Usuário NOVO tem: forma_pagamento = NULL E ativo = FALSE E suspenso = TRUE
      if (!operador.forma_pagamento && operador.ativo && !operador.suspenso) {
        console.log("✅ Usuário sem mensalidade - acesso livre");
        return {
          podeUsar: true,
          status: "ativo",
          diasRestantes: 999999,
          mensagem: "Acesso livre (sem mensalidade)",
          mostrarAviso: false,
        };
      }

      // Verificar se está aguardando pagamento
      if (operador.aguardando_pagamento) {
        console.warn("⚠️ Usuário aguardando pagamento");
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
        console.warn("⚠️ Conta suspensa ou inativa:", {
          suspenso: operador.suspenso,
          ativo: operador.ativo,
        });
        return {
          podeUsar: false,
          status: "suspenso",
          diasRestantes: 0,
          mensagem: "Conta suspensa. Entre em contato com o administrador para renovar.",
          mostrarAviso: false,
        };
      }

      // 🔥 CALCULAR DIAS RESTANTES BASEADO NA DATA DE VENCIMENTO
      // Se tiver data_proximo_vencimento, calcular dias restantes
      if (operador.data_proximo_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(operador.data_proximo_vencimento);
        const diasAteVencimento = Math.ceil(differenceInDays(vencimento, hoje));

        console.log("📅 Verificando data de vencimento:", {
          hoje: hoje.toLocaleDateString('pt-BR'),
          vencimento: vencimento.toLocaleDateString('pt-BR'),
          diasAteVencimento: diasAteVencimento,
        });

        // Se ainda não venceu (diasAteVencimento >= 0), PERMITIR ACESSO
        if (diasAteVencimento >= 0) {
          // Com 5 dias ou menos: APENAS AVISAR (não suspender)
          const mostrarAviso = diasAteVencimento <= 5 && diasAteVencimento > 0;

          if (mostrarAviso) {
            console.warn("⚠️ Aviso de vencimento próximo:", diasAteVencimento, "dias");
          }

          console.log("✅ Conta ativa - dias restantes:", diasAteVencimento);
          return {
            podeUsar: true,
            status: "ativo",
            diasRestantes: diasAteVencimento,
            mensagem: mostrarAviso
              ? `Atenção: Sua assinatura vence em ${diasAteVencimento} dias.`
              : `Assinatura ativa. ${diasAteVencimento} dias restantes.`,
            mostrarAviso: mostrarAviso,
          };
        }

        // Se venceu (diasAteVencimento < 0), SUSPENDER
        console.warn("⚠️ Usuário VENCIDO - dias:", diasAteVencimento);
      } else {
        // Sem data de vencimento, verificar dias_assinatura
        if (operador.dias_assinatura && operador.dias_assinatura > 0) {
          console.log("✅ Conta ativa - dias assinatura:", operador.dias_assinatura);
          return {
            podeUsar: true,
            status: "ativo",
            diasRestantes: operador.dias_assinatura,
            mensagem: `Assinatura ativa. ${operador.dias_assinatura} dias restantes.`,
            mostrarAviso: false,
          };
        }
      }

      // 🔒 Se NÃO tiver dias no saldo (diasNoSaldo <= 0), SUSPENDER
      console.warn("⚠️ Usuário SEM dias no saldo - suspendendo");

      // Atualizar diretamente no banco
      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          ativo: false,
          suspenso: true,
          aguardando_pagamento: true,
        })
        .eq("id", operador.id);

      if (updateError) {
        console.error("❌ Erro ao suspender usuário sem dias:", updateError);
      } else {
        console.log("✅ Usuário suspenso (sem dias) com sucesso no banco de dados");
      }

      return {
        podeUsar: false,
        status: "suspenso",
        diasRestantes: 0,
        mensagem: "Seus dias de uso acabaram. Acesse o menu Financeiro para renovar.",
        mostrarAviso: false,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar acesso:", error);
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
   * Cartão: R$ 149,70 - 100 dias
   */
  static async processarPagamento(
    assinaturaId: string,
    tipoPlano: "mensal" | "trimestral",
    metodoPagamento: "cartao_credito" | "pix" = "cartao_credito"
  ): Promise<boolean> {
    try {
      // Valores e dias baseados no método de pagamento
      let valor = 149.70; // Cartão padrão
      let diasPlano = 100; // Cartão: 100 dias

      if (metodoPagamento === "pix") {
        valor = 59.90; // PIX
        diasPlano = 60; // PIX: 60 dias
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
   * Processar pagamento via Cartão de Crédito (R$ 149,70 - 100 dias)
   */
  static async processarPagamentoCartao(
    assinaturaId: string,
    tipoPlano: "mensal" | "trimestral"
  ): Promise<boolean> {
    return await this.processarPagamento(assinaturaId, tipoPlano, "cartao_credito");
  }

  /**
   * Registrar atividade do usuário (quando ele usa o sistema)
   * IMPORTANTE: Chamar esta função sempre que o usuário realizar uma ação (venda, consulta, etc)
   */
  static async registrarAtividade(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("operadores")
        .update({
          ultima_atividade: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("❌ Erro ao registrar atividade:", error);
        return false;
      }

      console.log("✅ Atividade registrada para usuário:", userId);
      return true;
    } catch (error) {
      console.error("❌ Erro ao registrar atividade:", error);
      return false;
    }
  }

  /**
   * Verificar e suspender usuários inativos
   * REGRA: Usuário inativo é aquele que:
   * - Não usa o sistema há muito tempo (sem ultima_atividade recente)
   * - NÃO TEM MAIS dias de uso no saldo (dias_restantes <= 0)
   * - Passou da data de vencimento (data_proximo_vencimento)
   *
   * IMPORTANTE: NÃO suspender usuários que ainda têm dias de uso, mesmo que inativos
   */
  static async verificarESuspenderInativos(): Promise<{
    usuariosSuspensos: string[];
    erros: string[];
  }> {
    try {
      console.log("🔍 Verificando usuários inativos...");

      // Buscar todos os operadores ativos
      const { data: operadores, error } = await supabase
        .from("operadores")
        .select("*")
        .eq("ativo", true)
        .eq("suspenso", false);

      if (error || !operadores) {
        console.error("❌ Erro ao buscar operadores:", error);
        return { usuariosSuspensos: [], erros: [error?.message || "Erro desconhecido"] };
      }

      const usuariosSuspensos: string[] = [];
      const erros: string[] = [];
      const hoje = new Date();

      for (const operador of operadores) {
        // Pular admins e usuários sem mensalidade
        if (operador.is_admin || (!operador.forma_pagamento && operador.ativo && !operador.suspenso)) {
          continue;
        }

        // Verificar dias no saldo
        const diasNoSaldo = operador.dias_restantes || operador.total_dias_comprados || 0;

        // Se tiver dias no saldo, NÃO SUSPENDER (mesmo que inativo)
        if (diasNoSaldo > 0) {
          console.log(`✅ ${operador.nome} tem ${diasNoSaldo} dias no saldo - NÃO suspender`);
          continue;
        }

        // Se NÃO tiver dias no saldo, verificar data de vencimento
        if (operador.data_proximo_vencimento) {
          const vencimento = new Date(operador.data_proximo_vencimento);
          const diasAteVencimento = differenceInDays(vencimento, hoje);

          // Se passou do vencimento E não tem dias no saldo, SUSPENDER
          if (diasAteVencimento < 0) {
            console.warn(`⚠️ ${operador.nome} - vencido há ${Math.abs(diasAteVencimento)} dias e sem saldo - SUSPENDENDO`);

            const { error: updateError } = await supabase
              .from("operadores")
              .update({
                ativo: false,
                suspenso: true,
                aguardando_pagamento: true,
              })
              .eq("id", operador.id);

            if (updateError) {
              console.error(`❌ Erro ao suspender ${operador.nome}:`, updateError);
              erros.push(`${operador.nome}: ${updateError.message}`);
            } else {
              usuariosSuspensos.push(operador.nome);
            }
          }
        } else {
          // Sem data de vencimento e sem dias no saldo - suspender por segurança
          console.warn(`⚠️ ${operador.nome} - sem vencimento e sem saldo - SUSPENDENDO`);

          const { error: updateError } = await supabase
            .from("operadores")
            .update({
              ativo: false,
              suspenso: true,
              aguardando_pagamento: true,
            })
            .eq("id", operador.id);

          if (updateError) {
            console.error(`❌ Erro ao suspender ${operador.nome}:`, updateError);
            erros.push(`${operador.nome}: ${updateError.message}`);
          } else {
            usuariosSuspensos.push(operador.nome);
          }
        }
      }

      console.log(`✅ Verificação concluída. Suspensos: ${usuariosSuspensos.length}`);
      return { usuariosSuspensos, erros };
    } catch (error) {
      console.error("❌ Erro ao verificar inativos:", error);
      return { usuariosSuspensos: [], erros: [(error as Error).message] };
    }
  }
}
