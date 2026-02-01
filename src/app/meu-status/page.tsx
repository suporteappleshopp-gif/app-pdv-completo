"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSupabase } from "@/lib/auth-supabase";
import { Loader2, CheckCircle, XCircle, Calendar, CreditCard, AlertTriangle } from "lucide-react";

export default function MeuStatusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [operadorId, setOperadorId] = useState("");
  const [statusData, setStatusData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const buscarStatus = async () => {
      try {
        // Buscar sessão
        const session = await AuthSupabase.getSession();
        if (!session) {
          router.push("/");
          return;
        }

        const operador = await AuthSupabase.getCurrentOperador();
        if (!operador) {
          setError("Operador não encontrado");
          setLoading(false);
          return;
        }

        setOperadorId(operador.id);

        // Buscar status via API
        const response = await fetch(`/api/verificar-status?usuario_id=${operador.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao buscar status");
        }

        setStatusData(data);
        setLoading(false);
      } catch (err: any) {
        console.error("Erro ao buscar status:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    buscarStatus();

    // Atualizar a cada 10 segundos
    const interval = setInterval(buscarStatus, 10000);

    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Buscando seu status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/caixa")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  const { operador, historico } = statusData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Meu Status de Assinatura</h1>
          <p className="text-gray-600">Atualizado automaticamente a cada 10 segundos</p>
        </div>

        {/* Status da Conta */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            <span>Informações da Conta</span>
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="text-lg font-semibold text-gray-800">{operador.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-800">{operador.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status da Conta</p>
                <div className="flex items-center space-x-2 mt-1">
                  {operador.ativo && !operador.suspenso ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-lg font-semibold text-green-600">Ativa</span>
                    </>
                  ) : operador.aguardandoPagamento ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="text-lg font-semibold text-yellow-600">Aguardando Pagamento</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-lg font-semibold text-red-600">Suspensa</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dias Restantes</p>
                <p className="text-lg font-semibold text-gray-800">
                  {operador.diasRestantes >= 999999 ? "Sem Limite" : `${operador.diasRestantes} dias`}
                </p>
              </div>
            </div>

            {operador.formaPagamento && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Forma de Pagamento</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-800">
                      {operador.formaPagamento === "pix" ? "PIX" : "Cartão de Crédito"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Mensal</p>
                  <p className="text-lg font-semibold text-gray-800">
                    R$ {operador.valorMensal?.toFixed(2) || "0,00"}
                  </p>
                </div>
              </div>
            )}

            {operador.dataVencimento && (
              <div>
                <p className="text-sm text-gray-600">Data de Vencimento</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-800">
                    {new Date(operador.dataVencimento).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos */}
        {historico && historico.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Histórico de Pagamentos</h2>
            <div className="space-y-4">
              {historico.map((pag: any) => (
                <div
                  key={pag.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{pag.mes_referencia}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(pag.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">
                        R$ {pag.valor?.toFixed(2)}
                      </p>
                      <div className="flex items-center space-x-2">
                        {pag.status === "pago" ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">Pago</span>
                          </>
                        ) : pag.status === "pendente" ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-semibold text-yellow-600">Pendente</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-600">Cancelado</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Voltar */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/caixa")}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg font-semibold"
          >
            Voltar ao Caixa
          </button>
        </div>
      </div>
    </div>
  );
}
