import { supabase } from "./supabase";
import { Produto, Venda } from "./types";

/**
 * Biblioteca para sincronização de dados com Supabase
 * Gerencia produtos, vendas e estoque em tempo real
 */
export class SupabaseSync {
  /**
   * Sincronizar produtos do usuário
   */
  static async syncProdutos(userId: string, produtos: Produto[]): Promise<boolean> {
    try {
      // Se não há produtos, não sincronizar (evita erros)
      if (!produtos || produtos.length === 0) {
        console.log("⚠️ Nenhum produto para sincronizar");
        return true;
      }

      // Deletar produtos antigos do usuário
      await supabase.from("produtos").delete().eq("user_id", userId);

      // Inserir produtos atualizados
      const produtosParaInserir = produtos.map((p) => ({
        id: p.id,
        user_id: userId,
        nome: p.nome,
        codigo_barras: p.codigoBarras,
        preco: p.preco,
        estoque: p.estoque,
        estoque_minimo: p.estoqueMinimo,
        categoria: p.categoria,
        descricao: p.descricao,
      }));

      const { error } = await supabase.from("produtos").insert(produtosParaInserir);

      if (error) {
        console.error("Erro ao sincronizar produtos:", error.message || error.code || "Erro desconhecido");
        console.error("Detalhes do erro:", JSON.stringify(error));
        return false;
      }

      console.log(`✅ ${produtos.length} produto(s) sincronizado(s) com sucesso para usuário ${userId}`);
      return true;
    } catch (error) {
      console.error("Erro crítico ao sincronizar produtos:", error);
      return false;
    }
  }

  /**
   * Carregar produtos do usuário
   */
  static async loadProdutos(userId: string): Promise<Produto[]> {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("user_id", userId)
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao carregar produtos:", error.message || error.code || "Erro desconhecido");
        console.error("Detalhes do erro:", JSON.stringify(error));
        return [];
      }

      // Sucesso - retornar produtos (mesmo que vazio)
      console.log(`✅ Produtos carregados com sucesso para usuário ${userId}: ${data?.length || 0} produtos`);

      return (data || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        codigoBarras: p.codigo_barras,
        preco: p.preco,
        estoque: p.estoque,
        estoqueMinimo: p.estoque_minimo,
        categoria: p.categoria,
        descricao: p.descricao,
      }));
    } catch (error) {
      console.error("Erro crítico ao carregar produtos:", error);
      return [];
    }
  }

  /**
   * Adicionar produto
   */
  static async addProduto(userId: string, produto: Produto): Promise<boolean> {
    try {
      const { error } = await supabase.from("produtos").insert({
        id: produto.id,
        user_id: userId,
        nome: produto.nome,
        codigo_barras: produto.codigoBarras,
        preco: produto.preco,
        estoque: produto.estoque,
        estoque_minimo: produto.estoqueMinimo,
        categoria: produto.categoria,
        descricao: produto.descricao,
      });

      if (error) {
        console.error("Erro ao adicionar produto:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      return false;
    }
  }

  /**
   * Atualizar produto
   */
  static async updateProduto(produto: Produto): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("produtos")
        .update({
          nome: produto.nome,
          codigo_barras: produto.codigoBarras,
          preco: produto.preco,
          estoque: produto.estoque,
          estoque_minimo: produto.estoqueMinimo,
          categoria: produto.categoria,
          descricao: produto.descricao,
        })
        .eq("id", produto.id);

      if (error) {
        console.error("Erro ao atualizar produto:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      return false;
    }
  }

  /**
   * Deletar produto
   */
  static async deleteProduto(produtoId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("produtos").delete().eq("id", produtoId);

      if (error) {
        console.error("Erro ao deletar produto:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      return false;
    }
  }

  /**
   * Sincronizar vendas do usuário
   */
  static async syncVendas(userId: string, vendas: Venda[]): Promise<boolean> {
    try {
      // Inserir apenas vendas que não existem
      const { data: vendasExistentes } = await supabase
        .from("vendas")
        .select("id")
        .eq("operador_id", userId);

      const idsExistentes = new Set(vendasExistentes?.map((v) => v.id) || []);
      const vendasNovas = vendas.filter((v) => !idsExistentes.has(v.id));

      if (vendasNovas.length === 0) {
        return true;
      }

      const vendasParaInserir = vendasNovas.map((v) => ({
        id: v.id,
        numero: v.numero,
        operador_id: v.operadorId,
        operador_nome: v.operadorNome,
        total: v.total,
        forma_pagamento: v.tipoPagamento,
        status: v.status,
        created_at: v.dataHora instanceof Date ? v.dataHora.toISOString() : new Date(v.dataHora).toISOString(),
        updated_at: v.dataHora instanceof Date ? v.dataHora.toISOString() : new Date(v.dataHora).toISOString(),
      }));

      const { error } = await supabase.from("vendas").insert(vendasParaInserir);

      if (error) {
        console.error("Erro ao sincronizar vendas:", error.message || error.code || "Erro desconhecido");
        console.error("Detalhes do erro:", JSON.stringify(error));
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro crítico ao sincronizar vendas:", error);
      return false;
    }
  }

  /**
   * Carregar vendas do usuário
   */
  static async loadVendas(userId: string): Promise<Venda[]> {
    try {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("operador_id", userId)
        .order("data_hora", { ascending: false });

      if (error) {
        console.error("Erro ao carregar vendas:", error.message || error.code || "Erro desconhecido");
        console.error("Detalhes do erro:", JSON.stringify(error));
        return [];
      }

      return (data || []).map((v) => ({
        id: v.id,
        numero: v.numero || 'SEM-NUMERO',
        operadorId: v.operador_id,
        operadorNome: v.operador_nome,
        itens: [], // Itens não estão mais na tabela vendas
        total: v.total,
        dataHora: new Date(v.created_at || v.data_hora),
        status: v.status as "concluida" | "cancelada",
        tipoPagamento: v.forma_pagamento,
        motivoCancelamento: undefined,
      }));
    } catch (error) {
      console.error("Erro crítico ao carregar vendas:", error);
      return [];
    }
  }

  /**
   * Adicionar venda
   */
  static async addVenda(venda: Venda): Promise<boolean> {
    try {
      const { error } = await supabase.from("vendas").insert({
        id: venda.id,
        numero: venda.numero,
        operador_id: venda.operadorId,
        operador_nome: venda.operadorNome,
        itens: venda.itens,
        total: venda.total,
        data_hora: venda.dataHora.toISOString(),
        status: venda.status,
        tipo_pagamento: venda.tipoPagamento,
        motivo_cancelamento: venda.motivoCancelamento,
      });

      if (error) {
        console.error("Erro ao adicionar venda:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao adicionar venda:", error);
      return false;
    }
  }

  /**
   * Observar mudanças nos produtos em tempo real
   */
  static watchProdutos(userId: string, callback: (produtos: Produto[]) => void) {
    const channel = supabase
      .channel(`produtos-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "produtos",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const produtos = await this.loadProdutos(userId);
          callback(produtos);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Observar mudanças nas vendas em tempo real
   */
  static watchVendas(userId: string, callback: (vendas: Venda[]) => void) {
    const channel = supabase
      .channel(`vendas-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendas",
          filter: `operador_id=eq.${userId}`,
        },
        async () => {
          const vendas = await this.loadVendas(userId);
          callback(vendas);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Verificar se Supabase está configurado
   */
  static isConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return !!url && !!key && url.length > 0 && key.length > 0;
  }
}
