"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Pagamento } from "@/lib/types";

export default function AtualizarDiegoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processando...");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    const atualizar = async () => {
      try {
        addLog("Iniciando atualização do diego2@gmail.com...");

        await db.init();
        addLog("✅ Banco de dados inicializado");

        // Buscar operador
        const { AdminSupabase } = await import("@/lib/admin-supabase");
        const operadores = await AdminSupabase.getAllOperadores();
        const diego = operadores.find((op: any) => op.email === "diego2@gmail.com");

        if (!diego) {
          addLog("❌ Operador não encontrado");
          setStatus("Erro: Operador não encontrado");
          return;
        }

        addLog(`✅ Operador encontrado: ${diego.nome} (ID: ${diego.id})`);

        // Buscar pagamentos existentes
        const pagamentosAntigos = await db.getPagamentosByUsuario(diego.id);
        addLog(`Encontrados ${pagamentosAntigos.length} pagamentos existentes`);

        // Deletar todos os pagamentos antigos usando transação direta
        if (pagamentosAntigos.length > 0) {
          addLog("Deletando pagamentos antigos...");

          for (const pag of pagamentosAntigos) {
            try {
              // Acessar diretamente o IndexedDB
              const dbInstance = (db as any).db;
              if (dbInstance) {
                const transaction = dbInstance.transaction(["pagamentos"], "readwrite");
                const store = transaction.objectStore("pagamentos");
                await new Promise((resolve, reject) => {
                  const request = store.delete(pag.id);
                  request.onsuccess = () => {
                    addLog(`✅ Deletado: ${pag.mesReferencia}`);
                    resolve(true);
                  };
                  request.onerror = () => reject(request.error);
                });
              }
            } catch (err) {
              addLog(`⚠️ Erro ao deletar ${pag.id}: ${err}`);
            }
          }

          addLog("✅ Todos os pagamentos antigos foram deletados");
        }

        // Criar 2 novos pagamentos de 60 dias
        addLog("Criando 2 novos pagamentos de 60 dias...");

        const primeiroPagamento: Pagamento = {
          id: `pag_diego_novo_1_${Date.now()}`,
          usuarioId: diego.id,
          mesReferencia: "Renovação 60 dias - PIX",
          valor: 59.90,
          dataVencimento: new Date(),
          dataPagamento: new Date(),
          status: "pago",
          formaPagamento: "pix",
          diasComprados: 60,
          tipoCompra: "renovacao-60",
        };

        await db.addPagamento(primeiroPagamento);
        addLog("✅ Primeira compra adicionada (60 dias)");

        await new Promise(resolve => setTimeout(resolve, 100));

        const segundoPagamento: Pagamento = {
          id: `pag_diego_novo_2_${Date.now()}`,
          usuarioId: diego.id,
          mesReferencia: "Renovação 60 dias - PIX",
          valor: 59.90,
          dataVencimento: new Date(),
          dataPagamento: new Date(),
          status: "pago",
          formaPagamento: "pix",
          diasComprados: 60,
          tipoCompra: "renovacao-60",
        };

        await db.addPagamento(segundoPagamento);
        addLog("✅ Segunda compra adicionada (60 dias)");

        addLog("✅ Total: 120 dias / R$ 119,80");

        setStatus("✅ Atualização concluída!");

        setTimeout(() => {
          addLog("Redirecionando...");
          router.push("/");
        }, 3000);
      } catch (error: any) {
        addLog(`❌ Erro: ${error?.message || error}`);
        setStatus("Erro ao processar");
      }
    };

    atualizar();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Atualizar Diego - 120 dias
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

        <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            ℹ️ <strong>Próximo passo:</strong> Faça logout e login novamente com diego2@gmail.com, depois acesse o Financeiro para ver os 120 dias (2x R$ 59,90).
          </p>
        </div>
      </div>
    </div>
  );
}
