"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react";

/**
 * Página de diagnóstico para verificar o estado do pagamento do usuário
 */
export default function DiagnosticoPagamento() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("diegomarqueshm@icloud.com");
  const [resultado, setResultado] = useState<any>(null);

  const verificarPagamento = async () => {
    try {
      setLoading(true);
      setResultado(null);

      // 1. Buscar operador
      const { data: operador, error: opError } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (opError) {
        throw new Error(`Erro ao buscar operador: ${opError.message}`);
      }

      if (!operador) {
        throw new Error("Operador não encontrado");
      }

      // 2. Buscar histórico de pagamentos
      const { data: historicoPagamentos, error: histError } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("usuario_id", operador.id)
        .order("data_pagamento", { ascending: false });

      // 3. Buscar ganhos do admin relacionados a este usuário
      const { data: ganhosAdmin, error: ganhoError } = await supabase
        .from("ganhos_admin")
        .select("*")
        .eq("usuario_id", operador.id)
        .order("created_at", { ascending: false });

      // 4. Calcular dias restantes
      let diasRestantes = 0;
      if (operador.data_proximo_vencimento) {
        const vencimento = new Date(operador.data_proximo_vencimento);
        const hoje = new Date();
        diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      }

      setResultado({
        operador: {
          id: operador.id,
          nome: operador.nome,
          email: operador.email,
          ativo: operador.ativo,
          suspenso: operador.suspenso,
          aguardando_pagamento: operador.aguardando_pagamento,
          dias_assinatura: operador.dias_assinatura,
          forma_pagamento: operador.forma_pagamento,
          data_pagamento: operador.data_pagamento
            ? new Date(operador.data_pagamento).toLocaleString("pt-BR")
            : null,
          data_proximo_vencimento: operador.data_proximo_vencimento
            ? new Date(operador.data_proximo_vencimento).toLocaleString("pt-BR")
            : null,
          dias_restantes: diasRestantes,
        },
        historico_pagamentos: historicoPagamentos || [],
        ganhos_admin: ganhosAdmin || [],
        erros: {
          historico: histError?.message,
          ganhos: ganhoError?.message,
        },
      });
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Diagnóstico de Pagamento</span>
          </h1>

          <div className="flex space-x-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email do usuário"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={verificarPagamento}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Verificar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {resultado && (
          <div className="space-y-6">
            {/* Dados do Operador */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Dados do Operador</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="ID" value={resultado.operador.id} />
                <InfoItem label="Nome" value={resultado.operador.nome} />
                <InfoItem label="Email" value={resultado.operador.email} />
                <InfoItem
                  label="Status"
                  value={
                    resultado.operador.ativo
                      ? "Ativo ✅"
                      : resultado.operador.suspenso
                      ? "Suspenso ⛔"
                      : "Inativo ❌"
                  }
                />
                <InfoItem
                  label="Aguardando Pagamento"
                  value={resultado.operador.aguardando_pagamento ? "Sim ⏳" : "Não ✅"}
                />
                <InfoItem
                  label="Forma de Pagamento"
                  value={resultado.operador.forma_pagamento?.toUpperCase() || "N/A"}
                />
                <InfoItem
                  label="Dias da Assinatura"
                  value={resultado.operador.dias_assinatura || "N/A"}
                />
                <InfoItem
                  label="Dias Restantes"
                  value={
                    resultado.operador.dias_restantes > 0
                      ? `${resultado.operador.dias_restantes} dias`
                      : "Expirado"
                  }
                  highlight={resultado.operador.dias_restantes <= 0 ? "red" : undefined}
                />
                <InfoItem
                  label="Data do Pagamento"
                  value={resultado.operador.data_pagamento || "N/A"}
                />
                <InfoItem
                  label="Data de Vencimento"
                  value={resultado.operador.data_proximo_vencimento || "N/A"}
                />
              </div>
            </div>

            {/* Histórico de Pagamentos */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <span>Histórico de Pagamentos</span>
                <span className="text-sm font-normal text-gray-500">
                  ({resultado.historico_pagamentos.length} registros)
                </span>
              </h2>

              {resultado.erros.historico && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  <strong>Erro:</strong> {resultado.erros.historico}
                </div>
              )}

              {resultado.historico_pagamentos.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Nenhum pagamento registrado!</p>
                    <p>O webhook não registrou este pagamento no histórico.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {resultado.historico_pagamentos.map((pag: any) => (
                    <div key={pag.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-gray-600">Referência:</span>{" "}
                          {pag.mes_referencia}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Valor:</span> R${" "}
                          {pag.valor}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Status:</span>{" "}
                          <span
                            className={
                              pag.status === "pago"
                                ? "text-green-600 font-semibold"
                                : "text-red-600"
                            }
                          >
                            {pag.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Forma:</span>{" "}
                          {pag.forma_pagamento.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Dias:</span>{" "}
                          {pag.dias_comprados}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Data:</span>{" "}
                          {new Date(pag.data_pagamento).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ganhos do Admin */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <Database className="w-5 h-5 text-green-600" />
                <span>Ganhos do Admin</span>
                <span className="text-sm font-normal text-gray-500">
                  ({resultado.ganhos_admin.length} registros)
                </span>
              </h2>

              {resultado.erros.ganhos && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  <strong>Erro:</strong> {resultado.erros.ganhos}
                </div>
              )}

              {resultado.ganhos_admin.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Nenhum ganho registrado!</p>
                    <p>O webhook não registrou este pagamento nos ganhos do admin.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {resultado.ganhos_admin.map((ganho: any) => (
                    <div key={ganho.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-gray-600">Tipo:</span> {ganho.tipo}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Valor:</span> R${" "}
                          {ganho.valor}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Forma:</span>{" "}
                          {ganho.forma_pagamento.toUpperCase()}
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <span className="font-semibold text-gray-600">Descrição:</span>{" "}
                          {ganho.descricao}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Data:</span>{" "}
                          {new Date(ganho.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "red" | "green";
}) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <p className="text-xs text-gray-500 font-semibold">{label}</p>
      <p
        className={`text-sm font-medium ${
          highlight === "red"
            ? "text-red-600"
            : highlight === "green"
            ? "text-green-600"
            : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
