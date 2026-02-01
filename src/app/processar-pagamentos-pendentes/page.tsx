"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PagamentoPendente {
  id: string;
  usuario_id: string;
  mes_referencia: string;
  valor: number;
  dias_comprados: number;
  forma_pagamento: string;
  created_at: string;
}

interface Operador {
  id: string;
  nome: string;
  email: string;
  data_proximo_vencimento: string | null;
}

export default function ProcessarPagamentosPendentes() {
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<string[]>([]);
  const [pagamentosPendentes, setPagamentosPendentes] = useState<PagamentoPendente[]>([]);
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(false);

  const buscarPagamentosPendentes = async () => {
    setCarregandoPagamentos(true);
    setResultado([]);

    try {
      const { data, error } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPagamentosPendentes((data as PagamentoPendente[]) || []);
      setResultado([`✅ Encontrados ${data?.length || 0} pagamento(s) pendente(s)`]);
    } catch (error: any) {
      setResultado([`❌ Erro ao buscar pagamentos: ${error.message}`]);
    } finally {
      setCarregandoPagamentos(false);
    }
  };

  const processarPagamentoPendente = async (pagamento: PagamentoPendente) => {
    const logs: string[] = [];

    try {
      logs.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logs.push(`💳 Processando: ${pagamento.id}`);
      logs.push(`💰 Valor: R$ ${pagamento.valor.toFixed(2)} | Dias: ${pagamento.dias_comprados}`);

      // Buscar operador
      const { data: operador, error: erroOperador } = await supabase
        .from("operadores")
        .select("*")
        .eq("id", pagamento.usuario_id)
        .maybeSingle();

      if (erroOperador || !operador) {
        logs.push(`❌ Operador não encontrado: ${pagamento.usuario_id}`);
        return logs;
      }

      const op = operador as Operador;
      logs.push(`👤 Operador: ${op.nome} (${op.email})`);

      // Verificar tempo desde criação
      const tempoCriacao = new Date(pagamento.created_at).getTime();
      const tempoAtual = Date.now();
      const diferencaMinutos = (tempoAtual - tempoCriacao) / (1000 * 60);

      logs.push(`⏱️ Tempo desde criação: ${diferencaMinutos.toFixed(1)} minutos`);

      // Cancelar se passou mais de 10 minutos
      if (diferencaMinutos > 10) {
        logs.push(`⚠️ Pagamento antigo (>10min) - Cancelando...`);

        await supabase
          .from("historico_pagamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", pagamento.id);

        logs.push(`✅ Pagamento cancelado!`);
        return logs;
      }

      // Aguardar se muito recente
      if (diferencaMinutos < 4) {
        logs.push(`⏳ Muito recente (<4min) - Aguarde mais um pouco...`);
        return logs;
      }

      // Processar pagamento (entre 4-10 minutos)
      logs.push(`🔄 Processando manualmente...`);

      const dataAtual = new Date();
      let novaDataVencimento: Date;

      if (op.data_proximo_vencimento) {
        const vencimentoAtual = new Date(op.data_proximo_vencimento);
        if (vencimentoAtual > dataAtual) {
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          logs.push(`✅ Somando ${pagamento.dias_comprados} dias ao vencimento atual`);
        } else {
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          logs.push(`✅ Assinatura expirada - Iniciando ${pagamento.dias_comprados} dias`);
        }
      } else {
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
        logs.push(`✅ Primeira compra - ${pagamento.dias_comprados} dias`);
      }

      logs.push(`📅 Novo vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);

      // Atualizar operador
      const { error: erroOperadorUpdate } = await supabase
        .from("operadores")
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: pagamento.forma_pagamento,
          data_pagamento: dataAtual.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: pagamento.dias_comprados,
          valor_mensal: pagamento.valor,
          updated_at: dataAtual.toISOString(),
        })
        .eq("id", op.id);

      if (erroOperadorUpdate) {
        logs.push(`❌ Erro ao atualizar operador: ${erroOperadorUpdate.message}`);
        return logs;
      }

      logs.push(`✅ Operador atualizado!`);

      // Atualizar pagamento para pago
      const { error: erroPagamentoUpdate } = await supabase
        .from("historico_pagamentos")
        .update({
          status: "pago",
          data_pagamento: dataAtual.toISOString(),
          updated_at: dataAtual.toISOString(),
        })
        .eq("id", pagamento.id);

      if (erroPagamentoUpdate) {
        logs.push(`❌ Erro ao atualizar pagamento: ${erroPagamentoUpdate.message}`);
        return logs;
      }

      logs.push(`✅ Pagamento marcado como PAGO!`);

      // Registrar ganho
      const ganhoId = `ganho_manual_${pagamento.id}_${Date.now()}`;
      await supabase.from("ganhos_admin").insert({
        id: ganhoId,
        tipo: "mensalidade-paga",
        usuario_id: op.id,
        usuario_nome: op.nome,
        valor: pagamento.valor,
        forma_pagamento: pagamento.forma_pagamento,
        descricao: `Pagamento manual de ${pagamento.dias_comprados} dias`,
        created_at: dataAtual.toISOString(),
      });

      logs.push(`✅ Ganho registrado!`);
      logs.push(`🎉 PROCESSAMENTO CONCLUÍDO!`);
      logs.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return logs;
    } catch (error: any) {
      logs.push(`❌ ERRO: ${error.message}`);
      return logs;
    }
  };

  const processarTodos = async () => {
    setProcessando(true);
    const todosLogs: string[] = [];

    for (const pagamento of pagamentosPendentes) {
      const logs = await processarPagamentoPendente(pagamento);
      todosLogs.push(...logs);
      todosLogs.push(""); // Linha em branco entre pagamentos
    }

    setResultado(todosLogs);
    setProcessando(false);

    // Atualizar lista após processar
    await buscarPagamentosPendentes();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Processar Pagamentos Pendentes
            </h1>
            <p className="text-gray-600">
              Ferramenta para processar manualmente pagamentos que não foram confirmados automaticamente
            </p>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Esta ferramenta processa pagamentos que estão pendentes há mais de 4 minutos</li>
                  <li>Pagamentos com mais de 10 minutos serão cancelados automaticamente</li>
                  <li>Use apenas se o webhook do Mercado Pago falhou</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={buscarPagamentosPendentes}
              disabled={carregandoPagamentos}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {carregandoPagamentos ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Buscar Pendentes</span>
                </>
              )}
            </button>

            <button
              onClick={processarTodos}
              disabled={processando || pagamentosPendentes.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {processando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Processar Todos ({pagamentosPendentes.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Lista de pagamentos pendentes */}
          {pagamentosPendentes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pagamentos Pendentes Encontrados:
              </h3>
              <div className="space-y-2">
                {pagamentosPendentes.map((pag) => (
                  <div
                    key={pag.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{pag.mes_referencia}</p>
                        <p className="text-sm text-gray-600">
                          R$ {pag.valor.toFixed(2)} • {pag.dias_comprados} dias
                        </p>
                        <p className="text-xs text-gray-500">
                          Criado: {new Date(pag.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-yellow-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log de resultados */}
          {resultado.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {resultado.join("\n")}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
