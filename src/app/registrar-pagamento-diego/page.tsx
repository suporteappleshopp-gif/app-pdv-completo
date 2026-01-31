"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

/**
 * Página para registrar manualmente o pagamento do diegomarqueshm
 * que foi aprovado no Mercado Pago mas não foi processado pelo webhook
 */
export default function RegistrarPagamentoDiego() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");
  const [detalhes, setDetalhes] = useState<any>(null);

  const EMAIL_DIEGO = "diegomarqueshm@icloud.com";

  const registrarPagamento = async () => {
    try {
      setStatus("loading");
      setMensagem("Processando...");
      setDetalhes(null);

      // 1. Criar a tabela historico_pagamentos se não existir
      const { error: createTableError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS historico_pagamentos (
            id TEXT PRIMARY KEY,
            usuario_id TEXT NOT NULL,
            mes_referencia TEXT NOT NULL,
            valor NUMERIC(10,2) NOT NULL,
            data_vencimento TIMESTAMP WITH TIME ZONE,
            data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
            forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
            dias_comprados INTEGER NOT NULL,
            tipo_compra TEXT NOT NULL,
            mercadopago_payment_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      }).catch(() => {
        // Tabela pode já existir, ignorar erro
        console.log("Tabela já existe ou sem permissão para criar via RPC");
      });

      // 2. Buscar operador diegomarqueshm
      const { data: operador, error: findError } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", EMAIL_DIEGO)
        .maybeSingle();

      if (findError || !operador) {
        throw new Error(`Operador não encontrado: ${findError?.message || "Não existe no banco"}`);
      }

      console.log("Operador encontrado:", operador);

      // 3. Verificar se já existe registro de pagamento com este mercadopago_payment_id
      // (para evitar duplicação se rodar o script múltiplas vezes)
      const mercadopagoId = "manual_diego_correction";
      const { data: existingPayment } = await supabase
        .from("historico_pagamentos")
        .select("id")
        .eq("mercadopago_payment_id", mercadopagoId)
        .maybeSingle();

      if (existingPayment) {
        setStatus("success");
        setMensagem("Pagamento já foi registrado anteriormente!");
        setDetalhes({
          operador: operador.nome,
          email: operador.email,
          pagamento_existente: existingPayment.id,
        });
        return;
      }

      // 4. Adicionar dias ao operador (60 dias - PIX R$ 59,90)
      const dataAtual = new Date();
      const diasComprados = 60;
      let novaDataVencimento: Date;

      // Se já tem vencimento, somar; senão, começar de hoje
      if (operador.data_proximo_vencimento) {
        const vencimentoAtual = new Date(operador.data_proximo_vencimento);
        if (vencimentoAtual > dataAtual) {
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
        } else {
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
        }
      } else {
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
      }

      // 5. Atualizar operador
      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: "pix",
          data_pagamento: dataAtual.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: diasComprados,
          updated_at: new Date().toISOString(),
        })
        .eq("email", EMAIL_DIEGO);

      if (updateError) {
        throw new Error(`Erro ao atualizar operador: ${updateError.message}`);
      }

      // 6. Registrar no histórico de pagamentos
      const pagamentoId = `manual_diego_${Date.now()}`;
      const { error: historyError } = await supabase
        .from("historico_pagamentos")
        .insert({
          id: pagamentoId,
          usuario_id: operador.id,
          mes_referencia: "Renovação 60 dias - PIX (Correção Manual)",
          valor: 59.90,
          data_vencimento: dataAtual.toISOString(),
          data_pagamento: dataAtual.toISOString(),
          status: "pago",
          forma_pagamento: "pix",
          dias_comprados: diasComprados,
          tipo_compra: "renovacao-60",
          mercadopago_payment_id: mercadopagoId,
          created_at: dataAtual.toISOString(),
          updated_at: dataAtual.toISOString(),
        });

      if (historyError) {
        console.warn("Aviso ao registrar histórico:", historyError.message);
      }

      // 7. Registrar nos ganhos do admin
      const ganhoId = `ganho_manual_diego_${Date.now()}`;
      const { error: ganhoError } = await supabase
        .from("ganhos_admin")
        .insert({
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          valor: 59.90,
          forma_pagamento: "pix",
          descricao: `Pagamento de 60 dias via PIX - Correção Manual`,
          created_at: dataAtual.toISOString(),
        });

      if (ganhoError) {
        console.warn("Aviso ao registrar ganho:", ganhoError.message);
      }

      // 8. Sucesso!
      setStatus("success");
      setMensagem("Pagamento registrado com sucesso!");
      setDetalhes({
        operador: operador.nome,
        email: operador.email,
        dias_adicionados: diasComprados,
        novo_vencimento: novaDataVencimento.toLocaleDateString("pt-BR"),
        valor: "R$ 59,90",
        historico_registrado: !historyError,
        ganho_registrado: !ganhoError,
        pagamento_id: pagamentoId,
        ganho_id: ganhoId,
      });
    } catch (error: any) {
      setStatus("error");
      setMensagem(`Erro: ${error.message}`);
      console.error("Erro ao registrar pagamento:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Registrar Pagamento - Diego Marques
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Situação:</strong> O pagamento foi aprovado no Mercado Pago, mas o webhook não
            processou corretamente. Este script irá:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li>Adicionar 60 dias à conta do usuário</li>
            <li>Registrar no histórico de pagamentos</li>
            <li>Registrar nos ganhos do admin</li>
            <li>Ativar a conta e remover flags de suspensão</li>
          </ul>
        </div>

        {status === "idle" && (
          <button
            onClick={registrarPagamento}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all"
          >
            Registrar Pagamento
          </button>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">{mensagem}</span>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">{mensagem}</span>
            </div>

            {detalhes && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Detalhes:</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>
                    <strong>Operador:</strong> {detalhes.operador}
                  </p>
                  <p>
                    <strong>Email:</strong> {detalhes.email}
                  </p>
                  {detalhes.dias_adicionados && (
                    <>
                      <p>
                        <strong>Dias adicionados:</strong> {detalhes.dias_adicionados}
                      </p>
                      <p>
                        <strong>Novo vencimento:</strong> {detalhes.novo_vencimento}
                      </p>
                      <p>
                        <strong>Valor:</strong> {detalhes.valor}
                      </p>
                      <p>
                        <strong>Histórico registrado:</strong>{" "}
                        {detalhes.historico_registrado ? "Sim" : "Não"}
                      </p>
                      <p>
                        <strong>Ganho registrado:</strong>{" "}
                        {detalhes.ganho_registrado ? "Sim" : "Não"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
            >
              Recarregar Página
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="w-6 h-6" />
              <span className="font-semibold">{mensagem}</span>
            </div>

            <button
              onClick={() => setStatus("idle")}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
