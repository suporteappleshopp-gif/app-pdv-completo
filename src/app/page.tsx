"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthSupabase } from "@/lib/auth-supabase";
import { Operador } from "@/lib/types";
import { LogIn, Loader2, User, Lock, Shield, UserPlus, CreditCard, Copy, CheckCircle, AlertCircle, ExternalLink, Calendar, MessageCircle } from "lucide-react";
import { addDays, differenceInDays } from "date-fns";

type ModoAcesso = "usuario" | "admin" | "cadastro";

export default function LoginPage() {
  const router = useRouter();
  const [modoAcesso, setModoAcesso] = useState<ModoAcesso>("usuario");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dbReady, setDbReady] = useState(false);
  
  // Estados do cadastro
  const [novoCadastro, setNovoCadastro] = useState({
    email: "",
    senha: "",
    confirmarSenha: "",
    formaPagamento: "pix" as "pix" | "cartao",
  });
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [cadastroSucesso, setCadastroSucesso] = useState(false);

  const ADMIN_EMAIL = "diegomarqueshm@icloud.com";
  const ADMIN_PASSWORD = "Sedexdez@1";
  const LINK_PAGAMENTO_CARTAO = "https://mpago.li/12S6mJE"; // Link para pagamento de R$ 149,70 parcelado em até 3x (180 dias)
  const LINK_PAGAMENTO_PIX = "https://mpago.la/24Hxr1X"; // Link para pagamento PIX de R$ 59,90 (60 dias)
  const WHATSAPP_CONTATO = process.env.NEXT_PUBLIC_WHATSAPP_CONTATO || "5565981032239";

  useEffect(() => {
    const initDB = async () => {
      try {
        // Verificar se já tem sessão ativa
        const session = await AuthSupabase.getSession();
        if (session) {
          const operador = await AuthSupabase.getCurrentOperador();
          if (operador) {
            if (operador.isAdmin) {
              router.push("/admin");
            } else {
              router.push("/caixa");
            }
            return;
          }
        }

        setDbReady(true);
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
        setDbReady(true);
      }
    };

    initDB();
  }, [router]);

  const configurarAdminAgora = async () => {
    setLoading(true);
    setError("");

    try {
      const { supabase } = await import("@/lib/supabase");

      // Passo 1: Tentar criar o usuário no Supabase Auth
      console.log("🔐 Criando admin no Supabase Auth...");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        options: {
          data: {
            nome: "Diego Marques",
          },
        },
      });

      // Se o erro for "User already registered" ou "rate limit", tentar fazer login
      if (
        authError?.message?.includes("already registered") ||
        authError?.message?.includes("User already registered") ||
        authError?.message?.includes("rate limit") ||
        authError?.message?.includes("Email rate limit exceeded")
      ) {
        console.log("⚠️ Usuário já existe ou rate limit atingido. Tentando fazer login...");

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });

        if (signInError || !signInData.user) {
          if (authError?.message?.includes("rate limit")) {
            setError("Limite de tentativas excedido. Aguarde alguns minutos e tente fazer login diretamente com as credenciais.");
          } else {
            setError("Admin já existe mas a senha está incorreta. Tente fazer login diretamente.");
          }
          setLoading(false);
          return;
        }

        // Verificar se operador existe e vincular
        const { data: operadorExistente } = await supabase
          .from("operadores")
          .select("*")
          .eq("auth_user_id", signInData.user.id)
          .maybeSingle();

        if (operadorExistente) {
          // Atualizar operador existente para ser admin
          const { error: updateError } = await supabase
            .from("operadores")
            .update({
              is_admin: true,
              ativo: true,
              suspenso: false,
              aguardando_pagamento: false,
            })
            .eq("auth_user_id", signInData.user.id);

          if (updateError) {
            setError("Erro ao atualizar permissões: " + updateError.message);
            setLoading(false);
            return;
          }

          await supabase.auth.signOut();
          alert("✅ Admin configurado com sucesso! Agora você pode fazer login.");
          setLoading(false);
          return;
        } else {
          // Se não existe operador, criar manualmente
          console.log("⚠️ Operador não existe. Criando manualmente...");

          const { data: novoOperador, error: insertError } = await supabase
            .from("operadores")
            .insert({
              auth_user_id: signInData.user.id,
              email: ADMIN_EMAIL,
              nome: "Diego Marques",
              senha: "",
              is_admin: true,
              ativo: true,
              suspenso: false,
              aguardando_pagamento: false,
            })
            .select()
            .single();

          if (insertError) {
            setError("Erro ao criar operador: " + insertError.message);
            setLoading(false);
            return;
          }

          await supabase.auth.signOut();
          alert("✅ Admin criado com sucesso! Agora você pode fazer login.");
          setLoading(false);
          return;
        }
      } else if (authError) {
        setError("Erro ao criar admin: " + authError.message);
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError("Erro: usuário não foi criado");
        setLoading(false);
        return;
      }

      console.log("✅ Admin criado no Auth! ID:", authData.user.id);

      // Passo 2: Aguardar um pouco para possível trigger
      console.log("⏳ Aguardando possível criação automática...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Passo 3: Verificar se operador foi criado pelo trigger
      let { data: operadorCriado } = await supabase
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      // Passo 4: Se não existe, criar manualmente
      if (!operadorCriado) {
        console.log("⚠️ Trigger não criou o operador. Criando manualmente...");

        const { data: novoOperador, error: insertError } = await supabase
          .from("operadores")
          .insert({
            auth_user_id: authData.user.id,
            email: ADMIN_EMAIL,
            nome: "Diego Marques",
            senha: "", // Senha gerenciada pelo Auth
            is_admin: true,
            ativo: true,
            suspenso: false,
            aguardando_pagamento: false,
          })
          .select()
          .single();

        if (insertError) {
          setError("Erro ao criar operador: " + insertError.message);
          setLoading(false);
          return;
        }

        operadorCriado = novoOperador;
        console.log("✅ Operador criado manualmente:", operadorCriado.id);
      } else {
        console.log("✅ Operador já existe:", operadorCriado.id);

        // Atualizar para garantir que é admin
        const { error: updateError } = await supabase
          .from("operadores")
          .update({
            is_admin: true,
            ativo: true,
            suspenso: false,
            aguardando_pagamento: false,
          })
          .eq("auth_user_id", authData.user.id);

        if (updateError) {
          console.warn("⚠️ Erro ao atualizar operador:", updateError.message);
        }
      }

      console.log("✅ Admin configurado com sucesso!");

      alert("✅ Administrador criado com sucesso! Agora você pode fazer login.");
      setLoading(false);
    } catch (err) {
      console.error("Erro ao configurar admin:", err);
      setError("Erro ao configurar administrador: " + (err instanceof Error ? err.message : "Erro desconhecido"));
      setLoading(false);
    }
  };

  const handleAcessar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (modoAcesso === "usuario") {
        // Login de usuário normal - usar email como identificador
        const email = nomeCompleto.trim();

        if (!email) {
          setError("Digite seu email");
          setLoading(false);
          return;
        }

        if (senha.length < 6) {
          setError("A senha deve ter no mínimo 6 caracteres");
          setLoading(false);
          return;
        }

        // Fazer login com Supabase
        const resultado = await AuthSupabase.signIn(email, senha);

        if (!resultado.success || !resultado.operador) {
          setError(resultado.error || "Email ou senha incorretos");
          setLoading(false);
          return;
        }

        const operador = resultado.operador;

        // NÃO salvar no localStorage - usar APENAS sessão Supabase
        // Os dados virão sempre do banco de dados

        router.push("/caixa");
      } else {
        // Login Admin - apenas com senha
        const senhaAdminDigitada = senhaAdmin.trim();

        if (!senhaAdminDigitada) {
          setError("Digite a senha do administrador");
          setLoading(false);
          return;
        }

        // Verificar senha diretamente
        if (senhaAdminDigitada === ADMIN_PASSWORD) {
          // Login admin bem-sucedido
          // Criar sessão temporária no localStorage apenas para o admin master
          localStorage.setItem("admin_master_session", "true");

          console.log("✅ Login de administrador bem-sucedido!");
          router.push("/admin");
        } else {
          setError("Senha de administrador incorreta");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Erro no acesso:", err);
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  const handleCadastrar = async () => {
    setError("");

    // Validações
    if (!novoCadastro.email.trim()) {
      setError("Digite seu email");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoCadastro.email.trim())) {
      setError("Digite um email válido");
      return;
    }

    if (novoCadastro.senha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (novoCadastro.senha !== novoCadastro.confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      const { supabase } = await import("@/lib/supabase");
      const emailTrimmed = novoCadastro.email.trim();
      const nomeExtraido = emailTrimmed.split("@")[0];

      // Verificar se o email já existe
      const { data: emailExistente } = await supabase
        .from("operadores")
        .select("email")
        .eq("email", emailTrimmed)
        .maybeSingle();

      if (emailExistente) {
        setError("Este email já está cadastrado. Tente fazer login.");
        return;
      }

      // Tentar criar no Supabase Auth (pode falhar com rate limit)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailTrimmed,
        password: novoCadastro.senha,
        options: {
          data: {
            nome: nomeExtraido,
          },
        },
      });

      // Se deu erro de rate limit ou qualquer outro erro, criar direto no banco
      if (authError || !authData.user) {
        console.log("⚠️ Criando usuário diretamente no banco (bypass Auth)");

        // Gerar ID único
        const novoId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Criar operador direto no banco sem Auth
        const { data: novoOperador, error: insertError } = await supabase
          .from("operadores")
          .insert({
            id: novoId,
            email: emailTrimmed,
            nome: nomeExtraido,
            senha: novoCadastro.senha,
            is_admin: false,
            ativo: false,
            suspenso: true,
            aguardando_pagamento: true,
          })
          .select()
          .single();

        if (insertError) {
          setError("Erro ao criar cadastro: " + insertError.message);
          return;
        }

        console.log("✅ Usuário criado direto no banco:", novoOperador.id);
      } else {
        // Auth funcionou, aguardar trigger ou criar operador
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: operadorExistente } = await supabase
          .from("operadores")
          .select("*")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

        if (!operadorExistente) {
          // Criar operador manualmente
          const novoId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          await supabase.from("operadores").insert({
            id: novoId,
            auth_user_id: authData.user.id,
            email: emailTrimmed,
            nome: nomeExtraido,
            senha: novoCadastro.senha,
            is_admin: false,
            ativo: false,
            suspenso: true,
            aguardando_pagamento: true,
          });
        } else {
          // Atualizar operador existente
          await supabase
            .from("operadores")
            .update({
              ativo: false,
              suspenso: true,
              aguardando_pagamento: true,
            })
            .eq("auth_user_id", authData.user.id);
        }

        console.log("✅ Usuário criado via Auth:", authData.user.id);
      }

      // Mostrar tela de pagamento
      setMostrarPagamento(true);
      setCadastroSucesso(true);
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      setError("Erro ao criar cadastro. Tente novamente.");
    }
  };

  const voltarParaLogin = () => {
    setModoAcesso("usuario");
    setMostrarPagamento(false);
    setCadastroSucesso(false);
    setNovoCadastro({ email: "", senha: "", confirmarSenha: "", formaPagamento: "pix" });
    setError("");
  };

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
  };

  const abrirPagamento = () => {
    const link = novoCadastro.formaPagamento === "pix" ? LINK_PAGAMENTO_PIX : LINK_PAGAMENTO_CARTAO;
    window.open(link, "_blank");
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  // Tela de Pagamento
  if (mostrarPagamento && cadastroSucesso) {
    const isPix = novoCadastro.formaPagamento === "pix";
    const valor = isPix ? "59,90" : "149,70";
    const dias = isPix ? 60 : 180;
    const periodo = isPix ? "60 dias" : "180 dias";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h1>
            <p className="text-gray-600 text-sm">
              Agora finalize o pagamento para ativar sua conta
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">
                  {isPix ? "Pagamento via PIX" : "Pagamento via Cartão"}
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600">R$ {valor}</span>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  {dias} dias de acesso completo ({periodo})
                </span>
              </div>
            </div>

            {!isPix && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-purple-800 text-center">
                  💳 Parcele em até 3x sem juros
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para ser redirecionado à página segura de pagamento.
            </p>

            <button
              onClick={abrirPagamento}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
            >
              <CreditCard className="w-5 h-5" />
              <span>{isPix ? "Pagar com PIX" : "Pagar com Cartão de Crédito"}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Importante:</p>
                <p>Sua conta será ativada automaticamente após a confirmação do pagamento. Isso pode levar alguns minutos.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Acesso de R$ {valor}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{dias} dias de acesso completo</span>
            </div>
            {!isPix && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Parcelamento em até 3x sem juros</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Aviso de renovação 5 dias antes do vencimento</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Suporte técnico incluído</span>
            </div>
          </div>

          <button
            onClick={voltarParaLogin}
            className="w-full mt-6 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  // Tela de Cadastro
  if (modoAcesso === "cadastro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Conta</h1>
            <p className="text-gray-600">Cadastre-se e comece a usar o sistema</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCadastrar(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={novoCadastro.email}
                  onChange={(e) => setNovoCadastro({ ...novoCadastro, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="seuemail@exemplo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={novoCadastro.senha}
                  onChange={(e) => setNovoCadastro({ ...novoCadastro, senha: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite sua senha"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={novoCadastro.confirmarSenha}
                  onChange={(e) => setNovoCadastro({ ...novoCadastro, confirmarSenha: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Confirme sua senha"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Escolha a forma de pagamento
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setNovoCadastro({ ...novoCadastro, formaPagamento: "pix" })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    novoCadastro.formaPagamento === "pix"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold">PIX</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">PIX - R$ 59,90</p>
                        <p className="text-sm text-gray-600">60 dias de acesso</p>
                      </div>
                    </div>
                    {novoCadastro.formaPagamento === "pix" && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNovoCadastro({ ...novoCadastro, formaPagamento: "cartao" })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    novoCadastro.formaPagamento === "cartao"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-10 h-10 text-blue-600" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">Cartão - R$ 149,70</p>
                        <p className="text-sm text-gray-600">180 dias | Até 3x sem juros</p>
                      </div>
                    </div>
                    {novoCadastro.formaPagamento === "cartao" && (
                      <CheckCircle className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Criar Conta</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setModoAcesso("usuario");
                setNovoCadastro({ email: "", senha: "", confirmarSenha: "", formaPagamento: "pix" });
                setError("");
              }}
              className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Já tem uma conta? Fazer login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Login
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className={`${modoAcesso === "admin" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300`}>
            {modoAcesso === "admin" ? (
              <Shield className="w-8 h-8 text-white" />
            ) : (
              <LogIn className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PDV Sistema</h1>
          <p className="text-gray-600">
            {modoAcesso === "admin" ? "Acesso Administrativo" : "Acesso de Usuário"}
          </p>
        </div>

        <form onSubmit={handleAcessar} className="space-y-6">
          {modoAcesso === "usuario" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Digite seu email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Digite sua senha"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Administrador
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={senhaAdmin}
                  onChange={(e) => setSenhaAdmin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Digite a senha do administrador"
                  required
                  autoFocus
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Acesso restrito apenas para administradores do sistema.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${modoAcesso === "admin" ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Acessando...</span>
              </>
            ) : (
              <>
                {modoAcesso === "admin" ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                <span>Acessar</span>
              </>
            )}
          </button>
        </form>

        {/* Botão Criar Conta - Acima do botão Admin */}
        {modoAcesso === "usuario" && (
          <div className="mt-6">
            <button
              onClick={() => setModoAcesso("cadastro")}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Criar Nova Conta</span>
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
          <button
            onClick={() => {
              setModoAcesso(modoAcesso === "usuario" ? "admin" : "usuario");
              setNomeCompleto("");
              setSenha("");
              setSenhaAdmin("");
              setError("");
            }}
            className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            {modoAcesso === "admin" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Voltar para acesso de usuário</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Entrar como Administrador</span>
              </>
            )}
          </button>

          {/* Botão WhatsApp abaixo de "Entrar como Administrador" */}
          <button
            onClick={abrirWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Contato WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
