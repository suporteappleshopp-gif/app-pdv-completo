"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const ADMIN_EMAIL = "diegomarqueshm@icloud.com";
const ADMIN_PASSWORD = "Sedexdez@1";
const ADMIN_NAME = "Diego Marques";

export default function SetupAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const setupAdmin = async () => {
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      // Passo 1: Verificar se admin já existe na tabela operadores
      setMessage("Verificando se administrador já existe...");

      const { data: existingOperador } = await supabase
        .from("operadores")
        .select("*")
        .eq("email", ADMIN_EMAIL)
        .maybeSingle();

      if (existingOperador) {
        setMessage("Administrador encontrado! Atualizando permissões...");

        // Atualizar para garantir que é admin e está ativo
        const { error: updateError } = await supabase
          .from("operadores")
          .update({
            is_admin: true,
            ativo: true,
            suspenso: false,
            aguardando_pagamento: false,
            forma_pagamento: null,
            valor_mensal: null,
            dias_assinatura: null,
            data_proximo_vencimento: null,
          })
          .eq("email", ADMIN_EMAIL);

        if (updateError) {
          setStatus("error");
          setMessage("Erro ao atualizar permissões: " + updateError.message);
          setLoading(false);
          return;
        }

        setStatus("success");
        setMessage("✅ Administrador atualizado com sucesso! Você pode fazer login agora com as credenciais acima.");
        setLoading(false);
        return;
      }

      // Passo 2: Criar novo admin no Auth
      setMessage("Criando novo administrador no sistema de autenticação...");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        options: {
          data: {
            nome: ADMIN_NAME,
          },
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        // Se erro for "User already registered", tentar fazer login para pegar o ID
        if (authError.message.includes("already registered")) {
          setMessage("Usuário já existe no Auth. Tentando conectar ao operador...");

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
          });

          if (signInError || !signInData.user) {
            setStatus("error");
            setMessage("Admin existe no Auth mas não consegui conectar. Tente fazer login diretamente.");
            setLoading(false);
            return;
          }

          // Verificar se existe operador vinculado
          const { data: operadorVinculado } = await supabase
            .from("operadores")
            .select("*")
            .eq("auth_user_id", signInData.user.id)
            .maybeSingle();

          if (operadorVinculado) {
            // Atualizar operador existente
            const { error: updateError2 } = await supabase
              .from("operadores")
              .update({
                is_admin: true,
                ativo: true,
                suspenso: false,
                aguardando_pagamento: false,
                forma_pagamento: null,
                valor_mensal: null,
                dias_assinatura: null,
                data_proximo_vencimento: null,
              })
              .eq("auth_user_id", signInData.user.id);

            if (!updateError2) {
              setStatus("success");
              setMessage("✅ Administrador configurado com sucesso! Faça login agora.");
              setLoading(false);
              return;
            }
          }
        }

        setStatus("error");
        setMessage("Erro ao criar admin: " + authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setStatus("error");
        setMessage("Erro: usuário não foi criado no sistema de autenticação");
        setLoading(false);
        return;
      }

      setMessage("✅ Admin criado no Auth. Aguardando criação do operador...");

      // Passo 3: Aguardar trigger criar o operador (mais tempo para garantir)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Passo 4: Verificar se operador foi criado e atualizar permissões
      setMessage("Verificando criação do operador...");

      const { data: operadorCriado, error: checkError } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (!operadorCriado) {
        setStatus("error");
        setMessage("Operador não foi criado automaticamente. Verifique o trigger do banco de dados.");
        setLoading(false);
        return;
      }

      // Passo 5: Atualizar operador para ser admin
      setMessage("Configurando permissões de administrador...");

      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          is_admin: true,
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: null,
          valor_mensal: null,
          dias_assinatura: null,
          data_proximo_vencimento: null,
        })
        .eq("auth_user_id", authData.user.id);

      if (updateError) {
        setStatus("error");
        setMessage("Erro ao configurar permissões de admin: " + updateError.message);
        setLoading(false);
        return;
      }

      setStatus("success");
      setMessage("✅ Administrador criado com sucesso! Você já pode fazer login com as credenciais acima.");
      setLoading(false);
    } catch (error: any) {
      console.error("Erro ao configurar admin:", error);
      setStatus("error");
      setMessage("Erro inesperado: " + (error?.message || "Tente novamente"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Configurar Administrador
          </h1>
          <p className="text-gray-600">
            Configure o acesso administrativo do sistema
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Credenciais do Admin:</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Email:</strong> {ADMIN_EMAIL}</p>
            <p><strong>Senha:</strong> {ADMIN_PASSWORD}</p>
            <p className="text-xs text-blue-600 mt-2">
              ⚠️ Guarde estas credenciais em local seguro
            </p>
          </div>
        </div>

        {status === "idle" && !loading && (
          <button
            onClick={setupAdmin}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Shield className="w-5 h-5" />
            <span>Configurar Administrador</span>
          </button>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="text-sm text-blue-900">{message}</p>
              </div>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-1">Sucesso!</p>
                  <p className="text-sm text-green-800">{message}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Ir para Login
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Erro!</p>
                  <p className="text-sm text-red-800">{message}</p>
                </div>
              </div>
            </div>
            <button
              onClick={setupAdmin}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push("/")}
            className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    </div>
  );
}
