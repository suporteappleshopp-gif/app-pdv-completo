"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function ResetDiegoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processando...");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    const resetDiego = async () => {
      try {
        addLog("Iniciando reset dos pagamentos do diego2@gmail.com...");

        await db.init();

        // Buscar operador pelo email
        const { AdminSupabase } = await import("@/lib/admin-supabase");
        const operadores = await AdminSupabase.getAllOperadores();
        const diego = operadores.find((op: any) => op.email === "diego2@gmail.com");

        if (!diego) {
          addLog("❌ Operador diego2@gmail.com não encontrado");
          setStatus("Erro: Operador não encontrado");
          return;
        }

        addLog(`✅ Operador encontrado: ${diego.nome} (ID: ${diego.id})`);

        // Buscar todos os pagamentos existentes
        const pagamentosAntigos = await db.getPagamentosByUsuario(diego.id);
        addLog(`Encontrados ${pagamentosAntigos.length} pagamentos antigos`);

        // Deletar pagamentos antigos
        for (const pag of pagamentosAntigos) {
          try {
            // Usar método direto do IndexedDB
            const transaction = (db as any).db?.transaction(["pagamentos"], "readwrite");
            if (transaction) {
              const store = transaction.objectStore("pagamentos");
              await store.delete(pag.id);
              addLog(`✅ Pagamento ${pag.id} deletado`);
            }
          } catch (err) {
            addLog(`⚠️ Erro ao deletar pagamento ${pag.id}: ${err}`);
          }
        }

        addLog("✅ Todos os pagamentos antigos foram removidos");
        addLog("Na próxima vez que diego2@gmail.com acessar o financeiro, receberá 2 compras de 60 dias automaticamente");

        setStatus("✅ Reset concluído com sucesso!");

        setTimeout(() => {
          addLog("Redirecionando...");
          router.push("/");
        }, 3000);
      } catch (error: any) {
        addLog(`❌ Erro: ${error?.message || error}`);
        setStatus("Erro ao processar");
      }
    };

    resetDiego();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Reset Diego - Pagamentos
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
            ℹ️ <strong>Próximos passos:</strong> Faça logout e login novamente com diego2@gmail.com, depois acesse o Financeiro. O sistema criará automaticamente 2 compras de R$ 59,90 (60 dias cada), totalizando 120 dias de uso.
          </p>
        </div>
      </div>
    </div>
  );
}
