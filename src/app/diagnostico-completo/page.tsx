"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Loader2, Database, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DiagnosticoResultado {
  titulo: string;
  status: "sucesso" | "erro" | "aviso";
  mensagem: string;
  detalhes?: string;
}

export default function DiagnosticoCompleto() {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [resultados, setResultados] = useState<DiagnosticoResultado[]>([]);

  const executarDiagnostico = async () => {
    setDiagnosticando(true);
    const resultados: DiagnosticoResultado[] = [];

    // 1. Verificar token Mercado Pago
    resultados.push({
      titulo: "Token Mercado Pago",
      status: "aviso",
      mensagem: "Não é possível verificar do cliente",
      detalhes: "Token deve estar configurado no .env.local no servidor",
    });

    // 2. Buscar usuário diegomarqueshm
    try {
      const { data: operador, error: erroOperador } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", "diegomarqueshm@icloud.com")
        .maybeSingle();

      if (erroOperador) {
        resultados.push({
          titulo: "Buscar Operador Diego",
          status: "erro",
          mensagem: `Erro ao buscar: ${erroOperador.message}`,
          detalhes: JSON.stringify(erroOperador, null, 2),
        });
      } else if (!operador) {
        resultados.push({
          titulo: "Buscar Operador Diego",
          status: "erro",
          mensagem: "Usuário diegomarqueshm não encontrado",
        });
      } else {
        resultados.push({
          titulo: "Buscar Operador Diego",
          status: "sucesso",
          mensagem: `Usuário encontrado: ${operador.nome}`,
          detalhes: JSON.stringify({
            id: operador.id,
            nome: operador.nome,
            email: operador.email,
            ativo: operador.ativo,
            suspenso: operador.suspenso,
            aguardando_pagamento: operador.aguardando_pagamento,
            vencimento: operador.data_proximo_vencimento,
          }, null, 2),
        });

        // 3. Buscar pagamentos do Diego
        const { data: pagamentos, error: erroPagamentos } = await supabase
          .from("historico_pagamentos")
          .select("*")
          .eq("usuario_id", operador.id)
          .order("created_at", { ascending: false });

        if (erroPagamentos) {
          resultados.push({
            titulo: "Buscar Pagamentos",
            status: "erro",
            mensagem: `Erro RLS ou permissão: ${erroPagamentos.message}`,
            detalhes: JSON.stringify(erroPagamentos, null, 2),
          });
        } else {
          resultados.push({
            titulo: "Buscar Pagamentos",
            status: "sucesso",
            mensagem: `${pagamentos?.length || 0} pagamento(s) encontrado(s)`,
            detalhes: JSON.stringify(pagamentos, null, 2),
          });

          // 4. Filtrar pagamentos pendentes
          const pendentes = pagamentos?.filter((p) => p.status === "pendente") || [];
          if (pendentes.length > 0) {
            resultados.push({
              titulo: "Pagamentos Pendentes",
              status: "aviso",
              mensagem: `${pendentes.length} pagamento(s) pendente(s) encontrado(s)`,
              detalhes: JSON.stringify(pendentes.map(p => ({
                id: p.id,
                mes: p.mes_referencia,
                valor: p.valor,
                dias: p.dias_comprados,
                criado: p.created_at,
              })), null, 2),
            });
          } else {
            resultados.push({
              titulo: "Pagamentos Pendentes",
              status: "sucesso",
              mensagem: "Nenhum pagamento pendente",
            });
          }
        }

        // 5. Tentar INSERT de teste (para verificar RLS)
        const testeId = `teste_${Date.now()}`;
        const { error: erroInsert } = await supabase
          .from("historico_pagamentos")
          .insert({
            id: testeId,
            usuario_id: operador.id,
            mes_referencia: "TESTE - NÃO CONSIDERAR",
            valor: 0.01,
            data_vencimento: new Date().toISOString(),
            data_pagamento: new Date().toISOString(),
            status: "cancelado",
            forma_pagamento: "pix",
            dias_comprados: 0,
            tipo_compra: "teste",
          });

        if (erroInsert) {
          resultados.push({
            titulo: "Teste INSERT (RLS)",
            status: "erro",
            mensagem: `RLS está bloqueando INSERT: ${erroInsert.message}`,
            detalhes: JSON.stringify(erroInsert, null, 2),
          });
        } else {
          resultados.push({
            titulo: "Teste INSERT (RLS)",
            status: "sucesso",
            mensagem: "INSERT funcionando corretamente",
          });

          // Deletar o teste
          await supabase
            .from("historico_pagamentos")
            .delete()
            .eq("id", testeId);
        }
      }
    } catch (error: any) {
      resultados.push({
        titulo: "Erro Crítico",
        status: "erro",
        mensagem: error.message || "Erro desconhecido",
        detalhes: error.stack || "",
      });
    }

    // 6. Verificar variáveis de ambiente (client-side)
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    resultados.push({
      titulo: "Variáveis de Ambiente",
      status: "sucesso",
      mensagem: "Verificação concluída",
      detalhes: JSON.stringify(envVars, null, 2),
    });

    setResultados(resultados);
    setDiagnosticando(false);
  };

  const getIcone = (status: string) => {
    switch (status) {
      case "sucesso":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "erro":
        return <XCircle className="w-6 h-6 text-red-500" />;
      case "aviso":
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getCorBorda = (status: string) => {
    switch (status) {
      case "sucesso":
        return "border-green-200 bg-green-50";
      case "erro":
        return "border-red-200 bg-red-50";
      case "aviso":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Diagnóstico Completo do Sistema
            </h1>
            <p className="text-gray-600">
              Verifica conexão com banco, RLS, pagamentos pendentes e mais
            </p>
          </div>

          {/* Botão */}
          <button
            onClick={executarDiagnostico}
            disabled={diagnosticando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mb-6"
          >
            {diagnosticando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Diagnosticando...</span>
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                <span>Executar Diagnóstico</span>
              </>
            )}
          </button>

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="space-y-4">
              {resultados.map((resultado, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${getCorBorda(resultado.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getIcone(resultado.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {resultado.titulo}
                      </h3>
                      <p className="text-sm text-gray-700 mb-2">
                        {resultado.mensagem}
                      </p>
                      {resultado.detalhes && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-700 mb-2">
                            Ver detalhes
                          </summary>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded overflow-auto max-h-48">
                            {resultado.detalhes}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Instruções */}
          {resultados.length > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Próximos Passos:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>Se houver erro de RLS, aplique o arquivo <code>APLICAR_FIX_RLS.sql</code></li>
                <li>Se houver pagamentos pendentes, use <code>/processar-pagamentos-pendentes</code></li>
                <li>Se token Mercado Pago não estiver configurado, verifique <code>.env.local</code></li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
