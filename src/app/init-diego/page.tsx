"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function InitDiegoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processando...");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    const initDiego = async () => {
      try {
        addLog("Iniciando processo...");

        // Buscar operador no Supabase
        addLog("Buscando operador diego2@gmail.com no Supabase...");
        const { data: operador, error } = await supabase
          .from("operadores")
          .select("*")
          .eq("email", "diego2@gmail.com")
          .single();

        if (error || !operador) {
          addLog(`❌ Erro: Operador não encontrado - ${error?.message}`);
          setStatus("Erro: Operador não encontrado");
          return;
        }

        addLog(`✅ Operador encontrado: ${operador.nome} (ID: ${operador.id})`);

        // Atualizar dias restantes no Supabase (99 dias)
        addLog("Atualizando dias restantes para 99 dias...");
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 99);

        const { error: updateError } = await supabase
          .from("operadores")
          .update({
            data_proximo_vencimento: dataVencimento.toISOString(),
            ativo: true,
            suspenso: false,
            aguardando_pagamento: false,
          })
          .eq("email", "diego2@gmail.com");

        if (updateError) {
          addLog(`❌ Erro ao atualizar operador: ${updateError.message}`);
          setStatus("Erro ao atualizar operador");
          return;
        }

        addLog(`✅ Operador atualizado com sucesso! Vencimento: ${dataVencimento.toLocaleDateString()}`);

        // Adicionar pagamento no IndexedDB
        addLog("Inicializando IndexedDB...");
        await db.init();

        addLog("Criando registro de pagamento...");
        const novoPagamento = {
          id: `pag_diego_${Date.now()}`,
          usuarioId: operador.id,
          mesReferencia: "Renovação 100 dias - PIX",
          valor: 59.90,
          dataVencimento: new Date(),
          dataPagamento: new Date(),
          status: "pago" as const,
          formaPagamento: "pix" as const,
          diasComprados: 100,
          tipoCompra: "renovacao-100" as const,
        };

        await db.addPagamento(novoPagamento);

        addLog("✅ Pagamento adicionado ao IndexedDB com sucesso!");
        addLog(`   - ID: ${novoPagamento.id}`);
        addLog(`   - Valor: R$ ${novoPagamento.valor}`);
        addLog(`   - Dias: 100`);
        addLog(`   - Tipo: ${novoPagamento.tipoCompra}`);

        setStatus("✅ Concluído com sucesso!");

        // Redirecionar após 3 segundos
        setTimeout(() => {
          addLog("Redirecionando para a página inicial...");
          router.push("/");
        }, 3000);
      } catch (error: any) {
        addLog(`❌ Erro geral: ${error?.message || error}`);
        setStatus("Erro ao processar");
      }
    };

    initDiego();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Inicialização Diego
        </h1>

        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          <p className="text-white font-semibold text-lg text-center">{status}</p>
        </div>

        <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h2 className="text-white font-semibold mb-3">Log de Execução:</h2>
          <div className="space-y-1">
            {log.map((entry, index) => (
              <p key={index} className="text-green-300 text-sm font-mono">
                {entry}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    </div>
  );
}
