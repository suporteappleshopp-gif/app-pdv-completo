"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertCircle, Play, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EnableRealtimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    detalhes?: any;
  } | null>(null);

  const habilitarRealtime = async () => {
    setLoading(true);
    setResultado(null);

    try {
      console.log("🔧 Habilitando Realtime nas tabelas...");

      // 1. Habilitar replicação na tabela vendas
      const { error: error1 } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE vendas REPLICA IDENTITY FULL;",
      });

      if (error1) {
        console.warn("Aviso ao configurar REPLICA IDENTITY:", error1);
      }

      // 2. Publicar tabela vendas no realtime
      const { error: error2 } = await supabase.rpc("exec_sql", {
        sql: "ALTER PUBLICATION supabase_realtime ADD TABLE vendas;",
      });

      if (error2 && !error2.message.includes("already exists")) {
        console.warn("Aviso ao adicionar vendas:", error2);
      }

      // 3. Habilitar replicação na tabela itens_venda
      const { error: error3 } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE itens_venda REPLICA IDENTITY FULL;",
      });

      if (error3) {
        console.warn("Aviso ao configurar REPLICA IDENTITY itens:", error3);
      }

      // 4. Publicar tabela itens_venda no realtime
      const { error: error4 } = await supabase.rpc("exec_sql", {
        sql: "ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;",
      });

      if (error4 && !error4.message.includes("already exists")) {
        console.warn("Aviso ao adicionar itens_venda:", error4);
      }

      // 5. Verificar se funcionou
      const { data: publicacoes, error: error5 } = await supabase.rpc(
        "exec_sql",
        {
          sql: "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';",
        }
      );

      console.log("✅ Realtime configurado!");
      console.log("Tabelas publicadas:", publicacoes);

      setResultado({
        sucesso: true,
        mensagem: "Realtime habilitado com sucesso!",
        detalhes: publicacoes,
      });
    } catch (error: any) {
      console.error("❌ Erro ao habilitar Realtime:", error);

      setResultado({
        sucesso: false,
        mensagem:
          "Não foi possível habilitar via RPC. Você precisa executar o SQL manualmente no Supabase.",
        detalhes: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <h1 className="text-3xl font-bold text-white">
              🔧 Habilitar Realtime
            </h1>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Explicação */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            O que é Realtime?
          </h2>
          <p className="text-purple-200 mb-4">
            O Realtime permite que as páginas do app sejam atualizadas
            automaticamente quando há mudanças no banco de dados, sem precisar
            recarregar a página.
          </p>
          <p className="text-purple-200 mb-4">
            <strong>Exemplo:</strong> Quando você faz uma venda no Caixa, o
            Histórico e o Financeiro são atualizados instantaneamente em outros
            navegadores abertos.
          </p>

          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mt-4">
            <p className="text-yellow-200 text-sm">
              ⚠️ <strong>Importante:</strong> Se o botão abaixo não funcionar,
              você precisará executar o SQL manualmente no Supabase SQL Editor.
            </p>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <button
            onClick={habilitarRealtime}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Habilitando...</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                <span>Habilitar Realtime Agora</span>
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className={`backdrop-blur-md rounded-2xl shadow-2xl border p-8 ${
              resultado.sucesso
                ? "bg-green-500/20 border-green-500"
                : "bg-red-500/20 border-red-500"
            }`}
          >
            <div className="flex items-start space-x-3">
              {resultado.sucesso ? (
                <CheckCircle className="w-8 h-8 text-green-300 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-300 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`text-xl font-bold mb-2 ${
                    resultado.sucesso ? "text-green-100" : "text-red-100"
                  }`}
                >
                  {resultado.mensagem}
                </h3>
                {resultado.detalhes && (
                  <pre className="text-sm bg-black/30 p-4 rounded-lg overflow-auto text-white">
                    {JSON.stringify(resultado.detalhes, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SQL Manual */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <h3 className="text-xl font-bold text-white mb-4">
            SQL Manual (se necessário)
          </h3>
          <p className="text-purple-200 mb-4">
            Se o botão acima não funcionar, copie e cole este SQL no{" "}
            <strong>Supabase SQL Editor</strong>:
          </p>
          <pre className="bg-black/40 text-green-300 p-4 rounded-lg overflow-auto text-sm">
            {`-- Habilitar Realtime nas tabelas
ALTER TABLE vendas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;

ALTER TABLE itens_venda REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;

-- Verificar
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`}
          </pre>
        </div>
      </div>
    </div>
  );
}
