"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Operador, Pagamento } from "@/lib/types";
import {
  Wallet,
  Store,
  Users,
  Clock,
  DollarSign,
  UserPlus,
  Settings,
  LogOut,
  Shield,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  Check,
  X as XIcon,
} from "lucide-react";

export default function AdministradorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarDados, setMostrarDados] = useState(false);
  const [usuarios, setUsuarios] = useState<Operador[]>([]);

  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo" | "suspenso">("todos");

  // Estados para solicitações de renovação
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Pagamento[]>([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isAdmin = localStorage.getItem("isAdmin");
    if (isAdmin !== "true") {
      router.push("/");
      return;
    }
    carregarUsuarios();
    carregarSolicitacoesPendentes();

    // Atualizar solicitações em tempo real a cada 10 segundos
    const interval = setInterval(() => {
      carregarSolicitacoesPendentes();
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  const carregarSolicitacoesPendentes = async () => {
    try {
      setLoadingSolicitacoes(true);
      const { supabase } = await import("@/lib/supabase");

      console.log("🔍 Buscando solicitações pendentes no Supabase...");

      // Carregar solicitações pendentes
      const { data: solicitacoes, error } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar solicitações:", error);
        console.error("Detalhes do erro:", error.message, error.details, error.hint);
        return;
      }

      console.log("📊 Dados retornados do Supabase:", solicitacoes);

      if (solicitacoes) {
        const solicitacoesFormatadas: Pagamento[] = solicitacoes.map((sol: any) => ({
          id: sol.id,
          usuarioId: sol.usuario_id,
          mesReferencia: sol.mes_referencia,
          valor: parseFloat(sol.valor.toString()),
          dataVencimento: sol.data_vencimento ? new Date(sol.data_vencimento) : undefined,
          dataPagamento: sol.data_pagamento ? new Date(sol.data_pagamento) : null,
          status: sol.status,
          formaPagamento: sol.forma_pagamento,
          diasComprados: sol.dias_comprados,
          tipoCompra: sol.tipo_compra,
          observacao_admin: sol.observacao_admin,
          aprovado_por: sol.aprovado_por,
          data_aprovacao: sol.data_aprovacao ? new Date(sol.data_aprovacao) : undefined,
        }));

        setSolicitacoesPendentes(solicitacoesFormatadas);
        console.log(`✅ ${solicitacoesFormatadas.length} solicitações pendentes carregadas`);
        console.log("📋 Solicitações:", solicitacoesFormatadas);

        // Log para confirmar que o painel está ativo
        console.log("🎯 Painel de Solicitações: ATIVO e RENDERIZANDO");
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      await db.init();
      const operadores = await db.getAllOperadores();
      // Filtrar apenas usuários (não admin)
      const usuariosNormais = operadores.filter(op => !op.isAdmin);
      setUsuarios(usuariosNormais);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setLoading(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!emailUsuario || !novaSenha) {
      alert("Preencha todos os campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailUsuario.trim())) {
      alert("Digite um email válido");
      return;
    }

    if (novaSenha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      // Importar AuthSupabase
      const { AuthSupabase } = await import("@/lib/auth-supabase");

      // Criar usuário sem mensalidade (acesso livre)
      const resultado = await AuthSupabase.createUserWithoutSubscription(
        emailUsuario.trim(),
        novaSenha
      );

      if (!resultado.success) {
        alert(resultado.error || "Erro ao criar usuário");
        return;
      }

      await carregarUsuarios();

      setShowModalUsuario(false);
      setNovaSenha("");
      setEmailUsuario("");
      alert("Usuário criado com sucesso!\n\nEmail: " + emailUsuario + "\n\n✅ Acesso Livre - Sem Mensalidade");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert("Erro ao criar usuário");
    }
  };

  const handleExcluirUsuario = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await db.deleteOperador(id);
        await carregarUsuarios();
        alert("Usuário excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        alert("Erro ao excluir usuário");
      }
    }
  };

  const handleAlterarStatus = async (id: string, novoStatus: boolean) => {
    try {
      const operador = usuarios.find(u => u.id === id);
      if (!operador) return;

      const operadorAtualizado: Operador = {
        ...operador,
        ativo: novoStatus,
      };

      await db.updateOperador(operadorAtualizado);
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar status do usuário");
    }
  };

  const handleAprovarSolicitacao = async (solicitacao: Pagamento) => {
    const usuario = usuarios.find(u => u.id === solicitacao.usuarioId);
    const nomeUsuario = usuario?.nome || usuario?.email || "Usuário";

    const confirmacao = confirm(
      `📋 APROVAR SOLICITAÇÃO\n\n` +
      `👤 Usuário: ${nomeUsuario}\n` +
      `💰 Valor: R$ ${solicitacao.valor.toFixed(2)}\n` +
      `📅 Dias: ${solicitacao.diasComprados} dias\n` +
      `💳 Forma: ${solicitacao.formaPagamento === "pix" ? "PIX" : "Cartão"}\n\n` +
      `✅ Confirma a aprovação?\n` +
      `Os dias serão creditados automaticamente.`
    );

    if (!confirmacao) return;

    try {
      const { supabase } = await import("@/lib/supabase");

      console.log("🔄 Aprovando solicitação...");

      // 1. Buscar dados atuais do operador
      const { data: operador, error: operadorBuscaError } = await supabase
        .from("operadores")
        .select("*")
        .eq("id", solicitacao.usuarioId)
        .single();

      if (operadorBuscaError || !operador) {
        throw new Error("Usuário não encontrado");
      }

      // 2. Calcular nova data de vencimento
      const dataAtual = new Date();
      let novaDataVencimento: Date;

      if (operador.data_proximo_vencimento) {
        const vencimentoAtual = new Date(operador.data_proximo_vencimento);

        if (vencimentoAtual > dataAtual) {
          // Assinatura ativa: SOMAR dias
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.diasComprados);
          console.log(`✅ Somando ${solicitacao.diasComprados} dias ao vencimento atual`);
        } else {
          // Assinatura expirada: começar de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.diasComprados);
          console.log(`⚠️ Assinatura expirada. Iniciando ${solicitacao.diasComprados} dias de hoje`);
        }
      } else {
        // Primeira compra
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.diasComprados);
        console.log(`🆕 Primeira compra. Iniciando ${solicitacao.diasComprados} dias`);
      }

      // 3. Atualizar status do pagamento para "pago"
      const { error: updateError } = await supabase
        .from("historico_pagamentos")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          aprovado_por: "Administrador",
          data_aprovacao: new Date().toISOString(),
          mes_referencia: `Renovação ${solicitacao.diasComprados} dias - ${solicitacao.formaPagamento.toUpperCase()}`,
        })
        .eq("id", solicitacao.id);

      if (updateError) throw updateError;

      // 4. Atualizar operador no Supabase
      const { error: operadorError } = await supabase
        .from("operadores")
        .update({
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: solicitacao.formaPagamento,
          data_pagamento: new Date().toISOString(),
          dias_assinatura: solicitacao.diasComprados,
          valor_mensal: solicitacao.valor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", solicitacao.usuarioId);

      if (operadorError) throw operadorError;

      // 5. Registrar ganho do admin
      const ganhoId = `ganho_${solicitacao.id}_${Date.now()}`;
      await supabase
        .from("ganhos_admin")
        .insert({
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          valor: solicitacao.valor,
          forma_pagamento: solicitacao.formaPagamento,
          descricao: `Pagamento aprovado: ${solicitacao.diasComprados} dias via ${solicitacao.formaPagamento.toUpperCase()}`,
          created_at: new Date().toISOString(),
        });

      alert(
        `✅ SOLICITAÇÃO APROVADA COM SUCESSO!\n\n` +
        `👤 Usuário: ${nomeUsuario}\n` +
        `📅 Dias creditados: ${solicitacao.diasComprados}\n` +
        `💰 Valor: R$ ${solicitacao.valor.toFixed(2)}\n` +
        `📆 Novo vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}\n\n` +
        `A conta do usuário foi ativada!`
      );

      console.log("✅ Solicitação aprovada com sucesso!");

      // Recarregar listas
      await carregarSolicitacoesPendentes();
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error);
      alert("❌ Erro ao aprovar solicitação. Tente novamente.\n\nDetalhes: " + (error as Error).message);
    }
  };

  const handleRecusarSolicitacao = async (solicitacao: Pagamento) => {
    const motivo = prompt("Motivo da recusa (opcional):");

    try {
      const { supabase } = await import("@/lib/supabase");

      // Atualizar status do pagamento para "cancelado"
      const { error } = await supabase
        .from("historico_pagamentos")
        .update({
          status: "cancelado",
          observacao_admin: motivo || "Solicitação recusada pelo administrador",
          aprovado_por: "Administrador",
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", solicitacao.id);

      if (error) throw error;

      alert("Solicitação recusada com sucesso.");
      await carregarSolicitacoesPendentes();
    } catch (error) {
      console.error("Erro ao recusar solicitação:", error);
      alert("Erro ao recusar solicitação. Tente novamente.");
    }
  };

  const handleSair = () => {
    localStorage.clear();
    router.push("/");
  };

  const usuariosAtivos = usuarios.filter((u) => u.ativo).length;
  const usuariosInativos = usuarios.filter((u) => !u.ativo).length;

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "ativo") return u.ativo;
    if (filtroStatus === "inativo") return !u.ativo;
    return false;
  });

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
                <p className="text-sm text-gray-600">Gestão completa do sistema</p>
              </div>
            </div>
            <button
              onClick={handleSair}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botões Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Botão Carteira de Ganhos */}
          <button
            onClick={() => router.push("/carteira")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-xl">
                  <Wallet className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Carteira de Ganhos</h3>
                  <p className="text-green-100 text-sm">Contas criadas e receitas</p>
                </div>
              </div>
              <DollarSign className="w-10 h-10 opacity-50" />
            </div>
          </button>

          {/* Botão Análise de Lojas */}
          <button
            onClick={() => router.push("/analise-lojas")}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-xl">
                  <Store className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Análise de Lojas</h3>
                  <p className="text-blue-100 text-sm">Configurar e criar acessos</p>
                </div>
              </div>
              <Settings className="w-10 h-10 opacity-50" />
            </div>
          </button>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Solicitações Pendentes - DESTAQUE */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white border-4 border-purple-300 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <span className="text-4xl font-bold animate-pulse">{solicitacoesPendentes.length}</span>
            </div>
            <h3 className="text-xl font-bold">Solicitações Pendentes</h3>
            <p className="text-sm text-purple-100">Aguardando aprovação</p>
          </div>

          {/* Usuários Ativos */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-green-600">{usuariosAtivos}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Usuários Ativos</h3>
            <p className="text-sm text-gray-600">Contas ativas no sistema</p>
          </div>

          {/* Usuários Inativos */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-xl">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <span className="text-3xl font-bold text-red-600">{usuariosInativos}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Usuários Inativos</h3>
            <p className="text-sm text-gray-600">Contas desativadas</p>
          </div>
        </div>

        {/* Seção de Usuários */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800">Gerenciar Usuários</h2>
            </div>
            <div className="flex items-center space-x-3">
              {/* Filtro de Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              
              {/* Botão de Visualizar Dados */}
              <button
                onClick={() => setMostrarDados(!mostrarDados)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                title={mostrarDados ? "Ocultar dados" : "Mostrar dados"}
              >
                {mostrarDados ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                <span>{mostrarDados ? "Ocultar" : "Mostrar"}</span>
              </button>

              <button
                onClick={() => setShowModalUsuario(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                <span>Criar Usuário</span>
              </button>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="space-y-3">
            {usuariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum usuário encontrado</p>
              </div>
            ) : (
              usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        usuario.ativo
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {usuario.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {mostrarDados ? usuario.nome : "••••••"}
                      </h3>
                      {mostrarDados && (
                        <p className="text-xs text-gray-500 font-mono">
                          Senha: {usuario.senha}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right mr-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          usuario.ativo
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {usuario.ativo ? "ATIVO" : "INATIVO"}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Criado: {new Date(usuario.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Botões de Ação */}
                    <button
                      onClick={() => handleAlterarStatus(usuario.id, !usuario.ativo)}
                      className={`p-2 rounded-lg transition-colors ${
                        usuario.ativo
                          ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                          : "bg-green-100 hover:bg-green-200 text-green-600"
                      }`}
                      title={usuario.ativo ? "Desativar usuário" : "Ativar usuário"}
                    >
                      <Ban className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => handleExcluirUsuario(usuario.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Seção de Solicitações de Renovação - SEMPRE VISÍVEL */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8 border-4 border-purple-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Solicitações de Renovação</h2>
                <p className="text-sm text-gray-600">Aprovar ou recusar compras de dias dos usuários</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {loadingSolicitacoes && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {solicitacoesPendentes.length} {solicitacoesPendentes.length === 1 ? "pendente" : "pendentes"}
              </span>
            </div>
          </div>

          {/* Lista de Solicitações */}
          <div className="space-y-4">
            {solicitacoesPendentes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <CheckCircle className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-semibold">Nenhuma solicitação pendente</p>
                <p className="text-sm text-gray-500 mt-1">Todas as solicitações foram processadas</p>
              </div>
            ) : (
              solicitacoesPendentes.map((solicitacao) => {
                // Buscar nome do usuário
                const usuario = usuarios.find(u => u.id === solicitacao.usuarioId);
                const nomeUsuario = usuario?.nome || usuario?.email || "Usuário";

                return (
                  <div
                    key={solicitacao.id}
                    className="bg-white border-4 border-purple-300 rounded-2xl p-6 hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header da Solicitação */}
                        <div className="flex items-center space-x-4 mb-4 pb-4 border-b-2 border-purple-100">
                          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-3 rounded-xl shadow-lg">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900">{nomeUsuario}</h3>
                            <p className="text-sm text-purple-600 font-semibold mt-1">{solicitacao.mesReferencia}</p>
                          </div>
                          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg px-4 py-2">
                            <p className="text-xs font-bold text-yellow-800">AGUARDANDO</p>
                            <p className="text-xs text-yellow-700">APROVAÇÃO</p>
                          </div>
                        </div>

                        {/* Grid de Informações */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                            <p className="text-xs text-green-700 font-semibold mb-1">💰 Valor</p>
                            <p className="text-2xl font-black text-green-600">
                              R$ {solicitacao.valor.toFixed(2)}
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                            <p className="text-xs text-blue-700 font-semibold mb-1">📅 Dias</p>
                            <p className="text-2xl font-black text-blue-600">
                              {solicitacao.diasComprados} dias
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                            <p className="text-xs text-purple-700 font-semibold mb-1">💳 Pagamento</p>
                            <p className="text-lg font-bold text-purple-700">
                              {solicitacao.formaPagamento === "pix" ? "PIX" : "Cartão"}
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
                            <p className="text-xs text-orange-700 font-semibold mb-1">📦 Tipo</p>
                            <p className="text-sm font-bold text-orange-700">
                              {solicitacao.tipoCompra === "renovacao-60" && "Plano 60 dias"}
                              {solicitacao.tipoCompra === "renovacao-180" && "Plano Semestral"}
                              {solicitacao.tipoCompra === "renovacao-365" && "Plano Anual"}
                              {!solicitacao.tipoCompra?.startsWith("renovacao") && "Personalizado"}
                            </p>
                          </div>
                        </div>

                        {/* Data da Solicitação */}
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-3">
                          <p className="text-sm text-yellow-900">
                            <strong>🕐 Solicitação criada em:</strong>{" "}
                            <span className="font-bold">{new Date(solicitacao.dataVencimento || Date.now()).toLocaleString("pt-BR")}</span>
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex flex-col space-y-3 ml-6">
                        <button
                          onClick={() => handleAprovarSolicitacao(solicitacao)}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 font-bold"
                          title="Aprovar e creditar dias"
                        >
                          <Check className="w-6 h-6" />
                          <span>Aprovar</span>
                        </button>

                        <button
                          onClick={() => handleRecusarSolicitacao(solicitacao)}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 font-bold"
                          title="Recusar solicitação"
                        >
                          <XIcon className="w-6 h-6" />
                          <span>Recusar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Info sobre atualização em tempo real */}
          {solicitacoesPendentes.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                ✅ <strong>Atualização automática:</strong> Esta lista é atualizada automaticamente a cada 10 segundos para mostrar novas solicitações em tempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Usuário */}
      {showModalUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Criar Novo Usuário</h3>
              <button
                onClick={() => setShowModalUsuario(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email do Usuário</label>
                <input
                  type="email"
                  value={emailUsuario}
                  onChange={(e) => setEmailUsuario(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este email será usado para login no sistema
                </p>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use letras, números ou caracteres especiais
                </p>
              </div>

              {/* Aviso de acesso livre */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Acesso Livre - Sem Mensalidade</p>
                    <p className="text-xs text-green-700 mt-1">
                      Este usuário terá acesso permanente ao sistema sem precisar pagar mensalidade.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModalUsuario(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarUsuario}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Criar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
