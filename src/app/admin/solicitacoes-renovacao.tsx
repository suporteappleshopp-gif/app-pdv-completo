"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Calendar, DollarSign, User, MessageSquare, Check, X } from "lucide-react";

type SolicitacaoRenovacao = {
  id: string;
  operador_id: string;
  forma_pagamento: "pix" | "cartao";
  dias_solicitados: number;
  valor: number;
  status: "pendente" | "aprovado" | "recusado";
  mensagem_admin: string | null;
  data_solicitacao: string;
  data_resposta: string | null;
  operador?: {
    id: string;
    nome: string;
    email: string;
  };
};

export default function SolicitacoesRenovacao() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRenovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoRenovacao | null>(null);
  const [mensagemAdmin, setMensagemAdmin] = useState("");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  const carregarSolicitacoes = async () => {
    try {
      setLoading(true);
      const { supabase } = await import("@/lib/supabase");

      // Buscar solicitações
      const { data: solicitacoesData, error } = await supabase
        .from("solicitacoes_renovacao")
        .select("*")
        .order("data_solicitacao", { ascending: false });

      if (error) {
        console.error("Erro ao carregar solicitações:", error);
        return;
      }

      // Buscar dados dos operadores separadamente
      if (solicitacoesData && solicitacoesData.length > 0) {
        const operadorIds = [...new Set(solicitacoesData.map(s => s.operador_id))];

        const { data: operadoresData, error: opError } = await supabase
          .from("operadores")
          .select("id, nome, email")
          .in("id", operadorIds);

        if (!opError && operadoresData) {
          // Mapear operadores por ID
          const operadoresMap = new Map(operadoresData.map(op => [op.id, op]));

          // Adicionar dados do operador em cada solicitação
          const solicitacoesComOperador = solicitacoesData.map(sol => ({
            ...sol,
            operador: operadoresMap.get(sol.operador_id),
          }));

          setSolicitacoes(solicitacoesComOperador);
          return;
        }
      }

      setSolicitacoes(solicitacoesData || []);

      // Configurar atualização em tempo real
      const channel = supabase
        .channel("admin_solicitacoes_renovacao")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "solicitacoes_renovacao",
          },
          (payload) => {
            console.log("Atualização em tempo real (admin):", payload);
            carregarSolicitacoes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error("Erro ao carregar solicitações:", err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (solicitacao: SolicitacaoRenovacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setMensagemAdmin("");
    setModalAberto(true);
  };

  const aprovarSolicitacao = async () => {
    if (!solicitacaoSelecionada) return;

    try {
      setProcessando(true);
      const { supabase } = await import("@/lib/supabase");
      const { AuthSupabase } = await import("@/lib/auth-supabase");

      console.log("🔄 Aprovando solicitação:", solicitacaoSelecionada.id);

      // Buscar admin logado
      const adminOperador = await AuthSupabase.getCurrentOperador();
      if (!adminOperador) {
        alert("Erro: admin não identificado.");
        return;
      }

      // Buscar dados atuais do operador
      const { data: operadorData, error: fetchError } = await supabase
        .from("operadores")
        .select("id, nome, email, data_proximo_vencimento, ativo, suspenso")
        .eq("id", solicitacaoSelecionada.operador_id)
        .single();

      if (fetchError || !operadorData) {
        console.error("❌ Erro ao buscar operador:", fetchError);
        alert("Erro ao buscar dados do operador. Verifique se o usuário existe.");
        return;
      }

      console.log("✅ Operador encontrado:", operadorData.nome);

      // Calcular nova data de vencimento
      const dataAtual = new Date();
      let novaDataVencimento: Date;

      if (operadorData.data_proximo_vencimento) {
        const dataVencimentoAtual = new Date(operadorData.data_proximo_vencimento);
        // Se a data de vencimento é no futuro, adicionar a partir dela
        if (dataVencimentoAtual > dataAtual) {
          novaDataVencimento = new Date(dataVencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacaoSelecionada.dias_solicitados);
        } else {
          // Se a data já passou, adicionar a partir de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacaoSelecionada.dias_solicitados);
        }
      } else {
        // Se não tem data de vencimento, adicionar a partir de hoje
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacaoSelecionada.dias_solicitados);
      }

      console.log("📅 Nova data de vencimento:", novaDataVencimento);

      // 1. Criar registro no histórico de pagamentos
      const historicoId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const { error: historicoError } = await supabase
        .from("historico_pagamentos")
        .insert({
          id: historicoId,
          usuario_id: solicitacaoSelecionada.operador_id,
          mes_referencia: `Renovação ${solicitacaoSelecionada.dias_solicitados} dias - ${solicitacaoSelecionada.forma_pagamento.toUpperCase()} | Admin: ${adminOperador.nome} | ${mensagemAdmin || "Aprovado"}`,
          valor: solicitacaoSelecionada.valor,
          data_vencimento: new Date().toISOString(),
          data_pagamento: new Date().toISOString(),
          status: "pago",
          forma_pagamento: solicitacaoSelecionada.forma_pagamento,
          dias_comprados: solicitacaoSelecionada.dias_solicitados,
          tipo_compra: `renovacao-${solicitacaoSelecionada.dias_solicitados}`,
        });

      if (historicoError) {
        console.error("❌ Erro ao criar histórico:", historicoError);
        console.error("📋 Detalhes do erro:", JSON.stringify(historicoError, null, 2));
        console.error("📦 Dados enviados:", {
          id: historicoId,
          usuario_id: solicitacaoSelecionada.operador_id,
          dias: solicitacaoSelecionada.dias_solicitados,
          valor: solicitacaoSelecionada.valor,
        });
        alert(`Erro ao registrar pagamento no histórico.\nDetalhes: ${historicoError.message || 'Erro desconhecido'}`);
        return;
      }

      console.log("✅ Histórico de pagamento criado com ID:", historicoId);

      // 2. Atualizar operador com nova data de vencimento e status ativo
      const { error: updateOpError } = await supabase
        .from("operadores")
        .update({
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
        })
        .eq("id", solicitacaoSelecionada.operador_id);

      if (updateOpError) {
        console.error("❌ Erro ao atualizar operador:", updateOpError);
        alert("Erro ao atualizar dias do operador.");
        return;
      }

      console.log("✅ Operador atualizado com sucesso");

      // 3. Atualizar status da solicitação para "aprovado"
      const { error: updateSolError } = await supabase
        .from("solicitacoes_renovacao")
        .update({
          status: "aprovado",
          mensagem_admin: mensagemAdmin || "Solicitação aprovada pelo administrador!",
          data_resposta: new Date().toISOString(),
          admin_responsavel_id: adminOperador.id,
        })
        .eq("id", solicitacaoSelecionada.id);

      if (updateSolError) {
        console.error("⚠️ Erro ao atualizar solicitação:", updateSolError);
        // Não bloquear - o importante já foi feito
      }

      console.log("✅ Solicitação aprovada com sucesso!");
      console.log(`📊 Resumo:
        - Usuário: ${operadorData.nome}
        - Dias adicionados: ${solicitacaoSelecionada.dias_solicitados}
        - Nova data de vencimento: ${novaDataVencimento.toLocaleDateString('pt-BR')}
        - Valor: R$ ${solicitacaoSelecionada.valor.toFixed(2)}`);

      alert(`✅ Solicitação aprovada!\n\n${solicitacaoSelecionada.dias_solicitados} dias adicionados para ${operadorData.nome}.\nNova data de vencimento: ${novaDataVencimento.toLocaleDateString('pt-BR')}`);
      setModalAberto(false);
      setSolicitacaoSelecionada(null);
      setMensagemAdmin("");
      await carregarSolicitacoes();
    } catch (err) {
      console.error("Erro ao aprovar:", err);
      alert("Erro ao processar aprovação.");
    } finally {
      setProcessando(false);
    }
  };

  const recusarSolicitacao = async () => {
    if (!solicitacaoSelecionada) return;

    if (!mensagemAdmin.trim()) {
      alert("Digite uma mensagem para o usuário explicando a recusa.");
      return;
    }

    try {
      setProcessando(true);
      const { supabase } = await import("@/lib/supabase");
      const { AuthSupabase } = await import("@/lib/auth-supabase");

      // Buscar admin logado
      const adminOperador = await AuthSupabase.getCurrentOperador();

      console.log("❌ Recusando solicitação:", solicitacaoSelecionada.id);

      const { error } = await supabase
        .from("solicitacoes_renovacao")
        .update({
          status: "recusado",
          mensagem_admin: mensagemAdmin,
          data_resposta: new Date().toISOString(),
          admin_responsavel_id: adminOperador?.id || null,
        })
        .eq("id", solicitacaoSelecionada.id);

      if (error) {
        console.error("❌ Erro ao recusar:", error);
        alert("Erro ao recusar solicitação.");
        return;
      }

      console.log("✅ Solicitação recusada com sucesso");
      alert("Solicitação recusada. O usuário será notificado.");
      setModalAberto(false);
      setSolicitacaoSelecionada(null);
      setMensagemAdmin("");
      await carregarSolicitacoes();
    } catch (err) {
      console.error("Erro ao recusar:", err);
      alert("Erro ao processar recusa.");
    } finally {
      setProcessando(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendente":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "aprovado":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "recusado":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return "Aguardando Análise";
      case "aprovado":
        return "Aprovado";
      case "recusado":
        return "Recusado";
      default:
        return status;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-50 border-yellow-300";
      case "aprovado":
        return "bg-green-50 border-green-300";
      case "recusado":
        return "bg-red-50 border-red-300";
      default:
        return "bg-gray-50 border-gray-300";
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const solicitacoesPendentes = solicitacoes.filter((s) => s.status === "pendente");
  const solicitacoesProcessadas = solicitacoes.filter((s) => s.status !== "pendente");

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Solicitações de Renovação</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Solicitações de Renovação</h2>
        {solicitacoesPendentes.length > 0 && (
          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
            {solicitacoesPendentes.length} pendente{solicitacoesPendentes.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {solicitacoes.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhuma solicitação registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Solicitações Pendentes */}
          {solicitacoesPendentes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Pendentes</h3>
              <div className="space-y-3">
                {solicitacoesPendentes.map((sol) => (
                  <div
                    key={sol.id}
                    className={`border-2 rounded-lg p-4 ${getStatusBg(sol.status)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => abrirModal(sol)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(sol.status)}
                        <div>
                          <p className="font-semibold text-gray-800">
                            {sol.operador?.nome || "Usuário"}
                          </p>
                          <p className="text-sm text-gray-600">{sol.operador?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatarData(sol.data_solicitacao)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          R$ {sol.valor.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {sol.forma_pagamento === "pix" ? "PIX" : "Cartão"}
                        </p>
                        <p className="text-sm text-gray-600">{sol.dias_solicitados} dias</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solicitações Processadas */}
          {solicitacoesProcessadas.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Histórico</h3>
              <div className="space-y-3">
                {solicitacoesProcessadas.map((sol) => (
                  <div
                    key={sol.id}
                    className={`border-2 rounded-lg p-4 ${getStatusBg(sol.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(sol.status)}
                        <div>
                          <p className="font-semibold text-gray-800">
                            {sol.operador?.nome || "Usuário"}
                          </p>
                          <p className="text-sm text-gray-600">{sol.operador?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Solicitado: {formatarData(sol.data_solicitacao)}
                          </p>
                          {sol.data_resposta && (
                            <p className="text-xs text-gray-500">
                              Respondido: {formatarData(sol.data_resposta)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          R$ {sol.valor.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {sol.forma_pagamento === "pix" ? "PIX" : "Cartão"}
                        </p>
                        <p className="text-sm text-gray-600">{sol.dias_solicitados} dias</p>
                      </div>
                    </div>
                    {sol.mensagem_admin && (
                      <div className="mt-3 bg-white bg-opacity-50 rounded p-2">
                        <p className="text-xs font-semibold text-gray-700">Mensagem:</p>
                        <p className="text-sm text-gray-600">{sol.mensagem_admin}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Ação */}
      {modalAberto && solicitacaoSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Analisar Solicitação</h2>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Usuário:</strong> {solicitacaoSelecionada.operador?.nome}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Email:</strong> {solicitacaoSelecionada.operador?.email}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Forma de Pagamento:</strong>{" "}
                {solicitacaoSelecionada.forma_pagamento === "pix" ? "PIX" : "Cartão de Crédito"}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Valor:</strong> R$ {solicitacaoSelecionada.valor.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Dias:</strong> {solicitacaoSelecionada.dias_solicitados} dias
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem para o usuário (opcional para aprovar, obrigatório para recusar)
              </label>
              <textarea
                value={mensagemAdmin}
                onChange={(e) => setMensagemAdmin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={3}
                placeholder="Digite uma mensagem..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setModalAberto(false)}
                disabled={processando}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={recusarSolicitacao}
                disabled={processando}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Recusar</span>
              </button>
              <button
                onClick={aprovarSolicitacao}
                disabled={processando}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Aprovar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
