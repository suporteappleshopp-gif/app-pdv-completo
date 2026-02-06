"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Radio, ArrowLeft, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function TestRealtimePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [eventos, setEventos] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    console.log("🔧 Iniciando teste de Realtime...");

    const channel = supabase
      .channel(`test_realtime_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendas",
        },
        (payload) => {
          console.log("✅ Evento Realtime recebido:", payload);
          setEventos((prev) => [
            {
              tipo: payload.eventType,
              data: new Date(),
              detalhes: payload,
            },
            ...prev,
          ]);
        }
      )
      .subscribe((status, err) => {
        console.log("📡 Status da conexão:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime CONECTADO!");
          setStatus("connected");
        } else if (status === "CLOSED") {
          console.warn("⚠️ Conexão fechada");
          setStatus("error");
          setErrorMessage("Conexão foi fechada");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro no canal:", err);
          setStatus("error");
          setErrorMessage(
            "Erro no canal. Realtime pode não estar habilitado nas tabelas."
          );
        }
      });

    // Cleanup
    return () => {
      console.log("🔌 Desconectando teste de Realtime");
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Activity className="w-8 h-8" />
              <span>Teste de Realtime</span>
            </h1>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Status da Conexão
              </h2>
              <p className="text-purple-200">
                Monitorando mudanças na tabela <code>vendas</code>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {status === "connecting" && (
                <>
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 font-semibold">
                    Conectando...
                  </span>
                </>
              )}
              {status === "connected" && (
                <>
                  <Radio className="w-6 h-6 text-green-400 animate-pulse" />
                  <span className="text-green-400 font-semibold">
                    Conectado e Escutando
                  </span>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="text-red-400 font-semibold">Erro</span>
                </>
              )}
            </div>
          </div>

          {status === "error" && errorMessage && (
            <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-200">{errorMessage}</p>
              <p className="text-red-300 text-sm mt-2">
                💡 Vá para <strong>/enable-realtime</strong> para habilitar o
                Realtime
              </p>
            </div>
          )}

          {status === "connected" && (
            <div className="mt-4 bg-green-500/20 border border-green-500 rounded-lg p-4">
              <p className="text-green-200">
                ✅ Realtime está funcionando! Faça uma venda em outro navegador
                para ver os eventos aparecerem aqui.
              </p>
            </div>
          )}
        </div>

        {/* Eventos */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Activity className="w-7 h-7 mr-3" />
            Eventos Recebidos ({eventos.length})
          </h2>

          {eventos.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70">
                Aguardando eventos... Faça uma venda em outro navegador para
                testar.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {eventos.map((evento, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        evento.tipo === "INSERT"
                          ? "bg-green-500/20 text-green-300"
                          : evento.tipo === "UPDATE"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {evento.tipo}
                    </span>
                    <span className="text-purple-300 text-sm">
                      {format(evento.data, "HH:mm:ss")}
                    </span>
                  </div>
                  <pre className="text-green-300 text-xs bg-black/30 p-3 rounded overflow-auto">
                    {JSON.stringify(evento.detalhes, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="bg-blue-500/20 border border-blue-500 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-100 mb-3">
            Como Testar:
          </h3>
          <ol className="text-blue-200 space-y-2 list-decimal list-inside">
            <li>Mantenha esta página aberta</li>
            <li>Abra outro navegador ou aba anônima</li>
            <li>Faça login e vá para o Caixa</li>
            <li>Faça uma venda</li>
            <li>
              Volte para esta página - você deve ver o evento aparecer acima
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
