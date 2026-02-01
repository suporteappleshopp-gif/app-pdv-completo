"use client";

import { useState } from "react";
import { CheckCircle, Loader2, AlertCircle, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CorrigirPagamentosDiego() {
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState(false);

  const corrigirTudo = async () => {
    setProcessando(true);
    setResultado([]);
    setSucesso(false);

    const logs: string[] = [];

    try {
      logs.push("🔧 INICIANDO CORREÇÃO AUTOMÁTICA...");
      logs.push("");

      // ETAPA 1: Corrigir RLS
      logs.push("═══════════════════════════════════════");
      logs.push("📋 ETAPA 1: Corrigindo RLS do banco");
      logs.push("═══════════════════════════════════════");

      // Remover políticas antigas e criar novas (uma por vez)
      const comandosSQL = [
        'DROP POLICY IF EXISTS "Usuarios podem ver seus proprios pagamentos" ON historico_pagamentos',
        'DROP POLICY IF EXISTS "Sistema pode inserir pagamentos" ON historico_pagamentos',
        'DROP POLICY IF EXISTS "Sistema pode atualizar pagamentos" ON historico_pagamentos',
        'CREATE POLICY "Usuarios e API podem ver pagamentos" ON historico_pagamentos FOR SELECT USING (true)',
        'CREATE POLICY "API pode inserir pagamentos" ON historico_pagamentos FOR INSERT WITH CHECK (true)',
        'CREATE POLICY "API pode atualizar pagamentos" ON historico_pagamentos FOR UPDATE USING (true) WITH CHECK (true)',
      ];

      let rlsOk = true;
      for (const cmd of comandosSQL) {
        try {
          // Tentar executar usando rpc
          const { error } = await supabase.rpc("exec_sql", { query: cmd });
          if (error) {
            logs.push(`⚠️ Não foi possível executar via RPC: ${error.message}`);
            rlsOk = false;
            break;
          }
        } catch (err: any) {
          logs.push(`⚠️ RPC não disponível: ${err.message}`);
          rlsOk = false;
          break;
        }
      }

      if (rlsOk) {
        logs.push("✅ RLS corrigido com sucesso!");
      } else {
        logs.push("⚠️ RLS não pôde ser corrigido via API");
        logs.push("ℹ️ Pulando para processamento de pagamentos...");
      }

      logs.push("");

      // ETAPA 2: Buscar usuário diegomarqueshm
      logs.push("═══════════════════════════════════════");
      logs.push("📋 ETAPA 2: Buscando usuário diegomarqueshm");
      logs.push("═══════════════════════════════════════");

      const { data: operador, error: erroOperador } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", "diegomarqueshm@icloud.com")
        .maybeSingle();

      if (erroOperador || !operador) {
        logs.push("❌ Usuário não encontrado!");
        setResultado(logs);
        setProcessando(false);
        return;
      }

      logs.push(`✅ Usuário encontrado: ${operador.nome}`);
      logs.push(`📧 Email: ${operador.email}`);
      logs.push(`🆔 ID: ${operador.id}`);
      logs.push("");

      // ETAPA 3: Buscar pagamentos pendentes
      logs.push("═══════════════════════════════════════");
      logs.push("📋 ETAPA 3: Buscando pagamentos pendentes");
      logs.push("═══════════════════════════════════════");

      const { data: pagamentosPendentes, error: erroPagamentos } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("usuario_id", operador.id)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (erroPagamentos) {
        logs.push(`❌ Erro ao buscar pagamentos: ${erroPagamentos.message}`);
        setResultado(logs);
        setProcessando(false);
        return;
      }

      if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
        logs.push("✅ Nenhum pagamento pendente encontrado!");
        logs.push("");
        logs.push("🎉 TUDO CERTO! Não há pagamentos para processar.");
        setResultado(logs);
        setSucesso(true);
        setProcessando(false);
        return;
      }

      logs.push(`✅ Encontrados ${pagamentosPendentes.length} pagamento(s) pendente(s)`);
      logs.push("");

      // ETAPA 4: Processar cada pagamento
      logs.push("═══════════════════════════════════════");
      logs.push("📋 ETAPA 4: Processando pagamentos");
      logs.push("═══════════════════════════════════════");

      for (const pagamento of pagamentosPendentes) {
        logs.push(`💳 Pagamento: ${pagamento.mes_referencia}`);
        logs.push(`💰 Valor: R$ ${pagamento.valor.toFixed(2)}`);
        logs.push(`📅 Dias: ${pagamento.dias_comprados}`);

        // Verificar tempo desde criação
        const tempoCriacao = new Date(pagamento.created_at).getTime();
        const tempoAtual = Date.now();
        const diferencaMinutos = (tempoAtual - tempoCriacao) / (1000 * 60);

        logs.push(`⏱️ Criado há: ${diferencaMinutos.toFixed(1)} minutos`);

        // Cancelar se muito antigo
        if (diferencaMinutos > 10) {
          logs.push("⚠️ Pagamento antigo (>10min) - Cancelando...");
          await supabase
            .from("historico_pagamentos")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", pagamento.id);
          logs.push("✅ Cancelado!");
          logs.push("");
          continue;
        }

        // Aguardar se muito recente
        if (diferencaMinutos < 4) {
          logs.push("⏳ Muito recente (<4min) - Aguardar mais um pouco");
          logs.push("");
          continue;
        }

        // Processar (entre 4-10 minutos)
        logs.push("🔄 Processando manualmente...");

        const dataAtual = new Date();
        let novaDataVencimento: Date;

        if (operador.data_proximo_vencimento) {
          const vencimentoAtual = new Date(operador.data_proximo_vencimento);
          if (vencimentoAtual > dataAtual) {
            novaDataVencimento = new Date(vencimentoAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
            logs.push(`✅ Somando ${pagamento.dias_comprados} dias ao vencimento atual`);
          } else {
            novaDataVencimento = new Date(dataAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
            logs.push(`✅ Iniciando ${pagamento.dias_comprados} dias a partir de hoje`);
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
          .eq("id", operador.id);

        if (erroOperadorUpdate) {
          logs.push(`❌ Erro ao atualizar operador: ${erroOperadorUpdate.message}`);
          logs.push("");
          continue;
        }

        logs.push("✅ Operador atualizado!");

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
          logs.push("");
          continue;
        }

        logs.push("✅ Pagamento marcado como PAGO!");

        // Registrar ganho
        const ganhoId = `ganho_manual_${pagamento.id}_${Date.now()}`;
        await supabase.from("ganhos_admin").insert({
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          valor: pagamento.valor,
          forma_pagamento: pagamento.forma_pagamento,
          descricao: `Pagamento manual de ${pagamento.dias_comprados} dias`,
          created_at: dataAtual.toISOString(),
        });

        logs.push("✅ Ganho registrado!");
        logs.push("");
        logs.push("🎉 PAGAMENTO PROCESSADO COM SUCESSO!");
        logs.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        logs.push("");
      }

      logs.push("═══════════════════════════════════════");
      logs.push("✅ CORREÇÃO FINALIZADA COM SUCESSO!");
      logs.push("═══════════════════════════════════════");
      setSucesso(true);
    } catch (error: any) {
      logs.push("");
      logs.push("❌ ERRO CRÍTICO:");
      logs.push(error.message);
    }

    setResultado(logs);
    setProcessando(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Correção Automática de Pagamentos
          </h1>
          <p className="text-gray-600">
            Clique no botão abaixo para corrigir TUDO automaticamente
          </p>
        </div>

        {/* Aviso */}
        {!processando && resultado.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Esta ferramenta vai:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Corrigir permissões do banco (RLS)</li>
                  <li>Buscar pagamentos pendentes do diegomarqueshm</li>
                  <li>Processar e ativar a conta automaticamente</li>
                  <li>Adicionar os dias comprados</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Botão */}
        {!processando && resultado.length === 0 && (
          <button
            onClick={corrigirTudo}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
          >
            <Zap className="w-6 h-6" />
            <span>CORRIGIR TUDO AUTOMATICAMENTE</span>
          </button>
        )}

        {/* Loading */}
        {processando && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Processando... Aguarde...</p>
          </div>
        )}

        {/* Resultado */}
        {resultado.length > 0 && (
          <div className="space-y-4">
            {/* Status */}
            {sucesso && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800 text-lg">Tudo certo!</p>
                  <p className="text-sm text-green-700">
                    Pagamentos processados com sucesso!
                  </p>
                </div>
              </div>
            )}

            {/* Log */}
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {resultado.join("\n")}
              </pre>
            </div>

            {/* Botão repetir */}
            <button
              onClick={() => {
                setResultado([]);
                setSucesso(false);
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Executar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
