"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    const checkAuth = async () => {
      // Verificar se é admin master (login direto)
      const adminMaster = localStorage.getItem("admin_master_session");
      if (adminMaster === "true") {
        return true;
      }

      // Verificar se é admin via Supabase Auth
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
    // Watch operadores ativos em tempo real
    const channelOperadores = AdminSupabase.watchOperadores((ops) => {
      console.log("✅ Operadores ativos atualizados em tempo real:", ops.length);
      setOperadores(ops.filter((op) => !op.isAdmin));
    });

    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channelOperadores);
    };
  };

  useEffect(() => {
    if (operadorSelecionado) {
      carregarMensagens();
      // Verificar novas mensagens do usuário a cada 3 segundos
      const interval = setInterval(() => {
        carregarMensagens();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [operadorSelecionado]);

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
      
      // Carregar operadores ativos
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
      
      // Contar mensagens não lidas do usuário
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
              {/* Busca */}
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
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all shadow-lg font-semibold"
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
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
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

        {/* Estatísticas */}
        {operadorSelecionado && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <ShoppingCart className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-bold text-lg">0</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">
                Total de Vendas
              </h3>
              <p className="text-blue-100 text-sm">Vendas realizadas</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-bold text-lg">R$ 0,00</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Faturamento</h3>
              <p className="text-green-100 text-sm">Total arrecadado</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-12 h-12 text-white/80" />
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <span className="text-white font-bold text-lg">R$ 0,00</span>
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
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
              {/* Área de Mensagens */}
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
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
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

              {/* Input de Mensagem */}
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
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span className="font-semibold">Enviar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Flutuante */}
      {operadorSelecionado && (
        <>
          {/* Botão do Chat */}
          <button
            onClick={() => {
              setChatAberto(!chatAberto);
              if (!chatAberto) {
                marcarMensagensComoLidas();
              }
            }}
            className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center z-50"
          >
            <MessageCircle className="w-7 h-7" />
            {mensagensNaoLidas > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {mensagensNaoLidas}
              </span>
            )}
          </button>

          {/* Janela do Chat */}
          {chatAberto && (
            <div className="fixed bottom-28 right-8 w-80 h-[420px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/20 flex flex-col z-50">
              {/* Header do Chat */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
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

              {/* Mensagens */}
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
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
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

              {/* Input de Mensagem */}
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
                    className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
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
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-semibold shadow-lg"
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
