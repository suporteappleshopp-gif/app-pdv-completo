"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Check, X, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "diegomarqueshm@icloud.com";
const ADMIN_PASSWORD = "Sedexdez@1";

export default function DiagnosticoAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const addResultado = (titulo: string, sucesso: boolean, detalhes?: string) => {
    setResultados((prev) => [...prev, { titulo, sucesso, detalhes }]);
  };

  const executarDiagnostico = async () => {
    setLoading(true);
    setResultados([]);

    try {
      // Teste 1: Verificar conexão com Supabase
      addResultado("Conectando ao Supabase", true, "Conexão estabelecida");

      // Teste 2: Verificar se admin existe na tabela operadores
      const { data: adminData, error: adminError } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", ADMIN_EMAIL)
        .maybeSingle();

      if (adminError) {
        addResultado("Verificar Admin na Tabela", false, `Erro: ${adminError.message}`);
      } else if (!adminData) {
        addResultado("Verificar Admin na Tabela", false, "Admin não encontrado na tabela operadores");
      } else {
        addResultado(
          "Verificar Admin na Tabela",
          true,
          `Admin encontrado: ${adminData.nome} | Is Admin: ${adminData.is_admin} | Ativo: ${adminData.ativo}`
        );

        // Se admin existe mas não está configurado corretamente, corrigir
        if (!adminData.is_admin || !adminData.ativo) {
          addResultado("Corrigindo Permissões do Admin", true, "Atualizando...");

          const { error: updateError } = await supabase
            .from("operadores")
            .update({
              is_admin: true,
              ativo: true,
              suspenso: false,
              aguardando_pagamento: false,
            })
            .eq("email", ADMIN_EMAIL);

          if (updateError) {
            addResultado("Corrigir Permissões", false, `Erro: ${updateError.message}`);
          } else {
            addResultado("Corrigir Permissões", true, "Permissões atualizadas com sucesso!");
          }
        }
      }

      // Teste 3: Tentar fazer login com as credenciais
      addResultado("Testando Login do Admin", true, "Tentando autenticar...");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (authError) {
        addResultado("Login no Supabase Auth", false, `Erro: ${authError.message}`);

        // Se o erro for "Email not confirmed", instruir usuário
        if (authError.message.includes("Email not confirmed")) {
          addResultado(
            "⚠️ Email Não Confirmado",
            false,
            "O email precisa ser confirmado no painel do Supabase. Veja as instruções abaixo para resolver."
          );
        }
        // Se o erro for "Invalid login credentials", o admin pode não existir no Auth
        else if (authError.message.includes("Invalid login")) {
          addResultado("Diagnóstico", false, "Admin não existe no sistema de autenticação. Use o botão 'Configurar Admin' na tela de login.");
        }
      } else if (!authData.user) {
        addResultado("Login no Supabase Auth", false, "Nenhum usuário retornado");
      } else {
        addResultado("Login no Supabase Auth", true, `Login bem-sucedido! User ID: ${authData.user.id}`);

        // Verificar se existe operador vinculado
        const { data: operadorVinculado, error: operadorError } = await supabase
          .from("operadores")
          .select("*")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

        if (operadorError) {
          addResultado("Verificar Vínculo Operador-Auth", false, `Erro: ${operadorError.message}`);
        } else if (!operadorVinculado) {
          addResultado("Verificar Vínculo Operador-Auth", false, "Nenhum operador vinculado a este auth_user_id");
        } else {
          addResultado(
            "Verificar Vínculo Operador-Auth",
            true,
            `Operador vinculado: ${operadorVinculado.nome} | Admin: ${operadorVinculado.is_admin}`
          );

          if (operadorVinculado.is_admin && operadorVinculado.ativo) {
            addResultado("✅ DIAGNÓSTICO COMPLETO", true, "Admin está configurado corretamente! Você pode fazer login.");
          }
        }
      }
    } catch (error: any) {
      addResultado("Erro Geral", false, error?.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Diagnóstico do Administrador</h1>
                <p className="text-purple-200 text-sm">Verificar configuração do admin do sistema</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-blue-100 mb-2">Credenciais do Admin:</h3>
            <div className="space-y-1 text-sm text-blue-200">
              <p><strong>Email:</strong> {ADMIN_EMAIL}</p>
              <p><strong>Senha:</strong> {ADMIN_PASSWORD}</p>
            </div>
          </div>
        </div>

        {/* Botão Executar Diagnóstico */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 mb-6">
          <button
            onClick={executarDiagnostico}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Executando Diagnóstico...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Executar Diagnóstico Completo</span>
              </>
            )}
          </button>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Resultados do Diagnóstico</h2>
            <div className="space-y-3">
              {resultados.map((resultado, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-4 rounded-lg border ${
                    resultado.sucesso
                      ? "bg-green-500/20 border-green-500/30"
                      : "bg-red-500/20 border-red-500/30"
                  }`}
                >
                  {resultado.sucesso ? (
                    <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        resultado.sucesso ? "text-green-100" : "text-red-100"
                      }`}
                    >
                      {resultado.titulo}
                    </p>
                    {resultado.detalhes && (
                      <p
                        className={`text-sm mt-1 ${
                          resultado.sucesso ? "text-green-200" : "text-red-200"
                        }`}
                      >
                        {resultado.detalhes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/setup-admin")}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all"
            >
              <Shield className="w-5 h-5" />
              <span>Ir para Configuração do Admin</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar para Tela de Login</span>
            </button>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-6 mt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-100">
              <h3 className="font-semibold mb-2">Como Resolver Problemas:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Se o diagnóstico mostrar que o admin não existe, use o botão "Configurar Admin" na tela de login ou clique em "Ir para Configuraç��o do Admin" acima.</li>
                <li>Se o admin existe mas as permissões estão incorretas, o diagnóstico tentará corrigir automaticamente.</li>
                <li>Se o login falhar com "Invalid login credentials", o admin precisa ser criado no sistema de autenticação.</li>
                <li>Após configurar, volte à tela de login e entre como administrador usando as credenciais acima.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Instruções Especiais para "Email not confirmed" */}
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 mt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-100 flex-1">
              <h3 className="font-semibold mb-3 text-lg">🔴 ERRO: "Email not confirmed"</h3>
              <p className="mb-4 text-sm">Se você viu este erro, siga estas etapas no painel do Supabase:</p>

              <div className="bg-black/30 rounded-lg p-4 space-y-4 text-sm">
                <div>
                  <p className="font-bold mb-2">📍 OPÇÃO 1: Desabilitar Confirmação de Email (Recomendado)</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Acesse: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-blue-300 hover:text-blue-200">https://supabase.com/dashboard</a></li>
                    <li>Vá em <strong>Authentication</strong> → <strong>Providers</strong></li>
                    <li>Clique em <strong>Email</strong></li>
                    <li>Desmarque a opção <strong>"Confirm email"</strong></li>
                    <li>Clique em <strong>Save</strong></li>
                    <li>Volte aqui e tente fazer login novamente</li>
                  </ol>
                </div>

                <div className="border-t border-red-400/30 pt-3">
                  <p className="font-bold mb-2">📍 OPÇÃO 2: Confirmar Email Manualmente</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Acesse: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-blue-300 hover:text-blue-200">https://supabase.com/dashboard</a></li>
                    <li>Vá em <strong>Authentication</strong> → <strong>Users</strong></li>
                    <li>Encontre o usuário: <strong>{ADMIN_EMAIL}</strong></li>
                    <li>Clique nos três pontos (...) ao lado do usuário</li>
                    <li>Clique em <strong>"Confirm email"</strong> ou <strong>"Verify email"</strong></li>
                    <li>Volte aqui e tente fazer login novamente</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
