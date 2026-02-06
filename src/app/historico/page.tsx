"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Venda, ItemVenda } from "@/lib/types";
import {
  ArrowLeft,
  History,
  Search,
  Printer,
  RotateCcw,
  Calendar,
  DollarSign,
  ShoppingCart,
  User,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  imprimirCupomFiscal,
  imprimirNFCe,
  imprimirNotaFiscalCompleta,
} from "@/lib/impressao";

export default function HistoricoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [busca, setBusca] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Modal de devolução
  const [showModalDevolucao, setShowModalDevolucao] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [itemParaDevolver, setItemParaDevolver] = useState<ItemVenda | null>(null);
  const [quantidadeDevolver, setQuantidadeDevolver] = useState(1);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [tipoDestino, setTipoDestino] = useState<"estoque" | "avaria">("estoque");
  const [observacoesAvaria, setObservacoesAvaria] = useState("");

  useEffect(() => {
    let channel: any = null;
    let channelItens: any = null;

    const init = async () => {
      await carregarVendas();

      // Configurar subscription de realtime
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (operador && !operador.isAdmin) {
        const { supabase } = await import("@/lib/supabase");

        // ✅ Canal único com timestamp para evitar conflitos
        const channelId = `vendas_historico_${operador.id}_${Date.now()}`;
        console.log('🔧 Configurando realtime para histórico. Canal:', channelId);
        console.log('🔧 Filtro:', `operador_id=eq.${operador.id}`);

        // Escutar mudanças na tabela de vendas em tempo real
        channel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'vendas',
              filter: `operador_id=eq.${operador.id}`,
            },
            (payload) => {
              console.log('🔔 Mudança detectada em vendas (histórico):', payload);
              // Recarregar vendas quando houver mudança
              carregarVendas();
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime CONECTADO para histórico de vendas');
            } else if (status === 'CLOSED') {
              console.warn('⚠️ Realtime histórico FECHADO');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro no canal realtime histórico:', err);
            }
          });

        // ✅ Também escutar mudanças nos itens de venda
        const channelItensId = `itens_venda_historico_${operador.id}_${Date.now()}`;
        channelItens = supabase
          .channel(channelItensId)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'itens_venda',
            },
            (payload) => {
              console.log('🔔 Mudança detectada em itens de venda:', payload);
              carregarVendas();
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime CONECTADO para itens de venda');
            } else if (status === 'CLOSED') {
              console.warn('⚠️ Realtime itens FECHADO');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro no canal realtime itens:', err);
            }
          });
      }
    };

    init();

    // ✅ FALLBACK: Recarregar vendas a cada 15 segundos (caso realtime não funcione)
    const intervaloFallback = setInterval(() => {
      console.log('🔄 Recarregando histórico (polling)...');
      carregarVendas();
    }, 15000);

    // Cleanup ao desmontar
    return () => {
      clearInterval(intervaloFallback);
      if (channel) {
        channel.unsubscribe();
        console.log('🔌 Realtime de vendas desconectado');
      }
      if (channelItens) {
        channelItens.unsubscribe();
        console.log('🔌 Realtime de itens desconectado');
      }
    };
  }, []);

  const carregarVendas = async () => {
    try {
      setLoading(true);

      // Buscar operador logado
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        setErro("Usuário não autenticado");
        router.push("/");
        return;
      }

      // 🔒 Bloquear admin
      if (operador.isAdmin) {
        router.push("/admin");
        return;
      }

      // Carregar vendas diretamente do Supabase
      console.log("☁️ Carregando vendas do Supabase...");
      const { supabase } = await import("@/lib/supabase");

      const { data: vendasData, error: errorVendas } = await supabase
        .from("vendas")
        .select("*")
        .eq("operador_id", operador.id)
        .order("created_at", { ascending: false });

      if (errorVendas) {
        console.error("❌ Erro ao carregar vendas:", errorVendas);
        setErro("Erro ao carregar vendas do banco de dados");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      if (!vendasData || vendasData.length === 0) {
        console.log("⚠️ Nenhuma venda encontrada");
        setVendas([]);
        return;
      }

      console.log(`✅ ${vendasData.length} vendas encontradas no Supabase`);

      // Carregar itens para cada venda
      const vendasComItens = await Promise.all(
        vendasData.map(async (v) => {
          const { data: itens } = await supabase
            .from("itens_venda")
            .select("*")
            .eq("venda_id", v.id);

          return {
            id: v.id,
            numero: v.numero || 0,
            operadorId: v.operador_id,
            operadorNome: v.operador_nome,
            itens: (itens || []).map((item) => ({
              produtoId: item.produto_id,
              nome: item.nome,
              quantidade: item.quantidade,
              precoUnitario: parseFloat(item.preco_unitario.toString()),
              subtotal: parseFloat(item.subtotal.toString()),
            })),
            total: parseFloat(v.total.toString()),
            dataHora: new Date(v.created_at),
            status: v.status as "concluida" | "cancelada",
            tipoPagamento: v.forma_pagamento,
            motivoCancelamento: v.motivo_cancelamento,
            devolucoes: [],
          } as Venda;
        })
      );

      setVendas(vendasComItens);
      console.log(`✅ ${vendasComItens.length} vendas carregadas com itens`);
    } catch (err) {
      console.error("❌ Erro ao carregar vendas:", err);
      setErro("Erro ao carregar histórico de vendas");
      setTimeout(() => setErro(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const imprimirNota = (venda: Venda) => {
    // Imprime nota fiscal completa (detecta dispositivo automaticamente)
    imprimirNotaFiscalCompleta(venda);
  };

  const abrirModalDevolucao = (venda: Venda, item: ItemVenda) => {
    setVendaSelecionada(venda);
    setItemParaDevolver(item);
    setQuantidadeDevolver(1);
    setMotivoDevolucao("");
    setTipoDestino("estoque");
    setObservacoesAvaria("");
    setShowModalDevolucao(true);
  };

  const processarDevolucao = async () => {
    if (!vendaSelecionada || !itemParaDevolver) return;

    try {
      // Validações
      if (quantidadeDevolver <= 0 || quantidadeDevolver > itemParaDevolver.quantidade) {
        setErro("Quantidade inválida para devolução");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      if (!motivoDevolucao.trim()) {
        setErro("Informe o motivo da devolução");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      // Buscar operador atual
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        setErro("Erro: Operador não encontrado");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      // ☁️ SINCRONIZAR COM SUPABASE EM TEMPO REAL
      const { SupabaseSync } = await import("@/lib/supabase-sync");

      if (tipoDestino === "estoque") {
        // Devolver produto ao estoque
        const { SupabaseSync: SupabaseSyncProdutos } = await import("@/lib/supabase-sync");
        const produtosAtuais = await SupabaseSyncProdutos.loadProdutos(operador.id);
        const produto = produtosAtuais.find(p => p.id === itemParaDevolver.produtoId);

        if (produto) {
          produto.estoque += quantidadeDevolver;
          await SupabaseSyncProdutos.syncProdutos(operador.id, produtosAtuais);
          console.log("✅ Produto devolvido ao estoque no Supabase");
        }
      } else {
        // Registrar como avaria (NÃO volta ao estoque)
        const avaria = {
          id: `avaria-${Date.now()}`,
          userId: operador.id,
          vendaId: vendaSelecionada.id,
          produtoId: itemParaDevolver.produtoId,
          produtoNome: itemParaDevolver.nome,
          quantidade: quantidadeDevolver,
          valorUnitario: itemParaDevolver.precoUnitario,
          valorTotal: itemParaDevolver.precoUnitario * quantidadeDevolver,
          motivo: motivoDevolucao,
          observacoes: observacoesAvaria,
        };

        await SupabaseSync.addAvaria(avaria);
        console.log("✅ Avaria registrada no Supabase");
      }

      // Atualizar venda
      const vendaAtualizada = { ...vendaSelecionada };
      const itemIndex = vendaAtualizada.itens.findIndex(
        (i) => i.produtoId === itemParaDevolver.produtoId
      );

      if (itemIndex !== -1) {
        const itemAtual = vendaAtualizada.itens[itemIndex];

        if (quantidadeDevolver === itemAtual.quantidade) {
          // Remover item completamente
          vendaAtualizada.itens.splice(itemIndex, 1);
        } else {
          // Reduzir quantidade
          itemAtual.quantidade -= quantidadeDevolver;
          itemAtual.subtotal = itemAtual.quantidade * itemAtual.precoUnitario;
        }

        // Recalcular total
        vendaAtualizada.total = vendaAtualizada.itens.reduce(
          (acc, item) => acc + item.subtotal,
          0
        );

        // Adicionar registro de devolução
        if (!vendaAtualizada.devolucoes) {
          vendaAtualizada.devolucoes = [];
        }
        vendaAtualizada.devolucoes.push({
          produtoId: itemParaDevolver.produtoId,
          nomeProduto: itemParaDevolver.nome,
          quantidade: quantidadeDevolver,
          motivo: motivoDevolucao,
          dataHora: new Date(),
          tipoDestino: tipoDestino,
        });

        await db.updateVenda(vendaAtualizada);
        await carregarVendas();

        const mensagem = tipoDestino === "estoque"
          ? `Devolução processada! ${quantidadeDevolver}x ${itemParaDevolver.nome} devolvido(s) ao estoque.`
          : `Avaria registrada! ${quantidadeDevolver}x ${itemParaDevolver.nome} - ${motivoDevolucao}`;

        setSucesso(mensagem);
        setTimeout(() => setSucesso(""), 5000);
        setShowModalDevolucao(false);
      }
    } catch (err) {
      console.error("Erro ao processar devolução:", err);
      setErro("Erro ao processar devolução");
      setTimeout(() => setErro(""), 3000);
    }
  };

  const limparFiltroData = () => {
    setDataFiltro("");
  };

  const vendasFiltradas = vendas.filter((venda) => {
    // Filtro por busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const matchBusca = 
        venda.numero.toString().includes(busca) ||
        venda.operadorNome.toLowerCase().includes(buscaLower) ||
        venda.itens.some((item) => item.nome.toLowerCase().includes(buscaLower));
      
      if (!matchBusca) return false;
    }

    // Filtro por data
    if (dataFiltro) {
      const dataVenda = format(new Date(venda.dataHora), "yyyy-MM-dd");
      if (dataVenda !== dataFiltro) return false;
    }

    return true;
  });

  const totalVendas = vendasFiltradas.length;
  const valorTotalVendas = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);
  const ticketMedio = totalVendas > 0 ? valorTotalVendas / totalVendas : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/empresa")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <History className="w-8 h-8" />
                <span>Histórico de Vendas</span>
              </h1>
              <p className="text-purple-200">Todas as vendas realizadas</p>
            </div>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alertas */}
        {sucesso && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{sucesso}</span>
          </div>
        )}

        {erro && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{erro}</span>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{totalVendas}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Total de Vendas</h3>
            <p className="text-blue-100 text-sm">Vendas realizadas</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  R$ {valorTotalVendas.toFixed(2)}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Valor Total</h3>
            <p className="text-green-100 text-sm">Faturamento total</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  R$ {ticketMedio.toFixed(2)}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Ticket Médio</h3>
            <p className="text-purple-100 text-sm">Valor médio por venda</p>
          </div>
        </div>

        {/* Lista de Vendas */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <History className="w-7 h-7 mr-3" />
                Vendas Realizadas
              </h2>
            </div>
            
            {/* Filtros */}
            <div className="flex items-center space-x-3">
              {/* Filtro por Data */}
              <div className="relative flex-shrink-0">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              {/* Botão Limpar Filtro */}
              {dataFiltro && (
                <button
                  onClick={limparFiltroData}
                  className="flex items-center space-x-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all"
                  title="Limpar filtro de data"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-semibold">Limpar</span>
                </button>
              )}

              {/* Campo de Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar vendas..."
                  className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {vendasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-lg">
                  {busca || dataFiltro ? "Nenhuma venda encontrada com os filtros aplicados" : "Nenhuma venda realizada"}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-white/10">
                {vendasFiltradas.map((venda) => (
                  <div
                    key={venda.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-bold">
                            Venda #{venda.numero}
                          </span>
                          <span className="text-purple-200 text-sm flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(venda.dataHora), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Operador: {venda.operadorNome}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => imprimirNota(venda)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all"
                          title="Imprimir Cupom Fiscal"
                        >
                          <Printer className="w-5 h-5" />
                          <span className="font-semibold">Cupom</span>
                        </button>
                        
                        <button
                          onClick={() => imprimirNFCe(venda)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                          title="Imprimir NFC-e"
                        >
                          <Printer className="w-5 h-5" />
                          <span className="font-semibold">NFC-e</span>
                        </button>
                        
                        <button
                          onClick={() => imprimirNotaFiscalCompleta(venda)}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
                          title="Imprimir Nota Fiscal Completa"
                        >
                          <Printer className="w-5 h-5" />
                          <span className="font-semibold">Nota Completa</span>
                        </button>
                      </div>
                    </div>

                    {/* Itens da Venda */}
                    <div className="space-y-2 mb-4">
                      {venda.itens.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <Package className="w-5 h-5 text-purple-300" />
                            <div>
                              <p className="text-white font-semibold">{item.nome}</p>
                              <p className="text-purple-200 text-sm">
                                {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="text-white font-bold">
                              R$ {item.subtotal.toFixed(2)}
                            </p>
                            <button
                              onClick={() => abrirModalDevolucao(venda, item)}
                              className="flex items-center space-x-1 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg transition-all"
                              title="Devolução"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="text-sm font-semibold">Devolver</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Devoluções (se houver) */}
                    {venda.devolucoes && venda.devolucoes.length > 0 && (
                      <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-orange-300 font-semibold mb-2 flex items-center">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Devoluções:
                        </p>
                        {venda.devolucoes.map((dev, idx) => (
                          <p key={idx} className="text-orange-200 text-sm ml-6">
                            • {dev.quantidade}x {dev.nomeProduto} - {dev.motivo}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-purple-200 font-semibold">TOTAL:</span>
                      <span className="text-2xl font-bold text-green-400">
                        R$ {venda.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Devolução */}
      {showModalDevolucao && itemParaDevolver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 my-8 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center">
                <RotateCcw className="w-6 h-6 mr-2" />
                Devolução de Produto
              </h3>
              <button
                onClick={() => setShowModalDevolucao(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white font-semibold mb-1">{itemParaDevolver.nome}</p>
                <p className="text-purple-200 text-sm">
                  Quantidade na venda: {itemParaDevolver.quantidade}
                </p>
                <p className="text-purple-200 text-sm">
                  Preço unitário: R$ {itemParaDevolver.precoUnitario.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Quantidade a Devolver
                </label>
                <input
                  type="number"
                  min="1"
                  max={itemParaDevolver.quantidade}
                  value={quantidadeDevolver}
                  onChange={(e) => setQuantidadeDevolver(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Destino do Produto *
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setTipoDestino("estoque")}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                      tipoDestino === "estoque"
                        ? "bg-green-600 text-white"
                        : "bg-white/10 text-purple-200 hover:bg-white/20"
                    }`}
                  >
                    ✅ Estoque
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDestino("avaria")}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                      tipoDestino === "avaria"
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-purple-200 hover:bg-white/20"
                    }`}
                  >
                    ⚠️ Avaria
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Motivo {tipoDestino === "avaria" ? "da Avaria" : "da Devolução"} *
                </label>
                <select
                  value={motivoDevolucao}
                  onChange={(e) => setMotivoDevolucao(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="" className="bg-slate-800">
                    Selecione o motivo
                  </option>
                  {tipoDestino === "estoque" ? (
                    <>
                      <option value="Produto errado" className="bg-slate-800">
                        Produto errado
                      </option>
                      <option value="Cancelamento do cliente" className="bg-slate-800">
                        Cancelamento do cliente
                      </option>
                      <option value="Arrependimento" className="bg-slate-800">
                        Arrependimento
                      </option>
                      <option value="Outro motivo" className="bg-slate-800">
                        Outro motivo
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="Produto danificado" className="bg-slate-800">
                        Produto danificado
                      </option>
                      <option value="Produto vencido" className="bg-slate-800">
                        Produto vencido
                      </option>
                      <option value="Defeito de fabricação" className="bg-slate-800">
                        Defeito de fabricação
                      </option>
                      <option value="Embalagem violada" className="bg-slate-800">
                        Embalagem violada
                      </option>
                      <option value="Perda no transporte" className="bg-slate-800">
                        Perda no transporte
                      </option>
                      <option value="Contaminação" className="bg-slate-800">
                        Contaminação
                      </option>
                      <option value="Outros danos" className="bg-slate-800">
                        Outros danos
                      </option>
                    </>
                  )}
                </select>
              </div>

              {tipoDestino === "avaria" && (
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-2">
                    Observações (Opcional)
                  </label>
                  <textarea
                    value={observacoesAvaria}
                    onChange={(e) => setObservacoesAvaria(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Detalhes adicionais sobre a avaria..."
                    rows={3}
                  />
                </div>
              )}

              <div className={`${tipoDestino === "estoque" ? "bg-blue-500/10 border-blue-500/30" : "bg-red-500/10 border-red-500/30"} border rounded-lg p-3`}>
                {tipoDestino === "estoque" ? (
                  <>
                    <p className="text-blue-300 text-sm">
                      ✅ O produto será devolvido automaticamente ao estoque
                    </p>
                    <p className="text-blue-300 text-sm mt-1">
                      ✅ O valor da venda será atualizado
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-red-300 text-sm">
                      ⚠️ O produto NÃO voltará ao estoque
                    </p>
                    <p className="text-red-300 text-sm mt-1">
                      ⚠️ Será registrado como avaria no sistema
                    </p>
                    <p className="text-red-300 text-sm mt-1">
                      ✅ O valor da venda será atualizado
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-white/10 bg-slate-900/50 rounded-b-2xl flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModalDevolucao(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={processarDevolucao}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Processar Devolução</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
