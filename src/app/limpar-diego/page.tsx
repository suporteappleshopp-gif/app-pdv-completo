"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LimparDiegoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Aguardando...");

  useEffect(() => {
    setStatus("Clique no botão abaixo para limpar os dados");
  }, []);

  const limparDados = async () => {
    try {
      setStatus("Limpando dados do diego2@gmail.com...");

      // Limpar IndexedDB completamente
      const databases = await indexedDB.databases();

      for (const db of databases) {
        if (db.name === "pdv_database") {
          indexedDB.deleteDatabase(db.name);
          console.log("Banco de dados deletado:", db.name);
        }
      }

      setStatus("✅ Dados limpos! Faça logout e login novamente com diego2@gmail.com");

      // Limpar localStorage também
      localStorage.clear();
      sessionStorage.clear();

      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error: any) {
      setStatus(`❌ Erro: ${error?.message || error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-lg w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Limpar Dados - Diego
        </h1>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <p className="text-white font-semibold text-center">{status}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={limparDados}
            className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg"
          >
            Limpar Todos os Dados
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
          >
            Voltar para Home
          </button>
        </div>

        <div className="mt-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            ⚠️ <strong>Atenção:</strong> Isso vai deletar TODOS os dados locais do navegador (IndexedDB e LocalStorage). Após limpar:
            <br /><br />
            1. Faça logout<br />
            2. Faça login novamente com diego2@gmail.com<br />
            3. Acesse o Financeiro<br />
            4. O sistema criará automaticamente 2 compras de 60 dias (total: 120 dias)
          </p>
        </div>
      </div>
    </div>
  );
}
