"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSupabase } from "@/lib/admin-supabase";
import { Operador, Pagamento, GanhoAdmin } from "@/lib/types";
import { db } from "@/lib/db";
import {
  Wallet,
  Store,
  Users,
  Clock,
  UserX,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Eye,
  EyeOff,
  Filter,
  UserCheck,
  UserMinus,
  ExternalLink,
  Edit,
  MessageSquare,
  AlertTriangle,
  Search,
  Check,
  Calendar,
} from "lucide-react";
import { addDays, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

type FiltroStatus = "todos" | "ativo" | "suspenso" | "inativo";

interface Mensagem {
  id: string;
  remetente: "admin" | "usuario";
  texto: string;
  dataHora: string;
  lida: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNome, setAdminNome] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Modal de criação de usuário
  const [showModal, setShowModal] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    email: "",
    senha: "",
    formaPagamento: "pix" as "cartao" | "pix",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal de edição de senha e email
  const [showEditModal, setShowEditModal] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<Operador | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  // Gerenciar dias removido - dias são fixos pela compra

  // Controle de visualização de senhas
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  
  // Filtro de status
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [mostrarFiltro, setMostrarFiltro] = useState(false);

  // Busca de usuário
  const [buscaUsuario, setBuscaUsuario] = useState("");

  // Chat - Notificações
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  // Modal de confirmação de pagamento
  const [showConfirmarPagamentoModal, setShowConfirmarPagamentoModal] = useState(false);
  const [operadorParaConfirmar, setOperadorParaConfirmar] = useState<Operador | null>(null);
  const [diasAtivacao, setDiasAtivacao] = useState(60);

  // Modal de edição de data de vencimento
  const [showEditVencimentoModal, setShowEditVencimentoModal] = useState(false);
  const [operadorParaEditarVencimento, setOperadorParaEditarVencimento] = useState<Operador | null>(null);
  const [novaDataVencimento, setNovaDataVencimento] = useState("");

  // Modal de excluir usuário
  const [showExcluirUsuarioModal, setShowExcluirUsuarioModal] = useState(false);
  const [operadorParaExcluir, setOperadorParaExcluir] = useState<Operador | null>(null);

  const WHATSAPP_CONTATO = "5565981032239";

  useEffect(() => {
    // Verificar autenticação
    const checkAuth = async () => {
      // Verificar se é admin master (login direto)
      const adminMaster = localStorage.getItem("admin_master_session");
      if (adminMaster === "true") {
        setAdminNome("Administrador");
        setIsAuthenticated(true);
        return true;
      }

      // Verificar se é admin via Supabase Auth
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador || !operador.isAdmin) {
        router.push("/");
        return false;
      }

      setAdminNome(operador.nome);
      setIsAuthenticated(true);
      return true;
    };

    checkAuth().then((isAuth) => {
      if (isAuth) {
        carregarOperadores();
        setupRealtimeSync();
      }
    });
  }, [router]);

  // Configurar sincronização em tempo real
  const setupRealtimeSync = () => {
    // Watch operadores em tempo real
    const channelOperadores = AdminSupabase.watchOperadores((ops) => {
      setOperadores(ops);
    });

    // Watch mensagens não lidas em tempo real
    const channelMensagens = AdminSupabase.watchMensagensNaoLidas((count) => {
      setMensagensNaoLidas(count);
    });

    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channelOperadores);
      supabase.removeChannel(channelMensagens);
    };
  };

  const carregarOperadores = async () => {
    try {
      setLoading(true);
      const todosOperadores = await AdminSupabase.getAllOperadores();
      setOperadores(todosOperadores);

      // Carregar contagem de mensagens não lidas
      const count = await AdminSupabase.contarMensagensNaoLidas();
      setMensagensNaoLidas(count);
    } catch (err) {
      // Falha silenciosa - Supabase pode não estar configurado
    } finally {
      setLoading(false);
    }
  };

  // Registrar ganho do admin
  const registrarGanho = async (
    tipo: "conta-criada" | "mensalidade-paga",
    usuarioId: string,
    usuarioNome: string,
    valor: number,
    formaPagamento: "cartao" | "pix",
    diasAssinatura?: number
  ) => {
    try {
      // Determinar descrição baseada na forma de pagamento e dias
      let descricao = "";

      if (formaPagamento === "pix") {
        descricao = tipo === "conta-criada"
          ? `Conta criada - ${usuarioNome} (PIX) - R$ 59,90 - 60 dias`
          : `Pagamento confirmado - ${usuarioNome} (PIX) - R$ 59,90 - 60 dias`;
      } else if (formaPagamento === "cartao") {
        descricao = tipo === "conta-criada"
          ? `Conta criada - ${usuarioNome} (Cartão de Crédito) - R$ 149,70 - 180 dias`
          : `Pagamento confirmado - ${usuarioNome} (Cartão de Crédito) - R$ 149,70 - 180 dias`;
      }

      const ganhoId = `ganho-${Date.now()}`;

      // Salvar no Supabase primeiro
      const sucessoSupabase = await AdminSupabase.addGanhoAdmin({
        id: ganhoId,
        tipo,
        usuario_id: usuarioId,
        usuario_nome: usuarioNome,
        valor,
        forma_pagamento: formaPagamento,
        descricao,
      });

      if (sucessoSupabase) {
        console.log("✅ Ganho registrado no Supabase!");
      }

      // Salvar também localmente como backup
      const ganho: GanhoAdmin = {
        id: ganhoId,
        tipo,
        usuarioId,
        usuarioNome,
        valor,
        formaPagamento,
        dataHora: new Date(),
        descricao,
      };

      await db.addGanhoAdmin(ganho);
      console.log("✅ Ganho registrado localmente!");
    } catch (err) {
      console.error("Erro ao registrar ganho:", err);
    }
  };

  const handleCriarUsuario = async () => {
    if (!novoUsuario.email || !novoUsuario.senha) {
      setError("Preencha todos os campos");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoUsuario.email.trim())) {
      setError("Digite um email válido");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (novoUsuario.senha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      // Extrair nome do email (parte antes do @)
      const nomeExtraido = novoUsuario.email.split("@")[0];

      let valorPagamento = 0;
      let dataProximoVencimento = null;
      let ativo = false;
      let diasAssinatura = 0;

      if (novoUsuario.formaPagamento === "cartao") {
        valorPagamento = 149.70;
        diasAssinatura = 180;
        dataProximoVencimento = addDays(new Date(), diasAssinatura);
      } else if (novoUsuario.formaPagamento === "pix") {
        valorPagamento = 59.90;
        diasAssinatura = 60;
        dataProximoVencimento = addDays(new Date(), diasAssinatura);
      }

      const novoOperador: Operador = {
        id: `user-${Date.now()}`,
        nome: nomeExtraido,
        email: novoUsuario.email.trim(),
        senha: novoUsuario.senha,
        isAdmin: false,
        ativo: ativo,
        createdAt: new Date(),
        formaPagamento: novoUsuario.formaPagamento,
        valorMensal: valorPagamento,
        dataProximoVencimento: dataProximoVencimento || undefined,
        aguardandoPagamento: true,
        diasAssinatura: diasAssinatura,
      };

      const sucesso = await AdminSupabase.addOperador(novoOperador);

      if (!sucesso) {
        setError("Erro ao criar usuário no Supabase");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Registrar ganho
      await registrarGanho(
        "conta-criada",
        novoOperador.id,
        novoOperador.nome,
        valorPagamento,
        novoUsuario.formaPagamento
      );

      setSuccess("Usuário criado com sucesso! Aguardando pagamento.");
      setTimeout(() => setSuccess(""), 3000);
      setShowModal(false);
      setNovoUsuario({
        email: "",
        senha: "",
        formaPagamento: "pix",
      });
    } catch (err) {
      console.error("Erro ao criar usuário:", err);
      setError("Erro ao criar usuário");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Abrir modal de confirmação de pagamento
  const abrirModalConfirmarPagamento = (operador: Operador) => {
    setOperadorParaConfirmar(operador);
    // Usar diasAssinatura que foi definido ao criar o usuário, ou usar padrão baseado na forma de pagamento
    const diasPadrao = operador.diasAssinatura || (operador.formaPagamento === "pix" ? 60 : 180);
    setDiasAtivacao(diasPadrao);
    setShowConfirmarPagamentoModal(true);
  };

  // Confirmar pagamento manualmente com dias personalizados
  const handleConfirmarPagamento = async () => {
    if (!operadorParaConfirmar) return;

    try {
      const operador = operadorParaConfirmar;
      const dataProximoVencimento = addDays(new Date(), diasAtivacao);

      const operadorAtualizado = {
        ...operador,
        ativo: true,
        suspenso: false,
        aguardandoPagamento: false,
        dataPagamento: new Date(),
        dataProximoVencimento: dataProximoVencimento,
        diasAssinatura: diasAtivacao,
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);
      
      if (sucesso) {
        // Registrar ganho do pagamento
        if (operador.valorMensal && operador.formaPagamento && (operador.formaPagamento === "pix" || operador.formaPagamento === "cartao")) {
          await registrarGanho(
            "mensalidade-paga",
            operador.id,
            operador.nome,
            operador.valorMensal,
            operador.formaPagamento
          );
        }

        setSuccess(`Pagamento confirmado! Usuário ativado com ${diasAtivacao} dias de acesso.`);
        setTimeout(() => setSuccess(""), 3000);
        setShowConfirmarPagamentoModal(false);
        setOperadorParaConfirmar(null);
        // Resetar para o padrão inicial (será redefinido ao abrir modal novamente)
        setDiasAtivacao(60);
      } else {
        setError("Erro ao confirmar pagamento");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      setError("Erro ao confirmar pagamento");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Abrir modal de edição de data de vencimento
  const abrirModalEditarVencimento = (operador: Operador) => {
    setOperadorParaEditarVencimento(operador);
    // Definir data atual de vencimento ou data de hoje
    const dataAtual = operador.dataProximoVencimento 
      ? format(new Date(operador.dataProximoVencimento), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    setNovaDataVencimento(dataAtual);
    setShowEditVencimentoModal(true);
  };

  // Salvar nova data de vencimento
  const handleSalvarVencimento = async () => {
    if (!operadorParaEditarVencimento || !novaDataVencimento) return;

    try {
      const operador = operadorParaEditarVencimento;
      const dataVencimento = new Date(novaDataVencimento);

      const operadorAtualizado = {
        ...operador,
        dataProximoVencimento: dataVencimento,
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);
      
      if (sucesso) {
        setSuccess("Data de vencimento atualizada com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
        setShowEditVencimentoModal(false);
        setOperadorParaEditarVencimento(null);
        setNovaDataVencimento("");
      } else {
        setError("Erro ao atualizar data de vencimento");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Erro ao atualizar data de vencimento:", err);
      setError("Erro ao atualizar data de vencimento");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSuspenderUsuario = async (operadorId: string) => {
    try {
      const operador = operadores.find(op => op.id === operadorId);
      if (!operador) return;

      const operadorAtualizado = {
        ...operador,
        ativo: false,
        suspenso: true,
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);
      
      if (sucesso) {
        setSuccess("Usuário suspenso com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Erro ao suspender usuário");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Erro ao suspender usuário:", err);
      setError("Erro ao suspender usuário");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleRetomarUsuario = async (operadorId: string) => {
    try {
      const operador = operadores.find(op => op.id === operadorId);
      if (!operador) return;

      const operadorAtualizado = {
        ...operador,
        ativo: true,
        suspenso: false,
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);
      
      if (sucesso) {
        setSuccess("Usuário reativado com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Erro ao reativar usuário");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Erro ao reativar usuário:", err);
      setError("Erro ao reativar usuário");
      setTimeout(() => setError(""), 3000);
    }
  };

  const abrirModalEditarSenha = (operador: Operador) => {
    setUsuarioParaEditar(operador);
    setNovaSenha("");
    setNovoEmail(operador.email);
    setShowEditModal(true);
  };

  // Função removida - gerenciar dias desativado

  const abrirModalExcluirUsuario = (operador: Operador) => {
    setOperadorParaExcluir(operador);
    setShowExcluirUsuarioModal(true);
  };

  const handleExcluirUsuario = async () => {
    if (!operadorParaExcluir) return;

    try {
      const sucesso = await AdminSupabase.deleteOperador(operadorParaExcluir.id);

      if (sucesso) {
        setSuccess(`Usuário "${operadorParaExcluir.nome}" excluído com sucesso!`);
        setTimeout(() => setSuccess(""), 3000);
        setShowExcluirUsuarioModal(false);
        setOperadorParaExcluir(null);
      } else {
        setError("Erro ao excluir usuário");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      setError("Erro ao excluir usuário");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEditarSenha = async () => {
    if (!usuarioParaEditar) return;

    // Validar email
    if (!novoEmail || !novoEmail.includes("@")) {
      setError("Digite um email válido");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Validar senha se foi informada
    if (novaSenha && novaSenha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const operadorAtualizado = {
        ...usuarioParaEditar,
        email: novoEmail,
        ...(novaSenha && { senha: novaSenha }),
      };

      const sucesso = await AdminSupabase.updateOperador(operadorAtualizado);

      if (sucesso) {
        setSuccess("Dados alterados com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Erro ao alterar dados");
        setTimeout(() => setError(""), 3000);
      }

      setShowEditModal(false);
      setUsuarioParaEditar(null);
      setNovaSenha("");
      setNovoEmail("");
    } catch (err) {
      console.error("Erro ao alterar dados:", err);
      setError("Erro ao alterar dados");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Função removida - gerenciar dias desativado

  const abrirPaginaChat = () => {
    router.push("/admin/lojas");
  };

  const operadoresFiltrados = operadores
    .filter((op) => !op.isAdmin)
    .filter((op) => {
      if (filtroStatus === "todos") return true;
      if (filtroStatus === "ativo") return op.ativo && !op.suspenso;
      if (filtroStatus === "suspenso") return op.suspenso;
      if (filtroStatus === "inativo") return !op.ativo && !op.suspenso;
      return true;
    })
    .filter((op) => {
      if (!buscaUsuario) return true;
      return op.nome.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
             op.email.toLowerCase().includes(buscaUsuario.toLowerCase());
    });

  const usuariosAtivos = operadores.filter((op) => op.ativo && !op.isAdmin && !op.suspenso).length;
  const usuariosPendentes = operadores.filter((op) => !op.isAdmin && op.aguardandoPagamento === true).length;
  const usuariosInativos = operadores.filter((op) => !op.ativo || op.suspenso).length;
  
  // Calcular usuários com 5 dias para vencer
  const usuariosProximosVencimento = operadores.filter((op) => {
    if (op.isAdmin || !op.dataProximoVencimento) return false;
    const diasRestantes = differenceInDays(new Date(op.dataProximoVencimento), new Date());
    return diasRestantes <= 5 && diasRestantes >= 0;
  }).length;

  // Não renderizar até estar autenticado
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header com botões */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Botão Esquerdo - Carteira de Ganhos */}
            <button
              onClick={() => router.push("/admin/carteira")}
              className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Wallet className="w-5 h-5" />
              <span className="font-semibold">Carteira de Ganhos</span>
            </button>

            {/* Centro - Título */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-1">
                Painel Administrativo
              </h1>
              <p className="text-purple-200">Olá, {adminNome}</p>
              <p className="text-xs text-green-400 mt-1">🟢 Sincronizado em tempo real</p>
            </div>

            {/* Botões Direita - Análise de Lojas e Sair */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push("/admin/lojas")}
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Store className="w-5 h-5" />
                <span className="font-semibold">Análise de Lojas</span>
              </button>
              
              <button
                onClick={async () => {
                  // Fazer logout no Supabase (limpa sessão)
                  const { AuthSupabase } = await import("@/lib/auth-supabase");
                  await AuthSupabase.signOut();

                  // Limpar localStorage (apenas backup local)
                  localStorage.clear();

                  router.push("/");
                }}
                className="px-4 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30"
                title="Sair"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertas */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Cards de Estatísticas - Centro Superior */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Usuários Ativos */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{usuariosAtivos}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Usuários Ativos</h3>
            <p className="text-green-100 text-sm">Contas ativas no sistema</p>
          </div>

          {/* Pendentes de Pagamento */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{usuariosPendentes}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Pendentes Pagamento</h3>
            <p className="text-orange-100 text-sm">Aguardando confirmação</p>
          </div>

          {/* Próximos ao Vencimento (5 dias) - NOVO BALÃO AMARELO */}
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{usuariosProximosVencimento}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Próximos ao Vencimento</h3>
            <p className="text-yellow-100 text-sm">Contas com 5 dias para vencer</p>
          </div>

          {/* Usuários Inativos */}
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <UserX className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{usuariosInativos}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Usuários Inativos</h3>
            <p className="text-slate-200 text-sm">Contas suspensas ou desativadas</p>
          </div>
        </div>

        {/* Seção de Gerenciamento de Usuários */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Users className="w-7 h-7 mr-3" />
              Gerenciar Usuários
            </h2>
            <div className="flex items-center space-x-3">
              {/* Campo de Busca */}
              <div className="relative">
                <Search className="w-5 h-5 text-white/60 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                  placeholder="Buscar usuário..."
                  className="pl-10 pr-4 py-3 bg-white/20 text-white placeholder-white/60 rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none transition-all w-64"
                />
              </div>

              {/* Botão Ver Senhas */}
              <button
                onClick={() => setMostrarSenhas(!mostrarSenhas)}
                className="flex items-center space-x-2 px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all shadow-lg"
                title={mostrarSenhas ? "Ocultar senhas" : "Mostrar senhas"}
              >
                {mostrarSenhas ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>

              {/* Botão Notificações de Chat */}
              <button
                onClick={abrirPaginaChat}
                className="relative flex items-center space-x-2 px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all shadow-lg"
                title="Ver mensagens dos usuários"
              >
                <MessageSquare className="w-5 h-5" />
                {mensagensNaoLidas > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                    {mensagensNaoLidas}
                  </span>
                )}
              </button>

              {/* Botão Filtro */}
              <div className="relative">
                <button
                  onClick={() => setMostrarFiltro(!mostrarFiltro)}
                  className="flex items-center space-x-2 px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all shadow-lg"
                >
                  <Filter className="w-5 h-5" />
                </button>

                {mostrarFiltro && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-white/20 overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setFiltroStatus("todos");
                        setMostrarFiltro(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                        filtroStatus === "todos" ? "bg-white/20 text-white font-semibold" : "text-purple-200"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => {
                        setFiltroStatus("ativo");
                        setMostrarFiltro(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                        filtroStatus === "ativo" ? "bg-white/20 text-white font-semibold" : "text-purple-200"
                      }`}
                    >
                      Ativos
                    </button>
                    <button
                      onClick={() => {
                        setFiltroStatus("suspenso");
                        setMostrarFiltro(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                        filtroStatus === "suspenso" ? "bg-white/20 text-white font-semibold" : "text-purple-200"
                      }`}
                    >
                      Suspensos
                    </button>
                    <button
                      onClick={() => {
                        setFiltroStatus("inativo");
                        setMostrarFiltro(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                        filtroStatus === "inativo" ? "bg-white/20 text-white font-semibold" : "text-purple-200"
                      }`}
                    >
                      Inativos
                    </button>
                  </div>
                )}
              </div>

              {/* Botão Criar Usuário */}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all shadow-lg font-semibold transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Criar Novo Usuário</span>
              </button>
            </div>
          </div>

          <div className="p-8">
            {operadoresFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-purple-300 mx-auto mb-4 opacity-50" />
                <p className="text-purple-200 text-lg">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {operadoresFiltrados.map((operador) => {
                  // Calcular dias restantes
                  let diasRestantes = 0;
                  let mostrarAlertaRenovacao = false;
                  
                  if (operador.dataProximoVencimento) {
                    diasRestantes = differenceInDays(new Date(operador.dataProximoVencimento), new Date());
                    mostrarAlertaRenovacao = diasRestantes <= 5 && diasRestantes >= 0;
                  }

                  return (
                    <div
                      key={operador.id}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        {/* Informações do usuário */}
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                            {operador.nome.charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">
                              {operador.nome}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm flex-wrap">
                              <p className="text-purple-200">
                                Login: <span className="font-mono">{operador.email}</span>
                              </p>
                              <p className="text-purple-200">
                                Senha: <span className="font-mono">{mostrarSenhas ? operador.senha : "••••••"}</span>
                              </p>
                              {operador.dataProximoVencimento && (
                                <>
                                  <p className="text-purple-200">
                                    Vencimento: <span className="font-mono">{format(new Date(operador.dataProximoVencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                                  </p>
                                  <p className={`font-semibold ${
                                    diasRestantes > 10 ? "text-green-300" :
                                    diasRestantes > 5 ? "text-yellow-300" :
                                    "text-red-300"
                                  }`}>
                                    {diasRestantes >= 0 ? `${diasRestantes} dias restantes` : "Vencido"}
                                  </p>
                                </>
                              )}
                            </div>
                            
                            {/* Alerta de renovação (5 dias antes) */}
                            {mostrarAlertaRenovacao && (
                              <div className="mt-2 flex items-center space-x-2 text-xs bg-orange-500/20 border border-orange-500/30 rounded-lg p-2">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                <span className="text-orange-300 font-semibold">
                                  Renovação necessária em {diasRestantes} dias! Entre em contato pelo WhatsApp: {WHATSAPP_CONTATO}
                                </span>
                              </div>
                            )}

                            {operador.formaPagamento && (
                              <div className="mt-2 flex items-center space-x-2 text-xs">
                                <CreditCard className="w-4 h-4 text-purple-300" />
                                <span className="text-purple-300">
                                  {operador.formaPagamento === "pix" ? "PIX" : "Cartão"} - R$ {operador.valorMensal?.toFixed(2)}
                                  {operador.formaPagamento === "pix" ? " (60 dias)" : " (180 dias)"}
                                </span>
                                {operador.dataProximoVencimento && (
                                  <span className="text-purple-300">
                                    | Vence em: {format(new Date(operador.dataProximoVencimento), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                )}
                                {operador.aguardandoPagamento && (
                                  <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-semibold border border-orange-500/30 ml-2">
                                    Aguardando Pagamento
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status e ações */}
                        <div className="flex items-center space-x-3">
                          {/* Botão Editar Data de Vencimento - À ESQUERDA do status */}
                          {operador.dataProximoVencimento && (
                            <button
                              onClick={() => abrirModalEditarVencimento(operador)}
                              className="p-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/30"
                              title="Editar data de vencimento"
                            >
                              <Calendar className="w-5 h-5" />
                            </button>
                          )}

                          {/* Data de Ativação e Dias Restantes */}
                          <div className="flex flex-col space-y-2">
                            {/* Data de Ativação */}
                            <div className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                              <Calendar className="w-4 h-4" />
                              <span className="text-xs font-semibold">
                                Ativado: {format(new Date(operador.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>

                            {/* Dias Restantes - SEMPRE MOSTRAR */}
                            {(() => {
                              if (!operador.dataProximoVencimento) {
                                // Usuário sem data de vencimento - aguardando pagamento
                                return (
                                  <div className="flex items-center space-x-1 px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg border border-orange-500/30">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-xs font-semibold">
                                      Aguardando pagamento
                                    </span>
                                  </div>
                                );
                              }

                              // Usuário com data de vencimento
                              const hoje = new Date();
                              const vencimento = new Date(operador.dataProximoVencimento);
                              const diasRestantesCalc = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

                              return (
                                <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg border ${
                                  diasRestantesCalc > 10 ? "bg-green-500/20 text-green-300 border-green-500/30" :
                                  diasRestantesCalc > 5 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                                  "bg-red-500/20 text-red-300 border-red-500/30"
                                }`}>
                                  <Calendar className="w-4 h-4" />
                                  <span className="text-xs font-semibold">
                                    {diasRestantesCalc >= 0 ? `${diasRestantesCalc} dias restantes` : "Vencido"}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Badge de status */}
                          {operador.suspenso ? (
                            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-semibold border border-orange-500/30">
                              Suspenso
                            </span>
                          ) : operador.ativo ? (
                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold border border-green-500/30">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500/30">
                              Inativo
                            </span>
                          )}

                          {/* Botão Confirmar Pagamento */}
                          {operador.aguardandoPagamento && (
                            <button
                              onClick={() => abrirModalConfirmarPagamento(operador)}
                              className="p-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all border border-green-500/30"
                              title="Confirmar pagamento manualmente"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          )}

                          {/* Botão Editar Senha */}
                          <button
                            onClick={() => abrirModalEditarSenha(operador)}
                            className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all border border-blue-500/30"
                            title="Editar senha"
                          >
                            <Edit className="w-5 h-5" />
                          </button>

                          {/* Botão Suspender/Retomar */}
                          {operador.suspenso || !operador.ativo ? (
                            <button
                              onClick={() => handleRetomarUsuario(operador.id)}
                              className="p-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all border border-green-500/30"
                              title="Reativar usuário"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspenderUsuario(operador.id)}
                              className="p-2 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-all border border-orange-500/30"
                              title="Suspender usuário"
                            >
                              <UserMinus className="w-5 h-5" />
                            </button>
                          )}

                          {/* Botão Excluir Usuário */}
                          <button
                            onClick={() => abrirModalExcluirUsuario(operador)}
                            className="p-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/30"
                            title="Excluir usuário"
                          >
                            <UserX className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação de Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">Criar Novo Usuário</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={novoUsuario.email}
                  onChange={(e) =>
                    setNovoUsuario({ ...novoUsuario, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Digite o email do usuário"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={novoUsuario.senha}
                  onChange={(e) =>
                    setNovoUsuario({ ...novoUsuario, senha: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Digite a senha"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-3">
                  Forma de Pagamento
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      setNovoUsuario({ ...novoUsuario, formaPagamento: "pix" })
                    }
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      novoUsuario.formaPagamento === "pix"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold text-xs">PIX</span>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold">PIX</p>
                          <p className="text-purple-200 text-sm">R$ 59,90 - 60 dias de acesso</p>
                        </div>
                      </div>
                      {novoUsuario.formaPagamento === "pix" && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setNovoUsuario({ ...novoUsuario, formaPagamento: "cartao" })
                    }
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      novoUsuario.formaPagamento === "cartao"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <p className="text-white font-semibold">Cartão de Crédito</p>
                          <p className="text-purple-200 text-sm">R$ 149,70 - 180 dias | Até 3x sem juros</p>
                        </div>
                      </div>
                      {novoUsuario.formaPagamento === "cartao" && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Informações de Pagamento</p>
                    <p>
                      {novoUsuario.formaPagamento === "pix"
                        ? "PIX: R$ 59,90 - 60 dias de acesso. Após criar a conta, o usuário receberá o link de pagamento."
                        : "Cartão: R$ 149,70 - 180 dias de acesso. Parcelamento em até 3x sem juros. Após criar a conta, o usuário receberá o link de pagamento."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarUsuario}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>Criar Usuário</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Pagamento */}
      {showConfirmarPagamentoModal && operadorParaConfirmar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Confirmar Pagamento</h3>
              <button
                onClick={() => {
                  setShowConfirmarPagamentoModal(false);
                  setOperadorParaConfirmar(null);
                  setDiasAtivacao(60);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-purple-200 text-sm mb-4">
                  Confirmando pagamento do usuário: <span className="font-bold text-white">{operadorParaConfirmar.nome}</span>
                </p>
                
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Quantos dias a conta ficará ativa?
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="number"
                    value={diasAtivacao}
                    onChange={(e) => setDiasAtivacao(parseInt(e.target.value) || 60)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="60"
                    min="1"
                  />
                </div>
                <p className="text-purple-300 text-xs mt-2">
                  Padrão: {operadorParaConfirmar.formaPagamento === "pix" ? "60 dias (PIX)" : "180 dias (Cartão)"}. Você pode personalizar conforme necessário.
                </p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Informação</p>
                    <p>
                      O usuário será ativado com {diasAtivacao} dias de acesso. 
                      Um alerta de renovação aparecerá 5 dias antes do vencimento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowConfirmarPagamentoModal(false);
                    setOperadorParaConfirmar(null);
                    setDiasAtivacao(60);
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarPagamento}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Data de Vencimento */}
      {showEditVencimentoModal && operadorParaEditarVencimento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Editar Data de Vencimento</h3>
              <button
                onClick={() => {
                  setShowEditVencimentoModal(false);
                  setOperadorParaEditarVencimento(null);
                  setNovaDataVencimento("");
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-purple-200 text-sm mb-4">
                  Editando vencimento do usuário: <span className="font-bold text-white">{operadorParaEditarVencimento.nome}</span>
                </p>
                
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Nova Data de Vencimento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="date"
                    value={novaDataVencimento}
                    onChange={(e) => setNovaDataVencimento(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                {operadorParaEditarVencimento.dataProximoVencimento && (
                  <p className="text-purple-300 text-xs mt-2">
                    Data atual: {format(new Date(operadorParaEditarVencimento.dataProximoVencimento), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Informação</p>
                    <p>
                      A data de vencimento será atualizada. O sistema continuará alertando o usuário 5 dias antes do novo vencimento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditVencimentoModal(false);
                    setOperadorParaEditarVencimento(null);
                    setNovaDataVencimento("");
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarVencimento}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                >
                  Salvar Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Senha e Email */}
      {showEditModal && usuarioParaEditar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Editar Dados</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setUsuarioParaEditar(null);
                  setNovaSenha("");
                  setNovoEmail("");
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-purple-200 text-sm mb-4">
                  Editando: <span className="font-bold text-white">{usuarioParaEditar.nome}</span>
                </p>

                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-4"
                  placeholder="Digite o novo email"
                  autoFocus
                />

                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Nova Senha (opcional - deixe vazio para manter a atual)
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setUsuarioParaEditar(null);
                    setNovaSenha("");
                    setNovoEmail("");
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditarSenha}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Excluir Usuário */}
      {showExcluirUsuarioModal && operadorParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Excluir Usuário</h3>
              <button
                onClick={() => {
                  setShowExcluirUsuarioModal(false);
                  setOperadorParaExcluir(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-bold mb-2">Atenção!</p>
                    <p className="text-red-700 text-sm">
                      Esta ação é <strong>irreversível</strong>. Todos os dados do usuário serão permanentemente excluídos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white text-sm mb-2">Usuário a ser excluído:</p>
                <p className="text-white font-bold text-lg">{operadorParaExcluir.nome}</p>
                <p className="text-purple-300 text-sm">{operadorParaExcluir.email}</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowExcluirUsuarioModal(false);
                    setOperadorParaExcluir(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirUsuario}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:from-red-600 hover:to-orange-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <UserX className="w-5 h-5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
