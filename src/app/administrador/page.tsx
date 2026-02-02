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

      // Carregar solicitações pendentes
      const { data: solicitacoes, error } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar solicitações:", error);
        return;
      }

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
    if (!confirm(`Aprovar solicitação de ${solicitacao.diasComprados} dias por R$ ${solicitacao.valor.toFixed(2)}?`)) {
      return;
    }

    try {
      const { supabase } = await import("@/lib/supabase");

      // 1. Atualizar status do pagamento para "pago"
      const { error: updateError } = await supabase
        .from("historico_pagamentos")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          aprovado_por: "Administrador",
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", solicitacao.id);

      if (updateError) throw updateError;

      // 2. Buscar todos os pagamentos pagos do usuário para recalcular dias
      const { data: pagamentosPagos } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("usuario_id", solicitacao.usuarioId)
        .eq("status", "pago")
        .order("data_pagamento", { ascending: true });

      if (pagamentosPagos && pagamentosPagos.length > 0) {
        // Calcular total de dias comprados
        const totalDiasComprados = pagamentosPagos.reduce((total, pag) => {
          return total + (pag.dias_comprados || 0);
        }, 0);

        // Pegar a data do primeiro pagamento
        const primeiroPagamento = new Date(pagamentosPagos[0].data_pagamento);

        // Calcular data de vencimento
        const dataVencimento = new Date(primeiroPagamento);
        dataVencimento.setDate(dataVencimento.getDate() + totalDiasComprados);

        // 3. Atualizar operador no Supabase
        const { error: operadorError } = await supabase
          .from("operadores")
          .update({
            data_proximo_vencimento: dataVencimento.toISOString(),
            ativo: true,
            suspenso: false,
          })
          .eq("id", solicitacao.usuarioId);

        if (operadorError) throw operadorError;
      }

      alert(`✅ Solicitação aprovada com sucesso!\n\n${solicitacao.diasComprados} dias foram creditados na conta do usuário.`);

      // Recarregar listas
      await carregarSolicitacoesPendentes();
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error);
      alert("Erro ao aprovar solicitação. Tente novamente.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        {/* Seção de Solicitações de Renovação */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Solicitações de Renovação</h2>
                <p className="text-sm text-gray-600">Aprovar ou recusar compras de dias</p>
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
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="bg-purple-500 text-white p-2 rounded-lg">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">{nomeUsuario}</h3>
                            <p className="text-sm text-gray-600">{solicitacao.mesReferencia}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Valor</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {solicitacao.valor.toFixed(2)}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Dias Solicitados</p>
                            <p className="text-lg font-bold text-blue-600">
                              {solicitacao.diasComprados} dias
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Forma de Pagamento</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {solicitacao.formaPagamento === "pix" ? "PIX" : "Cartão"}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Tipo</p>
                            <p className="text-xs font-semibold text-gray-800">
                              {solicitacao.tipoCompra === "renovacao-60" && "60 dias"}
                              {solicitacao.tipoCompra === "renovacao-180" && "Semestral"}
                              {solicitacao.tipoCompra === "renovacao-365" && "Anual"}
                              {solicitacao.tipoCompra === "personalizado" && "Personalizado"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-yellow-700">
                            <strong>Solicitação criada em:</strong>{" "}
                            {new Date(solicitacao.dataVencimento || Date.now()).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleAprovarSolicitacao(solicitacao)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                          title="Aprovar e creditar dias"
                        >
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Aprovar</span>
                        </button>

                        <button
                          onClick={() => handleRecusarSolicitacao(solicitacao)}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                          title="Recusar solicitação"
                        >
                          <XIcon className="w-5 h-5" />
                          <span className="font-semibold">Recusar</span>
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
