"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { CloudSync } from "@/lib/sync";
import { Empresa, ConfiguracaoNFCe } from "@/lib/types";
import {
  Building2,
  ArrowLeft,
  Save,
  FileText,
  Shield,
  DollarSign,
  Settings,
  CheckCircle,
  AlertCircle,
  Receipt,
  Calculator,
  TrendingUp,
  Package,
  History,
  ShoppingCart,
  Wifi,
  WifiOff,
  Cloud,
  HardDrive,
  AlertTriangle,
} from "lucide-react";

export default function EmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");
  const [online, setOnline] = useState(true);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date>(new Date());
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  const WHATSAPP_CONTATO = "5565981032239";

  // Dados da Empresa
  const [empresa, setEmpresa] = useState<Empresa>({
    id: "empresa-1",
    nome: "",
    cnpj: "",
    inscricaoEstadual: "",
    endereco: "",
    telefone: "",
    email: "",
  });

  // Configurações NFC-e
  const [configNFCe, setConfigNFCe] = useState<ConfiguracaoNFCe>({
    id: "config-1",
    empresaId: "empresa-1",
    ambiente: "homologacao",
    serieNFCe: "1",
    proximoNumero: 1,
    tokenCSC: "",
    idCSC: "",
    regimeTributario: "simples",
    aliquotaICMSPadrao: 0,
    aliquotaPISPadrao: 0,
    aliquotaCOFINSPadrao: 0,
    cfopPadrao: "5102",
    mensagemNota: "Obrigado pela preferência!",
  });

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      console.log("✅ Conexão restaurada");
      // Sincronizar quando voltar online
      if (supabaseConfigured) {
        CloudSync.syncAll();
      }
    };

    const handleOffline = () => {
      setOnline(false);
      console.log("⚠️ Modo offline ativado");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [supabaseConfigured]);

  // Salvamento automático quando dados mudam
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        salvarAutomaticamente();
      }, 2000); // Salva 2 segundos após última alteração

      return () => clearTimeout(timer);
    }
  }, [empresa, configNFCe, loading]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      await db.init();

      // Verificar se Supabase está configurado
      const isConfigured = CloudSync.isConfigured();
      setSupabaseConfigured(isConfigured);

      // Tentar carregar da nuvem primeiro
      if (isConfigured) {
        try {
          const empresaNuvem = await CloudSync.loadEmpresa();
          const configNuvem = await CloudSync.loadConfigNFCe();

          if (empresaNuvem) {
            setEmpresa(empresaNuvem);
            console.log("✅ Empresa carregada da nuvem");
          }

          if (configNuvem) {
            setConfigNFCe(configNuvem);
            console.log("✅ Configuração NFC-e carregada da nuvem");
          }

          if (empresaNuvem || configNuvem) {
            return; // Dados carregados da nuvem com sucesso
          }
        } catch (error) {
          console.error("⚠️ Erro ao carregar da nuvem, usando dados locais:", error);
        }
      }

      // Fallback: carregar dados locais
      const empresaSalva = localStorage.getItem("empresa");
      if (empresaSalva) {
        setEmpresa(JSON.parse(empresaSalva));
      }

      const configSalva = localStorage.getItem("configNFCe");
      if (configSalva) {
        setConfigNFCe(JSON.parse(configSalva));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const salvarAutomaticamente = async () => {
    try {
      // Salvar no localStorage (funciona offline)
      localStorage.setItem("empresa", JSON.stringify(empresa));
      localStorage.setItem("configNFCe", JSON.stringify(configNFCe));

      // Salvar backup com timestamp
      const backup = {
        empresa,
        configNFCe,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("empresa_backup", JSON.stringify(backup));

      // Se online E Supabase configurado, sincronizar com nuvem
      if (online && supabaseConfigured) {
        try {
          await CloudSync.syncEmpresa(empresa);
          await CloudSync.syncConfigNFCe(configNFCe);
          console.log("✅ Dados sincronizados na nuvem");
        } catch (syncError) {
          console.error("⚠️ Erro ao sincronizar com nuvem (dados salvos localmente):", syncError);
        }
      }

      setUltimoSalvamento(new Date());
      console.log("✅ Dados salvos automaticamente");
    } catch (err) {
      console.error("Erro ao salvar automaticamente:", err);
    }
  };

  const formatarCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const salvarDados = async () => {
    try {
      setSalvando(true);
      setErro("");

      // Salvar no localStorage
      localStorage.setItem("empresa", JSON.stringify(empresa));
      localStorage.setItem("configNFCe", JSON.stringify(configNFCe));

      // Salvar backup com timestamp
      const backup = {
        empresa,
        configNFCe,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("empresa_backup", JSON.stringify(backup));

      // Se online E Supabase configurado, sincronizar com nuvem
      if (online && supabaseConfigured) {
        try {
          await CloudSync.syncEmpresa(empresa);
          await CloudSync.syncConfigNFCe(configNFCe);
          console.log("✅ Dados sincronizados na nuvem");
        } catch (syncError) {
          console.error("⚠️ Erro ao sincronizar com nuvem (dados salvos localmente):", syncError);
        }
      }

      setUltimoSalvamento(new Date());
      setSucesso("Configurações salvas com sucesso!");
      setTimeout(() => setSucesso(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setErro("Erro ao salvar configurações");
      setTimeout(() => setErro(""), 3000);
    } finally {
      setSalvando(false);
    }
  };

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_CONTATO}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <Building2 className="w-8 h-8" />
                <span>Configurações da Empresa</span>
              </h1>
              <p className="text-purple-200">Dados fiscais e NFC-e (Opcional)</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Indicador Online/Offline */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                online ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"
              }`}>
                {online ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-xs font-semibold">
                  {online ? "Online" : "Offline"}
                </span>
              </div>

              {/* Indicador Supabase */}
              {!supabaseConfigured && (
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    Configure Supabase
                  </span>
                </div>
              )}

              {/* Botão WhatsApp ao lado esquerdo do Salvar */}
              <button
                onClick={abrirWhatsApp}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-lg font-semibold"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>WhatsApp</span>
              </button>

              <button
                onClick={salvarDados}
                disabled={salvando}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-semibold disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{salvando ? "Salvando..." : "Salvar"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Navegação */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push("/caixa")}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-md font-semibold"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Caixa</span>
            </button>

            <button
              onClick={() => router.push("/financeiro")}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md font-semibold"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Financeiro</span>
            </button>

            <button
              onClick={() => router.push("/estoque")}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-md font-semibold"
            >
              <Package className="w-5 h-5" />
              <span>Estoque</span>
            </button>

            <button
              onClick={() => router.push("/historico")}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md font-semibold"
            >
              <History className="w-5 h-5" />
              <span>Histórico</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alertas */}
        {sucesso && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{sucesso}</span>
          </div>
        )}

        {erro && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{erro}</span>
          </div>
        )}

        {/* Indicador de Sincronização em Nuvem */}
        <div className={`border rounded-lg px-6 py-4 flex items-start backdrop-blur-sm ${
          supabaseConfigured 
            ? "bg-green-500/20 border-green-500 text-green-100"
            : "bg-orange-500/20 border-orange-500 text-orange-100"
        }`}>
          <div className="flex items-center space-x-3 flex-1">
            {supabaseConfigured ? (
              online ? (
                <Cloud className="w-6 h-6 flex-shrink-0" />
              ) : (
                <HardDrive className="w-6 h-6 flex-shrink-0" />
              )
            ) : (
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            )}
            <div>
              {supabaseConfigured ? (
                <>
                  <p className="font-bold text-lg mb-1">💾 Sincronização em Nuvem Ativa</p>
                  <p className="text-sm">
                    Todas as suas alterações são salvas automaticamente na nuvem. Acesse seus dados de qualquer dispositivo!
                  </p>
                  <p className="text-xs mt-2 opacity-80">
                    Último salvamento: {ultimoSalvamento.toLocaleTimeString()} • {online ? "Sincronizado na nuvem" : "Salvo localmente (sincronizará quando online)"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-lg mb-1">⚠️ Configure o Supabase</p>
                  <p className="text-sm">
                    Para acessar seus dados de qualquer dispositivo, configure o Supabase nas configurações do projeto.
                  </p>
                  <p className="text-xs mt-2 opacity-80">
                    Dados salvos apenas localmente • Vá em Configurações → Integrações → Supabase
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Aviso de Campos Opcionais */}
        <div className="bg-blue-500/20 border border-blue-500 text-blue-100 px-6 py-4 rounded-lg flex items-start backdrop-blur-sm">
          <AlertCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-lg mb-2">📝 Configurações Opcionais</p>
            <p className="text-sm">
              Todos os campos abaixo são <strong>opcionais</strong>. Você pode começar a usar o sistema imediatamente e preencher essas informações quando desejar.
            </p>
            <p className="text-sm mt-2">
              ✅ O caixa funciona perfeitamente sem esses dados<br/>
              ✅ Configure apenas quando precisar emitir notas fiscais<br/>
              ✅ Preencha no seu próprio ritmo
            </p>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Building2 className="w-7 h-7 text-purple-300" />
            <h2 className="text-2xl font-bold text-white">Dados da Empresa (Opcional)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Razão Social
              </label>
              <input
                type="text"
                value={empresa.nome}
                onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nome da empresa (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={empresa.cnpj}
                onChange={(e) =>
                  setEmpresa({ ...empresa, cnpj: formatarCNPJ(e.target.value) })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="00.000.000/0000-00 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Inscrição Estadual
              </label>
              <input
                type="text"
                value={empresa.inscricaoEstadual}
                onChange={(e) =>
                  setEmpresa({ ...empresa, inscricaoEstadual: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="000.000.000.000 (opcional)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Endereço Completo
              </label>
              <input
                type="text"
                value={empresa.endereco}
                onChange={(e) =>
                  setEmpresa({ ...empresa, endereco: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Rua, número, bairro, cidade - UF (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={empresa.telefone}
                onChange={(e) =>
                  setEmpresa({
                    ...empresa,
                    telefone: formatarTelefone(e.target.value),
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="(00) 00000-0000 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={empresa.email}
                onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="contato@empresa.com (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Configurações NFC-e */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Receipt className="w-7 h-7 text-blue-300" />
            <h2 className="text-2xl font-bold text-white">
              Configurações NFC-e (Opcional)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Ambiente
              </label>
              <select
                value={configNFCe.ambiente}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    ambiente: e.target.value as "producao" | "homologacao",
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="homologacao" className="bg-slate-800">
                  Homologação (Testes)
                </option>
                <option value="producao" className="bg-slate-800">
                  Produção
                </option>
              </select>
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Série NFC-e
              </label>
              <input
                type="text"
                value={configNFCe.serieNFCe}
                onChange={(e) =>
                  setConfigNFCe({ ...configNFCe, serieNFCe: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Próximo Número
              </label>
              <input
                type="number"
                value={configNFCe.proximoNumero}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    proximoNumero: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                ID CSC (Token)
              </label>
              <input
                type="text"
                value={configNFCe.idCSC}
                onChange={(e) =>
                  setConfigNFCe({ ...configNFCe, idCSC: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000001 (opcional)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Token CSC
              </label>
              <input
                type="text"
                value={configNFCe.tokenCSC}
                onChange={(e) =>
                  setConfigNFCe({ ...configNFCe, tokenCSC: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Token fornecido pela SEFAZ (opcional)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Mensagem na Nota
              </label>
              <textarea
                value={configNFCe.mensagemNota}
                onChange={(e) =>
                  setConfigNFCe({ ...configNFCe, mensagemNota: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mensagem que aparecerá na nota fiscal (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Impostos */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Calculator className="w-7 h-7 text-green-300" />
            <h2 className="text-2xl font-bold text-white">
              Configurações de Impostos (Opcional)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Regime Tributário
              </label>
              <select
                value={configNFCe.regimeTributario}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    regimeTributario: e.target.value as
                      | "simples"
                      | "normal"
                      | "mei",
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="simples" className="bg-slate-800">
                  Simples Nacional
                </option>
                <option value="normal" className="bg-slate-800">
                  Lucro Real/Presumido
                </option>
                <option value="mei" className="bg-slate-800">
                  MEI
                </option>
              </select>
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                CFOP Padrão
              </label>
              <input
                type="text"
                value={configNFCe.cfopPadrao}
                onChange={(e) =>
                  setConfigNFCe({ ...configNFCe, cfopPadrao: e.target.value })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="5102 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Alíquota ICMS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={configNFCe.aliquotaICMSPadrao}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    aliquotaICMSPadrao: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Alíquota PIS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={configNFCe.aliquotaPISPadrao}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    aliquotaPISPadrao: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00 (opcional)"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Alíquota COFINS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={configNFCe.aliquotaCOFINSPadrao}
                onChange={(e) =>
                  setConfigNFCe({
                    ...configNFCe,
                    aliquotaCOFINSPadrao: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00 (opcional)"
              />
            </div>
          </div>

          {/* Informações sobre impostos */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-blue-300 mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold mb-2">
                  Informações sobre Impostos
                </p>
                <ul className="text-purple-200 text-sm space-y-1">
                  <li>
                    • <strong>Simples Nacional:</strong> Alíquota única conforme
                    faixa de faturamento
                  </li>
                  <li>
                    • <strong>Lucro Real/Presumido:</strong> ICMS, PIS e COFINS
                    separados
                  </li>
                  <li>
                    • <strong>MEI:</strong> Isento de impostos federais
                  </li>
                  <li>
                    • <strong>CFOP 5102:</strong> Venda de mercadoria dentro do
                    estado
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end">
          <button
            onClick={salvarDados}
            disabled={salvando}
            className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-bold text-lg disabled:opacity-50"
          >
            <Save className="w-6 h-6" />
            <span>{salvando ? "Salvando..." : "Salvar Configurações"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
