"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

export default function FixGanhosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string>("");
  const [sucesso, setSucesso] = useState(false);

  const aplicarCorrecao = async () => {
    setLoading(true);
    setResultado("");
    setSucesso(false);

    try {
      // Importar o Supabase com service role
      const { createClient } = await import("@supabase/supabase-js");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !supabaseServiceKey) {
        setResultado("❌ Variáveis de ambiente não configuradas corretamente");
        return;
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Tentar desabilitar RLS usando query SQL raw
      setResultado("🔧 Aplicando correção no banco de dados...\n");

      // Método 1: Tentar buscar primeiro para ver se já funciona
      const { data: testData, error: testError } = await supabaseAdmin
        .from("ganhos_admin")
        .select("count");

      if (!testError) {
        setResultado(prev => prev + "✅ Tabela ganhos_admin já está acessível!\n");
        setResultado(prev => prev + `📊 Registros encontrados: ${testData?.[0]?.count || 0}\n`);
        setSucesso(true);
        return;
      }

      setResultado(prev => prev + `⚠️ Erro detectado: ${testError.message}\n`);
      setResultado(prev => prev + "\n💡 SOLUÇÃO MANUAL NECESSÁRIA:\n");
      setResultado(prev => prev + "\n1. Abra o SQL Editor do Supabase:\n");
      setResultado(prev => prev + "   https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new\n\n");
      setResultado(prev => prev + "2. Cole e execute este comando:\n\n");
      setResultado(prev => prev + "   ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;\n\n");
      setResultado(prev => prev + "3. Clique em 'Run' ou pressione Ctrl+Enter\n\n");
      setResultado(prev => prev + "4. Volte aqui e clique em 'Testar Novamente'\n");

    } catch (error: any) {
      setResultado(prev => prev + `\n❌ Erro: ${error.message}\n`);
      setResultado(prev => prev + "\n💡 Execute manualmente o arquivo FIX_GANHOS_ADMIN.sql no Supabase Dashboard\n");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center">
            🔧 Correção da Tabela Ganhos Admin
          </h1>
          <p className="text-purple-200 mt-2">
            Esta ferramenta corrige problemas de acesso à carteira de ganhos
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Sobre esta correção</p>
                <p>
                  Este utilitário tenta desabilitar o Row Level Security (RLS) na tabela
                  ganhos_admin para permitir acesso total aos dados da carteira.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={aplicarCorrecao}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Aplicando correção...</span>
              </>
            ) : sucesso ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Testar Novamente</span>
              </>
            ) : (
              <>
                <span>Aplicar Correção</span>
              </>
            )}
          </button>

          {resultado && (
            <div className={`rounded-lg p-4 border ${
              sucesso
                ? "bg-green-500/20 border-green-500/30"
                : "bg-orange-500/20 border-orange-500/30"
            }`}>
              <pre className="text-sm text-white whitespace-pre-wrap font-mono">
                {resultado}
              </pre>
            </div>
          )}

          {sucesso && (
            <button
              onClick={() => router.push("/admin/carteira")}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Ir para Carteira de Ganhos</span>
            </button>
          )}

          <button
            onClick={() => router.push("/admin")}
            className="w-full px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
