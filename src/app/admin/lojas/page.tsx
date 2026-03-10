"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminSupabase } from "@/lib/admin-supabase";
import { Operador } from "@/lib/types";
import {
  ArrowLeft,
  Store,
  Search,
  Key,
  ShoppingCart,
  Calendar,
  DollarSign,
  User,
  X,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Send,
  ArrowUpDown,
  Printer,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

interface Mensagem {
  id: string;
  remetente: "admin" | "usuario";
  texto: string;
  dataHora: Date;
  lida: boolean;
}

export default function AnaliseLojasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>("");
  const operadorSelecionadoRef = useRef<string>("");
  const [busca, setBusca] = useState("");
  const [ordenacaoUsuarios, setOrdenacaoUsuarios] = useState<"asc" | "desc">("asc");

  // Modal de troca de senha
  const [showModalSenha, setShowModalSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Chat
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatPainelRef = useRef<HTMLDivElement>(null);

  // Vendas e estatísticas
  const [vendas, setVendas] = useState<any[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [totalVendas, setTotalVendas] = useState(0);
  const [faturamentoTotal, setFaturamentoTotal] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);

  // Manter ref do operador selecionado para closures de realtime
  useEffect(() => {
    operadorSelecionadoRef.current = operadorSelecionado;
  }, [operadorSelecionado]);

  const carregarVendasUsuario = useCallback(async (opId?: string) => {
    const targetId = opId || operadorSelecionadoRef.current;
    if (!targetId) return;

    try {
      setLoadingVendas(true);
      console.log("🔍 Carregando vendas do usuário:", targetId);

      const { data, error } = await supabase
        .from("vendas")
        .select(`
          *,
          itens_venda (
            produto_id,
            nome,
            codigo_barras,
            quantidade,
            preco_unitario,
            subtotal
          )
        `)
        .eq("operador_id", targetId)
        .order("data_hora", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar vendas (Supabase):", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setVendas([]);
        setTotalVendas(0);
        setFaturamentoTotal(0);
        setTicketMedio(0);
        return;
      }

      console.log("✅ Vendas carregadas do Supabase:", data?.length || 0);

      const vendasMapeadas = (data || []).map((v: any) => ({
        id: v.id,
        numero: v.numero,
        operadorId: v.operador_id,
        operadorNome: v.operador_nome,
        dataHora: v.data_hora || v.created_at,
        data_hora: v.data_hora || v.created_at,
        total: parseFloat(v.total) || 0,
        status: v.status,
        tipoPagamento: v.tipo_pagamento || v.forma_pagamento,
        tipo_pagamento: v.tipo_pagamento || v.forma_pagamento,
        forma_pagamento: v.forma_pagamento || v.tipo_pagamento,
        valorRecebido: v.valor_recebido,
        troco: v.troco,
        itens: (v.itens_venda || []).map((item: any) => ({
          produtoId: item.produto_id,
          nome: item.nome,
          codigoBarras: item.codigo_barras,
          quantidade: item.quantidade,
          precoUnitario: parseFloat(item.preco_unitario) || 0,
          subtotal: parseFloat(item.subtotal) || 0,
        })),
        devolucoes: v.devolucoes || [],
        exclusoes: v.exclusoes || [],
      }));

      // Calcular estatísticas apenas das vendas concluídas
      const vendasConcluidas = vendasMapeadas.filter((v) => v.status !== "cancelada");
      const total = vendasConcluidas.length;
      const faturamento = vendasConcluidas.reduce((acc: number, v: any) => acc + (v.total || 0), 0);
      const ticket = total > 0 ? faturamento / total : 0;

      setVendas(vendasMapeadas);
      setTotalVendas(total);
      setFaturamentoTotal(faturamento);
      setTicketMedio(ticket);
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
      setVendas([]);
      setTotalVendas(0);
      setFaturamentoTotal(0);
      setTicketMedio(0);
    } finally {
      setLoadingVendas(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const adminMaster = localStorage.getItem("admin_master_session");
      if (adminMaster === "true") {
        return true;
      }

      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador || !operador.isAdmin) {
        router.push("/");
        return false;
      }

      return true;
    };

    checkAuth().then((isAuth) => {
      if (isAuth) {
        carregarDados();
        setupRealtimeSync();
      }
    });
  }, [router]);

  // Configurar sincronização em tempo real
  const setupRealtimeSync = () => {
    // Watch operadores em tempo real
    const channelOperadores = AdminSupabase.watchOperadores((ops) => {
      console.log("✅ Operadores atualizados em tempo real:", ops.length);
      setOperadores(ops.filter((op) => !op.isAdmin));
    });

    // Escutar mudanças em vendas e itens_venda em tempo real
    const channelVendas = supabase
      .channel(`admin_vendas_realtime_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendas',
        },
        (payload) => {
          console.log('🔔 [ADMIN] Mudança detectada em vendas:', payload);
          // Usar ref para garantir valor atualizado
          if (operadorSelecionadoRef.current) {
            carregarVendasUsuario(operadorSelecionadoRef.current);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_venda',
        },
        (payload) => {
          console.log('🔔 [ADMIN] Mudança detectada em itens_venda:', payload);
          if (operadorSelecionadoRef.current) {
            carregarVendasUsuario(operadorSelecionadoRef.current);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trocas_extornos',
        },
        (payload) => {
          console.log('🔔 [ADMIN] Mudança detectada em trocas_extornos:', payload);
          if (operadorSelecionadoRef.current) {
            carregarVendasUsuario(operadorSelecionadoRef.current);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [ADMIN] Realtime CONECTADO para vendas, itens e trocas');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [ADMIN] Realtime FECHADO');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [ADMIN] Erro no canal realtime:', err);
        }
      });

    return () => {
      supabase.removeChannel(channelOperadores);
      supabase.removeChannel(channelVendas);
    };
  };

  useEffect(() => {
    if (operadorSelecionado) {
      carregarMensagens();
      carregarVendasUsuario(operadorSelecionado);

      const interval = setInterval(() => {
        carregarMensagens();
      }, 3000);

      // Fallback polling a cada 30s para garantir dados atualizados
      const pollInterval = setInterval(() => {
        if (operadorSelecionadoRef.current) {
          carregarVendasUsuario(operadorSelecionadoRef.current);
        }
      }, 30000);

      return () => {
        clearInterval(interval);
        clearInterval(pollInterval);
      };
    }
  }, [operadorSelecionado, carregarVendasUsuario]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagens]);

  useEffect(() => {
    if (chatPainelRef.current) {
      chatPainelRef.current.scrollTop = chatPainelRef.current.scrollHeight;
    }
  }, [mensagens]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const todosOperadores = await AdminSupabase.getAllOperadores();
      const operadoresUsuarios = todosOperadores.filter((op) => !op.isAdmin);
      setOperadores(operadoresUsuarios);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarMensagens = () => {
    if (!operadorSelecionado) return;

    const chaveChat = `chat_${operadorSelecionado}`;
    const mensagensSalvas = localStorage.getItem(chaveChat);

    if (mensagensSalvas) {
      const msgs: Mensagem[] = JSON.parse(mensagensSalvas);
      setMensagens(msgs);

      const naoLidas = msgs.filter(m => m.remetente === "usuario" && !m.lida).length;
      setMensagensNaoLidas(naoLidas);
    } else {
      setMensagens([]);
      setMensagensNaoLidas(0);
    }
  };

  const marcarMensagensComoLidas = () => {
    if (!operadorSelecionado) return;

    const mensagensAtualizadas = mensagens.map(m => ({
      ...m,
      lida: true
    }));

    const chaveChat = `chat_${operadorSelecionado}`;
    localStorage.setItem(chaveChat, JSON.stringify(mensagensAtualizadas));
    setMensagens(mensagensAtualizadas);
    setMensagensNaoLidas(0);
  };

  const enviarMensagem = () => {
    if (!novaMensagem.trim() || !operadorSelecionado) return;

    const mensagem: Mensagem = {
      id: `msg-${Date.now()}`,
      remetente: "admin",
      texto: novaMensagem,
      dataHora: new Date(),
      lida: false,
    };

    const novasMensagens = [...mensagens, mensagem];
    setMensagens(novasMensagens);

    const chaveChat = `chat_${operadorSelecionado}`;
    localStorage.setItem(chaveChat, JSON.stringify(novasMensagens));

    setNovaMensagem("");
  };

  const operadorAtual = operadores.find((op) => op.id === operadorSelecionado);

  const abrirModalSenha = () => {
    setNovaSenha("");
    setConfirmarSenha("");
    setError("");
    setShowModalSenha(true);
  };

  const trocarSenha = async () => {
    if (!operadorSelecionado) {
      setError("Selecione um usuário primeiro");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!novaSenha || !confirmarSenha) {
      setError("Preencha todos os campos");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (novaSenha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const operador = operadores.find((op) => op.id === operadorSelecionado);
      if (!operador) return;

      const operadorAtualizado = {
        ...operador,
        senha: novaSenha,
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);

      if (sucesso) {
        setSuccess("Senha alterada com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Erro ao alterar senha");
        setTimeout(() => setError(""), 3000);
      }

      setShowModalSenha(false);
    } catch (err) {
      console.error("Erro ao trocar senha:", err);
      setError("Erro ao trocar senha");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Ordenar usuários A-Z ou Z-A
  const operadoresOrdenados = [...operadores].sort((a, b) => {
    if (ordenacaoUsuarios === "asc") {
      return a.nome.localeCompare(b.nome);
    } else {
      return b.nome.localeCompare(a.nome);
    }
  });

  // Filtrar usuários pela busca
  const operadoresFiltrados = operadoresOrdenados.filter((op) => {
    if (!busca) return true;
    const buscaLower = busca.toLowerCase();
    return (
      op.nome.toLowerCase().includes(buscaLower) ||
      op.email.toLowerCase().includes(buscaLower)
    );
  });

  const formatarPagamento = (tipo: string) => {
    const mapa: Record<string, string> = {
      dinheiro: "Dinheiro",
      credito: "Crédito",
      debito: "Débito",
      pix: "PIX",
      outros: "Outros",
    };
    return mapa[tipo] || tipo || "Não informado";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando análise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <Store className="w-8 h-8" />
                <span>Análise de Lojas</span>
              </h1>
              <p className="text-purple-200">Gestão de usuários e comunicação</p>
            </div>

            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alertas */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Seleção de Usuário */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <User className="w-7 h-7 mr-3" />
                Selecionar Usuário
              </h2>
              <button
                onClick={() => setOrdenacaoUsuarios(ordenacaoUsuarios === "asc" ? "desc" : "asc")}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                title={ordenacaoUsuarios === "asc" ? "Ordenar Z-A" : "Ordenar A-Z"}
              >
                <ArrowUpDown className="w-5 h-5" />
                <span className="text-sm">{ordenacaoUsuarios === "asc" ? "A-Z" : "Z-A"}</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar usuário..."
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {operadorSelecionado && (
                <button
                  onClick={abrirModalSenha}
                  className="flex items-center space-x-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-lg font-semibold"
                >
                  <Key className="w-5 h-5" />
                  <span>Trocar Senha</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operadoresFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <User className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-lg">Nenhum usuário encontrado</p>
              </div>
            ) : (
              operadoresFiltrados.map((operador) => (
                <button
                  key={operador.id}
                  onClick={() => {
                    setOperadorSelecionado(operador.id);
                  }}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    operadorSelecionado === operador.id
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                      {operador.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">
                        {operador.nome}
                      </h3>
                      <p className="text-purple-200 text-sm">{operador.email}</p>
                    </div>
                    {operadorSelecionado === operador.id && (
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Estatísticas em tempo real */}
        {operadorSelecionado && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <ShoppingCart className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-2">
                  {loadingVendas ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  ) : null}
                  <span className="text-white font-bold text-lg">{totalVendas}</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">
                Total de Vendas
              </h3>
              <p className="text-blue-100 text-sm">Vendas realizadas</p>
            </div>

            <div className="bg-green-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-bold text-lg">R$ {faturamentoTotal.toFixed(2)}</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Faturamento</h3>
              <p className="text-green-100 text-sm">Total arrecadado</p>
            </div>

            <div className="bg-purple-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-bold text-lg">R$ {ticketMedio.toFixed(2)}</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">
                Ticket Médio
              </h3>
              <p className="text-purple-100 text-sm">Valor médio por venda</p>
            </div>
          </div>
        )}

        {/* Painel de Chat Fixo */}
        {operadorSelecionado && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-blue-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <MessageCircle className="w-7 h-7 text-white" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Chat com {operadorAtual?.nome}</h2>
                    <p className="text-blue-100 text-sm">Mensagens em tempo real</p>
                  </div>
                </div>
                {mensagensNaoLidas > 0 && (
                  <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold animate-pulse">
                    {mensagensNaoLidas} nova{mensagensNaoLidas > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div
                ref={chatPainelRef}
                className="h-96 overflow-y-auto mb-4 space-y-3 bg-white/5 rounded-xl p-4 border border-white/10"
              >
                {mensagens.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">
                      Nenhuma mensagem ainda
                    </p>
                    <p className="text-white/30 text-sm mt-2">
                      Inicie uma conversa com o usuário
                    </p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.remetente === "admin" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-5 py-3 rounded-2xl shadow-lg ${
                          msg.remetente === "admin"
                            ? "bg-blue-600 text-white"
                            : "bg-white/20 text-white border border-white/20"
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">{msg.texto}</p>
                        <div className="flex items-center justify-between space-x-3">
                          <p className="text-xs opacity-70">
                            {format(new Date(msg.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          {msg.remetente === "usuario" && !msg.lida && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                              Nova
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && enviarMensagem()}
                  onFocus={marcarMensagensComoLidas}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!novaMensagem.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span className="font-semibold">Enviar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de Vendas */}
        {operadorSelecionado && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-purple-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ShoppingCart className="w-7 h-7 text-white" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Histórico de Vendas</h2>
                    <p className="text-purple-100 text-sm">
                      {loadingVendas ? "Carregando..." : `${vendas.length} venda(s) registrada(s)`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => carregarVendasUsuario(operadorSelecionado)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingVendas ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingVendas ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-white/50">Carregando vendas...</p>
                </div>
              ) : vendas.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50 text-lg">Nenhuma venda encontrada para este usuário</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {vendas.map((venda) => (
                    <div
                      key={venda.id}
                      className={`rounded-xl p-6 border transition-all ${
                        venda.status === "cancelada"
                          ? "bg-red-500/5 border-red-500/30"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-white font-bold text-lg">Venda #{venda.numero}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              venda.status === "concluida" ? "bg-green-500/20 text-green-300" :
                              venda.status === "cancelada" ? "bg-red-500/20 text-red-300" :
                              "bg-blue-500/20 text-blue-300"
                            }`}>
                              {venda.status === "cancelada" ? "Cancelada" : "Concluída"}
                            </span>
                          </div>
                          <p className="text-purple-200 text-sm">
                            {(() => {
                              try {
                                return format(new Date(venda.dataHora || venda.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                              } catch {
                                return "Data inválida";
                              }
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-xl">R$ {(venda.total || 0).toFixed(2)}</p>
                          <p className="text-purple-200 text-sm">{formatarPagamento(venda.tipo_pagamento || venda.forma_pagamento || '')}</p>
                        </div>
                      </div>

                      {/* Itens da venda */}
                      {venda.itens && venda.itens.length > 0 && (
                        <div className="space-y-1 mb-4">
                          {venda.itens.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                              <span className="text-purple-200">{item.quantidade}x {item.nome}</span>
                              <span className="text-white font-semibold">R$ {(item.subtotal || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Devoluções */}
                      {venda.devolucoes && venda.devolucoes.length > 0 && (
                        <div className="mb-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                          <p className="text-orange-300 text-sm font-semibold mb-1">Devoluções/Extornos:</p>
                          {venda.devolucoes.map((dev: any, idx: number) => (
                            <p key={idx} className="text-orange-200 text-xs">
                              • {dev.quantidade}x {dev.nomeProduto} — {dev.motivo}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Botões de impressão */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => window.open(`/imprimir-nota/${venda.id}`, '_blank')}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all font-semibold"
                        >
                          <Printer className="w-5 h-5" />
                          <span>Cupom</span>
                        </button>

                        <button
                          onClick={() => window.open(`/imprimir-nota/${venda.id}`, '_blank')}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all font-semibold"
                        >
                          <Printer className="w-5 h-5" />
                          <span>NFC-e</span>
                        </button>

                        <button
                          onClick={() => window.open(`/imprimir-nota/${venda.id}`, '_blank')}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all font-semibold"
                        >
                          <Printer className="w-5 h-5" />
                          <span>Nota Completa</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Flutuante */}
      {operadorSelecionado && (
        <>
          <button
            onClick={() => {
              setChatAberto(!chatAberto);
              if (!chatAberto) {
                marcarMensagensComoLidas();
              }
            }}
            className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center z-50"
          >
            <MessageCircle className="w-7 h-7" />
            {mensagensNaoLidas > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {mensagensNaoLidas}
              </span>
            )}
          </button>

          {chatAberto && (
            <div className="fixed bottom-28 right-8 w-80 h-[420px] bg-slate-900 rounded-2xl shadow-2xl border border-white/20 flex flex-col z-50">
              <div className="bg-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">
                    {operadorAtual?.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{operadorAtual?.nome}</h3>
                    <p className="text-blue-100 text-xs">Chat com usuário</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatAberto(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                ref={chatRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {mensagens.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">
                      Nenhuma mensagem ainda
                    </p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.remetente === "admin" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-lg ${
                          msg.remetente === "admin"
                            ? "bg-blue-600 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        <p className="text-sm">{msg.texto}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.dataHora), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && enviarMensagem()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={enviarMensagem}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Troca de Senha */}
      {showModalSenha && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Trocar Senha</h3>
              <button
                onClick={() => setShowModalSenha(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {operadorAtual && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-purple-200 text-sm mb-1">Usuário</p>
                  <p className="text-white font-bold text-lg">
                    {operadorAtual.nome}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Digite a nova senha"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Confirme a nova senha"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModalSenha(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={trocarSenha}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold shadow-lg"
                >
                  Trocar Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
