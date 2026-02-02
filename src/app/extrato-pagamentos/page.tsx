"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Clock, CheckCircle, XCircle, Calendar, DollarSign, ExternalLink } from "lucide-react";

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
};

export default function ExtratoPagamentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRenovacao[]>([]);
  const [operadorId, setOperadorId] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix");

  const WHATSAPP_CONTATO = "5565981032239";
  const LINK_PIX = "https://mpago.la/2FaXoGm";
  const LINK_CARTAO = "https://mpago.la/1fAKQyc";

  useEffect(() => {
    const init = async () => {
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador || operador.isAdmin) {
        router.push("/");
        return;
      }

      setOperadorId(operador.id);
      setOperadorNome(operador.nome);
      await carregarSolicitacoes(operador.id);
    };

    init();
  }, [router]);

  const carregarSolicitacoes = async (opId: string) => {
    try {
      setLoading(true);
      const { supabase } = await import("@/lib/supabase");

      const { data, error } = await supabase
        .from("solicitacoes_renovacao")
        .select("*")
        .eq("operador_id", opId)
        .order("data_solicitacao", { ascending: false });

      if (error) {
        console.error("Erro ao carregar solicitações:", error);
        return;
      }

      setSolicitacoes(data || []);

      // Configurar atualização em tempo real
      const channel = supabase
        .channel("solicitacoes_renovacao_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "solicitacoes_renovacao",
            filter: `operador_id=eq.${opId}`,
          },
          (payload) => {
            console.log("Atualização em tempo real:", payload);
            carregarSolicitacoes(opId);
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

  const criarSolicitacao = async () => {
    try {
      const dias = formaPagamento === "pix" ? 60 : 100;
      const valor = formaPagamento === "pix" ? 59.9 : 149.7;

      const { supabase } = await import("@/lib/supabase");

      const { data, error } = await supabase
        .from("solicitacoes_renovacao")
        .insert({
          operador_id: operadorId,
          forma_pagamento: formaPagamento,
          dias_solicitados: dias,
          valor: valor,
          status: "pendente",
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar solicitação:", error);
        alert("Erro ao criar solicitação. Tente novamente.");
        return;
      }

      // Abrir link de pagamento
      const link = formaPagamento === "pix" ? LINK_PIX : LINK_CARTAO;
      window.open(link, "_blank");

      setMostrarModal(false);
      await carregarSolicitacoes(operadorId);
    } catch (err) {
      console.error("Erro ao criar solicitação:", err);
      alert("Erro ao processar solicitação.");
    }
  };

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
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
        return "Aguardando Aprovação";
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
        return "bg-yellow-50 border-yellow-200";
      case "aprovado":
        return "bg-green-50 border-green-200";
      case "recusado":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando extrato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push("/caixa")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
          </div>

          <div className="text-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Extrato de Pagamentos</h1>
            <p className="text-gray-600">Olá, {operadorNome}!</p>
          </div>

          <button
            onClick={() => setMostrarModal(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>Solicitar Renovação</span>
          </button>
        </div>

        {/* Lista de Solicitações */}
        <div className="space-y-4">
          {solicitacoes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma solicitação de renovação ainda.</p>
              <p className="text-gray-500 text-sm mt-2">
                Clique em "Solicitar Renovação" para começar.
              </p>
            </div>
          ) : (
            solicitacoes.map((sol) => (
              <div
                key={sol.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-2 ${getStatusBg(sol.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(sol.status)}
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {getStatusText(sol.status)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatarData(sol.data_solicitacao)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {sol.valor.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Forma de Pagamento</p>
                    <p className="font-semibold text-gray-800">
                      {sol.forma_pagamento === "pix" ? "PIX" : "Cartão de Crédito"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Dias Solicitados</p>
                    <p className="font-semibold text-gray-800">{sol.dias_solicitados} dias</p>
                  </div>
                </div>

                {sol.mensagem_admin && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Mensagem do Admin:</p>
                    <p className="text-sm text-blue-700">{sol.mensagem_admin}</p>
                  </div>
                )}

                {sol.status === "pendente" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      Sua solicitação está em análise. Após efetuar o pagamento, aguarde a aprovação do administrador.
                    </p>
                  </div>
                )}

                {sol.data_resposta && (
                  <p className="text-xs text-gray-500 mt-2">
                    Respondido em: {formatarData(sol.data_resposta)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Botão WhatsApp */}
        <div className="mt-6">
          <button
            onClick={abrirWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Contato WhatsApp - Suporte</span>
          </button>
        </div>
      </div>

      {/* Modal de Solicitar Renovação */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Solicitar Renovação</h2>
            <p className="text-gray-600 mb-6">
              Escolha a forma de pagamento e clique em confirmar. Você será redirecionado para completar o pagamento.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setFormaPagamento("pix")}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  formaPagamento === "pix"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">PIX</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">PIX - R$ 59,90</p>
                      <p className="text-sm text-gray-600">60 dias de acesso</p>
                    </div>
                  </div>
                  {formaPagamento === "pix" && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setFormaPagamento("cartao")}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  formaPagamento === "cartao"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-10 h-10 text-blue-600" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">Cartão - R$ 149,70</p>
                      <p className="text-sm text-gray-600">100 dias de acesso</p>
                    </div>
                  </div>
                  {formaPagamento === "cartao" && (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Após clicar em confirmar, você será redirecionado para o pagamento. Complete o pagamento e aguarde a aprovação do administrador.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={criarSolicitacao}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
