"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Pagamento, Venda } from "@/lib/types";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  X,
  TrendingUp,
  Target,
  Filter,
  BarChart3,
  AlertCircle,
  Save,
} from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type FiltroTempo = "diario" | "semanal" | "mensal";

export default function FinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [operadorId, setOperadorId] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [dataProximoVencimento, setDataProximoVencimento] = useState<Date | null>(null);

  // Estados para análise de ganhos
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>("diario");
  const [ganhos, setGanhos] = useState(0);
  const [metaDiaria, setMetaDiaria] = useState(500);
  const [showModalMeta, setShowModalMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("");
  
  // Modal de pagamento
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix");
  
  // Estados para cartão de crédito
  const [salvarCartao, setSalvarCartao] = useState(false);
  const [dadosCartao, setDadosCartao] = useState({
    numero: "",
    nome: "",
    validade: "",
    cvv: "",
  });
  const [cartaoSalvo, setCartaoSalvo] = useState<any>(null);

  const [totalDiasDisponiveis, setTotalDiasDisponiveis] = useState(0);

  useEffect(() => {
    let cleanupFunctions: (() => void)[] = [];

    const checkAuth = async () => {
      try {
        // 🔒 CRÍTICO: LIMPAR admin_master_session ANTES DE QUALQUER VERIFICAÇÃO
        // Usuários comuns NUNCA devem ter essa flag
        const adminMaster = localStorage.getItem("admin_master_session");
        if (adminMaster === "true") {
          console.warn("⚠️ Flag admin_master_session detectada - REMOVENDO (sessão de admin contaminada)");
          localStorage.removeItem("admin_master_session");
        }

        // Buscar operador logado do Supabase (FONTE CONFIÁVEL)
        const { AuthSupabase } = await import("@/lib/auth-supabase");
        const operador = await AuthSupabase.getCurrentOperador();

        console.log("🔍 Verificando autenticação no financeiro...");
        console.log("👤 Operador encontrado:", operador?.nome, operador?.email);
        console.log("🔐 É admin?", operador?.isAdmin);

        // Se não encontrou operador, redirecionar para login
        if (!operador) {
          console.warn("⚠️ Nenhum operador encontrado - redirecionando para login");
          router.push("/");
          return false;
        }

        // 🔒 CRÍTICO: Se é admin, redirecionar para página admin
        if (operador.isAdmin === true) {
          console.log("🔒 Usuário é ADMIN - redirecionando para /admin");
          router.push("/admin");
          return false;
        }

        console.log("✅ Autenticação OK - usuário comum carregando financeiro");
        setOperadorId(operador.id);
        setOperadorNome(operador.nome);
        return true;
      } catch (error) {
        console.error("❌ Erro ao verificar autenticação:", error);
        router.push("/");
        return false;
      }
    };

    checkAuth().then(async (isAuth) => {
      if (isAuth) {
        const cleanup = await carregarDados();
        if (cleanup && typeof cleanup === 'function') {
          cleanupFunctions.push(cleanup);
        }
      }
    });

    // Retornar função de cleanup
    return () => {
      cleanupFunctions.forEach(fn => fn());
    };
  }, [router]);

  useEffect(() => {
    if (operadorId) {
      calcularGanhos();
    }
  }, [filtroTempo, operadorId]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Buscar operador do Supabase
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) return;

      // INICIALIZAÇÃO AUTOMÁTICA: Adicionar pagamentos iniciais para diego2@gmail.com
      if (operador.email === "diego2@gmail.com") {
        const pagamentosExistentes = await db.getPagamentosByUsuario(operador.id);

        // Se não tem nenhum pagamento, adicionar 2 pagamentos de 60 dias
        if (pagamentosExistentes.length === 0) {
          console.log("Inicializando pagamentos para diego2@gmail.com...");

          // Primeira compra
          const primeiroPagamento: Pagamento = {
            id: `pag_diego_1_${Date.now()}`,
            usuarioId: operador.id,
            mesReferencia: "Renovação 60 dias - PIX",
            valor: 59.90,
            dataVencimento: new Date(),
            dataPagamento: new Date(),
            status: "pago",
            formaPagamento: "pix",
            diasComprados: 60,
            tipoCompra: "renovacao-60",
          };

          await db.addPagamento(primeiroPagamento);

          // Segunda compra (1 segundo depois para garantir ordem)
          await new Promise(resolve => setTimeout(resolve, 1000));

          const segundoPagamento: Pagamento = {
            id: `pag_diego_2_${Date.now()}`,
            usuarioId: operador.id,
            mesReferencia: "Renovação 60 dias - PIX",
            valor: 59.90,
            dataVencimento: new Date(),
            dataPagamento: new Date(),
            status: "pago",
            formaPagamento: "pix",
            diasComprados: 60,
            tipoCompra: "renovacao-60",
          };

          await db.addPagamento(segundoPagamento);
          console.log("2 pagamentos iniciais adicionados com sucesso! Total: 120 dias");
        }
      }

      // 🔥 CARREGAR PAGAMENTOS DO SUPABASE + SOLICITAÇÕES DE RENOVAÇÃO
      const { supabase } = await import("@/lib/supabase");

      // Carregar histórico de pagamentos (pagos e pendentes)
      const { data: pagamentosSupabase, error: errorPagamentos } = await supabase
        .from("historico_pagamentos")
        .select("*")
        .eq("usuario_id", operador.id)
        .in("status", ["pago", "pendente"])
        .order("created_at", { ascending: false });

      if (errorPagamentos) {
        console.error("⚠️ Erro ao carregar histórico de pagamentos:", errorPagamentos);
      }

      // ✅ CARREGAR SOLICITAÇÕES DE RENOVAÇÃO (para mostrar no extrato)
      const { data: solicitacoesRenovacao, error: errorSolicitacoes } = await supabase
        .from("solicitacoes_renovacao")
        .select("*")
        .eq("operador_id", operador.id)
        .order("data_solicitacao", { ascending: false });

      if (errorSolicitacoes) {
        console.error("⚠️ Erro ao carregar solicitações de renovação:", errorSolicitacoes);
      }

      // Converter pagamentos do Supabase para o formato local
      const pagamentosSupabaseFormatados: Pagamento[] = (pagamentosSupabase || []).map((pag) => ({
        id: pag.id,
        usuarioId: pag.usuario_id,
        mesReferencia: pag.mes_referencia,
        valor: parseFloat(pag.valor.toString()),
        dataVencimento: pag.data_vencimento ? new Date(pag.data_vencimento) : new Date(),
        dataPagamento: pag.data_pagamento ? new Date(pag.data_pagamento) : null,
        status: pag.status as "pendente" | "pago" | "vencido" | "cancelado",
        formaPagamento: pag.forma_pagamento as "pix" | "cartao",
        diasComprados: pag.dias_comprados,
        tipoCompra: pag.tipo_compra,
        observacao_admin: pag.observacao_admin,
        aprovado_por: pag.aprovado_por,
        data_aprovacao: pag.data_aprovacao ? new Date(pag.data_aprovacao) : undefined,
      }));

      // ✅ CONVERTER SOLICITAÇÕES DE RENOVAÇÃO PARA FORMATO DE PAGAMENTO
      const solicitacoesFormatadas: Pagamento[] = (solicitacoesRenovacao || []).map((sol) => {
        // Converter status: "aprovado" → "pago", "recusado" → "cancelado"
        let statusConvertido: "pendente" | "pago" | "vencido" | "cancelado" = "pendente";
        if (sol.status === "aprovado") statusConvertido = "pago";
        else if (sol.status === "recusado") statusConvertido = "cancelado";
        else if (sol.status === "pendente") statusConvertido = "pendente";

        return {
          id: `sol_${sol.id}`,
          usuarioId: sol.operador_id,
          mesReferencia: `Solicitação de Renovação - ${sol.dias_solicitados} dias`,
          valor: sol.valor,
          dataVencimento: new Date(sol.data_solicitacao),
          dataPagamento: sol.data_resposta ? new Date(sol.data_resposta) : null,
          status: statusConvertido,
          formaPagamento: sol.forma_pagamento as "pix" | "cartao",
          diasComprados: sol.dias_solicitados,
          tipoCompra: "renovacao-solicitada",
          observacao_admin: sol.mensagem_admin,
        };
      });

      // Carregar pagamentos do IndexedDB
      const pagamentosIndexedDB = await db.getPagamentosByUsuario(operador.id);

      // Mesclar: usar Set para evitar duplicatas
      const idsSupabase = new Set(pagamentosSupabaseFormatados.map((p) => p.id));
      const pagamentosUnicos = pagamentosIndexedDB.filter((p) => !idsSupabase.has(p.id));

      // ✅ MESCLAR TUDO: Pagamentos do Supabase + IndexedDB + Solicitações de Renovação
      const todosPagamentos = [
        ...pagamentosSupabaseFormatados,
        ...pagamentosUnicos,
        ...solicitacoesFormatadas, // ✅ Incluir solicitações no extrato
      ];

      // ✅ ORDENAR: PENDENTES PRIMEIRO, depois por data (mais recente no topo)
      todosPagamentos.sort((a, b) => {
        // Pendentes sempre no topo
        if (a.status === "pendente" && b.status !== "pendente") return -1;
        if (a.status !== "pendente" && b.status === "pendente") return 1;
        // Dentro de cada categoria, ordenar por data
        const dataA = a.dataVencimento ? new Date(a.dataVencimento).getTime() : 0;
        const dataB = b.dataVencimento ? new Date(b.dataVencimento).getTime() : 0;
        return dataB - dataA;
      });

      setPagamentos(todosPagamentos);
      console.log(`📊 Total de pagamentos carregados: ${todosPagamentos.length}`);
      console.log(`   - ${pagamentosSupabaseFormatados.length} do histórico (Supabase)`);
      console.log(`   - ${pagamentosUnicos.length} do IndexedDB`);
      console.log(`   - ${solicitacoesFormatadas.length} solicitações de renovação`);
      console.log(`   - ${todosPagamentos.filter(p => p.status === "pendente").length} pendentes no topo`);

      // Carregar meta salva (localStorage como cache)
      const metaSalva = localStorage.getItem(`meta_${operador.id}`);
      if (metaSalva) {
        setMetaDiaria(parseFloat(metaSalva));
      }

      // Carregar cartão salvo (localStorage como cache)
      const cartaoSalvoStorage = localStorage.getItem(`cartao_${operador.id}`);
      if (cartaoSalvoStorage) {
        setCartaoSalvo(JSON.parse(cartaoSalvoStorage));
      }

      await calcularGanhos();
      await calcularTotalDiasDisponiveis();

      // Calcular dias restantes com base nos pagamentos
      const pagamentosPagos = todosPagamentos.filter(p => p.status === "pago");

      if (pagamentosPagos.length > 0) {
        // Somar todos os dias comprados
        const totalDiasComprados = pagamentosPagos.reduce((total, p) => {
          return total + (p.diasComprados || 0);
        }, 0);

        // Pegar a data do primeiro pagamento
        const datasPagamento = pagamentosPagos
          .map(p => {
            if (p.dataPagamento) return new Date(p.dataPagamento);
            if (p.dataVencimento) return new Date(p.dataVencimento);
            return new Date();
          })
          .filter(d => !isNaN(d.getTime()));
        const primeiroPagamento = new Date(Math.min(...datasPagamento.map(d => d.getTime())));

        // Calcular dias já usados desde o primeiro pagamento
        const hoje = new Date();
        const diasUsados = differenceInDays(hoje, primeiroPagamento);

        // Dias restantes = total comprado - dias já usados
        const diasRestantesCalculados = Math.max(0, totalDiasComprados - diasUsados);

        // Calcular data de vencimento
        const dataVencimento = new Date(primeiroPagamento);
        dataVencimento.setDate(dataVencimento.getDate() + totalDiasComprados);

        setDiasRestantes(diasRestantesCalculados);
        setDataProximoVencimento(dataVencimento);

        // Atualizar no Supabase
        try {
          const { supabase } = await import("@/lib/supabase");
          await supabase
            .from("operadores")
            .update({
              data_proximo_vencimento: dataVencimento.toISOString(),
              ativo: diasRestantesCalculados > 0,
              suspenso: diasRestantesCalculados <= 0,
            })
            .eq("email", operador!.email);
        } catch (error) {
          console.error("Erro ao atualizar Supabase:", error);
        }
      } else {
        // Sem pagamentos, carregar do Supabase
        try {
          const { supabase } = await import("@/lib/supabase");
          const { data: operadorDB } = await supabase
            .from("operadores")
            .select("data_proximo_vencimento")
            .eq("email", operador!.email)
            .single();

          if (operadorDB?.data_proximo_vencimento) {
            const vencimento = new Date(operadorDB!.data_proximo_vencimento);
            const hoje = new Date();
            const dias = differenceInDays(vencimento, hoje);
            setDiasRestantes(dias);
            setDataProximoVencimento(vencimento);
          }
        } catch (error) {
          console.error("Erro ao carregar dias restantes:", error);
        }
      }

      // ✅ CONFIGURAR REALTIME: Atualizar quando admin aprovar/recusar solicitações
      const channelSolicitacoes = supabase
        .channel("user_solicitacoes_renovacao")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "solicitacoes_renovacao",
            filter: `operador_id=eq.${operador.id}`,
          },
          (payload) => {
            console.log("🔄 Atualização em tempo real (solicitações):", payload);
            carregarDados();
          }
        )
        .subscribe();

      // ✅ CONFIGURAR REALTIME: Atualizar quando pagamentos mudarem
      const channelPagamentos = supabase
        .channel("user_historico_pagamentos")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "historico_pagamentos",
            filter: `usuario_id=eq.${operador.id}`,
          },
          (payload) => {
            console.log("🔄 Atualização em tempo real (pagamentos):", payload);
            carregarDados();
          }
        )
        .subscribe();

      // ✅ CONFIGURAR REALTIME: Atualizar ganhos quando vendas mudarem
      const channelVendas = supabase
        .channel("user_vendas_ganhos")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vendas",
            filter: `operador_id=eq.${operador.id}`,
          },
          (payload) => {
            console.log("🔄 Atualização em tempo real (vendas):", payload);
            console.log("💰 Recalculando ganhos automaticamente...");
            calcularGanhos(); // Recalcular ganhos quando houver nova venda
          }
        )
        .subscribe();

      // Retornar função de cleanup para remover listeners
      return () => {
        supabase.removeChannel(channelSolicitacoes);
        supabase.removeChannel(channelPagamentos);
        supabase.removeChannel(channelVendas);
      };

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalDiasDisponiveis = async () => {
    try {
      // Buscar todos os pagamentos pagos do usuário
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();
      if (!operador) return;

      const todosPagamentos = await db.getPagamentosByUsuario(operador.id);
      const pagamentosPagos = todosPagamentos.filter(p => p.status === "pago");

      // Somar todos os dias comprados
      const totalDias = pagamentosPagos.reduce((total, p) => {
        return total + (p.diasComprados || 0);
      }, 0);

      setTotalDiasDisponiveis(totalDias);
    } catch (error) {
      console.error("Erro ao calcular total de dias:", error);
    }
  };

  const calcularGanhos = async () => {
    try {
      await db.init();

      // SEMPRE buscar vendas do Supabase (dados atualizados)
      let vendasOperador: Venda[] = [];

      try {
        const { SupabaseSync } = await import("@/lib/supabase-sync");
        const vendasNuvem = await SupabaseSync.loadVendas(operadorId);
        vendasOperador = vendasNuvem;
        console.log("✅ Vendas carregadas do Supabase para análise de ganhos");
      } catch (error) {
        console.error("⚠️ Erro ao carregar vendas do Supabase, usando dados locais:", error);
        // Fallback: usar dados locais
        const todasVendas = await db.getAllVendas();
        vendasOperador = todasVendas.filter(v => v.operadorId === operadorId);
      }

      const agora = new Date();
      let inicio: Date;
      let fim: Date;

      switch (filtroTempo) {
        case "diario":
          inicio = startOfDay(agora);
          fim = endOfDay(agora);
          break;
        case "semanal":
          inicio = startOfWeek(agora, { locale: ptBR });
          fim = endOfWeek(agora, { locale: ptBR });
          break;
        case "mensal":
          inicio = startOfMonth(agora);
          fim = endOfMonth(agora);
          break;
      }

      // Filtrar vendas do período e calcular ganhos reais
      const vendasPeriodo = vendasOperador.filter(venda => {
        const dataVenda = new Date(venda.dataHora);
        return dataVenda >= inicio && dataVenda <= fim && venda.status !== "cancelada";
      });

      const totalGanhos = vendasPeriodo.reduce((acc, venda) => acc + venda.total, 0);
      setGanhos(totalGanhos);
      console.log(`📊 Ganhos calculados (${filtroTempo}): R$ ${totalGanhos.toFixed(2)}`);
    } catch (err) {
      console.error("Erro ao calcular ganhos:", err);
      setGanhos(0);
    }
  };

  const salvarMeta = () => {
    const valor = parseFloat(novaMeta);
    if (isNaN(valor) || valor <= 0) {
      alert("Digite um valor válido para a meta!");
      return;
    }
    
    setMetaDiaria(valor);
    localStorage.setItem(`meta_${operadorId}`, valor.toString());
    setShowModalMeta(false);
    setNovaMeta("");
  };

  const abrirModalPagamento = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setFormaPagamento(pagamento.formaPagamento);
    setShowModalPagamento(true);
    
    // Resetar dados do cartão
    setDadosCartao({
      numero: "",
      nome: "",
      validade: "",
      cvv: "",
    });
    setSalvarCartao(false);
  };

  const formatarNumeroCartao = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    const grupos = numeros.match(/.{1,4}/g);
    return grupos ? grupos.join(" ") : numeros;
  };

  const formatarValidade = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length >= 2) {
      return numeros.slice(0, 2) + "/" + numeros.slice(2, 4);
    }
    return numeros;
  };

  const pagarComCartaoSalvo = async () => {
    if (!pagamentoSelecionado || !cartaoSalvo) return;

    try {
      const pagamentoAtualizado: Pagamento = {
        ...pagamentoSelecionado,
        status: "pago",
        dataPagamento: new Date(),
        formaPagamento: "cartao",
      };

      await db.updatePagamento(pagamentoAtualizado);
      
      alert("Pagamento realizado com sucesso usando o cartão salvo!");
      setShowModalPagamento(false);
      setPagamentoSelecionado(null);
      carregarDados();
    } catch (err) {
      console.error("Erro ao processar pagamento:", err);
      alert("Erro ao processar pagamento!");
    }
  };

  const confirmarPagamento = async () => {
    if (!pagamentoSelecionado) return;

    // Validar dados do cartão se for pagamento com cartão
    if (formaPagamento === "cartao" && !cartaoSalvo) {
      if (!dadosCartao.numero || !dadosCartao.nome || !dadosCartao.validade || !dadosCartao.cvv) {
        alert("Preencha todos os dados do cartão!");
        return;
      }

      if (dadosCartao.numero.replace(/\D/g, "").length !== 16) {
        alert("Número do cartão inválido!");
        return;
      }

      if (dadosCartao.cvv.length !== 3) {
        alert("CVV inválido!");
        return;
      }
    }

    try {
      const pagamentoAtualizado: Pagamento = {
        ...pagamentoSelecionado,
        status: "pago",
        dataPagamento: new Date(),
        formaPagamento,
      };

      await db.updatePagamento(pagamentoAtualizado);

      // Salvar cartão se opção marcada
      if (formaPagamento === "cartao" && salvarCartao && !cartaoSalvo) {
        const cartaoParaSalvar = {
          numero: dadosCartao.numero.slice(-4), // Salvar apenas últimos 4 dígitos
          nome: dadosCartao.nome,
          validade: dadosCartao.validade,
        };
        localStorage.setItem(`cartao_${operadorId}`, JSON.stringify(cartaoParaSalvar));
        setCartaoSalvo(cartaoParaSalvar);
      }

      alert("Pagamento confirmado com sucesso!");
      setShowModalPagamento(false);
      setPagamentoSelecionado(null);
      carregarDados();
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      alert("Erro ao confirmar pagamento!");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold border border-green-500/30 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Pago</span>
          </span>
        );
      case "pendente":
        return (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-semibold border border-yellow-500/30 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pendente</span>
          </span>
        );
      case "cancelado":
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold border border-red-500/30 flex items-center space-x-1">
            <X className="w-3 h-3" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getFiltroLabel = () => {
    switch (filtroTempo) {
      case "diario":
        return "Hoje";
      case "semanal":
        return "Esta Semana";
      case "mensal":
        return "Este Mês";
    }
  };

  const getMetaAtual = () => {
    switch (filtroTempo) {
      case "diario":
        return metaDiaria;
      case "semanal":
        return metaDiaria * 7;
      case "mensal":
        return metaDiaria * 30;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando financeiro...</p>
        </div>
      </div>
    );
  }

  const metaAtual = getMetaAtual();
  const progressoMeta = (ganhos / metaAtual) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/caixa")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <DollarSign className="w-8 h-8" />
                <span>Financeiro</span>
              </h1>
              <p className="text-purple-200">{operadorNome}</p>
            </div>

            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Financeiro - Análise de Ganhos */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-2xl font-bold">Análise de Ganhos</h2>
                <p className="text-green-100 text-sm">Acompanhe seu desempenho em tempo real</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => calcularGanhos()}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm"
                title="Atualizar ganhos"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => setShowModalMeta(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm"
              >
                <Target className="w-5 h-5" />
                <span>Definir Meta</span>
              </button>
            </div>
          </div>

          {/* Filtros de Tempo */}
          <div className="flex items-center space-x-3 mb-6">
            <Filter className="w-5 h-5 text-white" />
            <div className="flex space-x-2">
              <button
                onClick={() => setFiltroTempo("diario")}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  filtroTempo === "diario"
                    ? "bg-white text-green-600 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setFiltroTempo("semanal")}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  filtroTempo === "semanal"
                    ? "bg-white text-green-600 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setFiltroTempo("mensal")}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  filtroTempo === "mensal"
                    ? "bg-white text-green-600 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                Mensal
              </button>
            </div>
          </div>

          {/* Cards de Ganhos e Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-semibold">Período</p>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-white text-2xl font-bold">{getFiltroLabel()}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-semibold">Ganhos</p>
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <p className="text-white text-3xl font-bold">
                R$ {ganhos.toFixed(2)}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-semibold">Meta</p>
                <Target className="w-5 h-5 text-white" />
              </div>
              <p className="text-white text-3xl font-bold">
                R$ {metaAtual.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-lg">Progresso da Meta</p>
              <p className="text-white font-bold text-xl">{progressoMeta.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500 shadow-lg flex items-center justify-end pr-3"
                style={{ width: `${Math.min(progressoMeta, 100)}%` }}
              >
                {progressoMeta >= 10 && (
                  <span className="text-green-600 font-bold text-sm">
                    {progressoMeta.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            {progressoMeta >= 100 && (
              <div className="mt-3 bg-white/20 rounded-lg p-3 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-white" />
                <p className="text-white font-semibold">🎉 Parabéns! Meta atingida!</p>
              </div>
            )}
            {progressoMeta < 100 && (
              <p className="text-green-100 text-sm mt-3">
                Faltam R$ {(metaAtual - ganhos).toFixed(2)} para atingir sua meta
              </p>
            )}
          </div>

          {/* Detalhes do Período */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-green-100 text-xs mb-1">Média por Dia</p>
              <p className="text-white text-xl font-bold">
                R$ {filtroTempo === "diario" ? ganhos.toFixed(2) : (ganhos / (filtroTempo === "semanal" ? 7 : 30)).toFixed(2)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-green-100 text-xs mb-1">Dias Trabalhados</p>
              <p className="text-white text-xl font-bold">
                {filtroTempo === "diario" ? "1" : filtroTempo === "semanal" ? "7" : "30"}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-green-100 text-xs mb-1">Projeção Mensal</p>
              <p className="text-white text-xl font-bold">
                R$ {filtroTempo === "diario" ? (ganhos * 30).toFixed(2) : filtroTempo === "semanal" ? (ganhos * 4.3).toFixed(2) : ganhos.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Informação sobre integração */}
          <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              ✅ <strong>Integrado automaticamente:</strong> Os ganhos são calculados em tempo real com base nas vendas realizadas no caixa, incluindo devoluções e cancelamentos.
            </p>
          </div>
        </div>

        {/* Banner de Solicitações Pendentes */}
        {pagamentos.filter((p) => p.status === "pendente").length > 0 && (
          <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-500 rounded-2xl shadow-2xl p-6 border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full animate-pulse">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-white text-2xl font-bold">Pagamentos Pendentes</h3>
                  <p className="text-yellow-100 text-sm">
                    Você tem {pagamentos.filter((p) => p.status === "pendente").length} solicitação(ões) aguardando aprovação do administrador
                  </p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
                <p className="text-white text-3xl font-bold">
                  {pagamentos.filter((p) => p.status === "pendente").length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de Pagamentos - Extrato */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Calendar className="w-7 h-7 mr-3" />
                Extrato de Pagamentos
              </h2>
              <div className="text-right">
                <p className="text-white/80 text-sm">Total de Dias Comprados</p>
                <p className="text-white text-3xl font-bold">{totalDiasDisponiveis}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {pagamentos.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-lg">Nenhum pagamento registrado</p>
              </div>
            ) : (
              <>
                {/* Resumo Financeiro */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-green-200 text-sm mb-1">Total Investido</p>
                      <p className="text-white text-2xl font-bold">
                        R$ {pagamentos.filter(p => p.status === "pago").reduce((sum, p) => sum + p.valor, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-200 text-sm mb-1">Total de Dias Adquiridos</p>
                      <p className="text-white text-2xl font-bold">
                        {totalDiasDisponiveis} dias
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-200 text-sm mb-1">Compras Realizadas</p>
                      <p className="text-white text-2xl font-bold">
                        {pagamentos.filter(p => p.status === "pago").length}
                      </p>
                      {pagamentos.filter(p => p.status === "pendente").length > 0 && (
                        <p className="text-yellow-300 text-xs mt-1">
                          {pagamentos.filter(p => p.status === "pendente").length} pendente(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Pagamentos - Com scroll limitado */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-white/10">
                  {pagamentos.map((pagamento) => (
                    <div
                      key={pagamento.id}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`p-3 rounded-lg ${
                            pagamento.status === "pago"
                              ? "bg-green-500/20"
                              : "bg-yellow-500/20"
                          }`}>
                            {pagamento.status === "pago" ? (
                              <CheckCircle className="w-6 h-6 text-green-300" />
                            ) : (
                              <Clock className="w-6 h-6 text-yellow-300" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-white font-bold text-lg">
                                {pagamento.mesReferencia}
                              </h3>
                              {getStatusBadge(pagamento.status)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div>
                                <p className="text-purple-200 text-xs mb-1">Valor</p>
                                <p className="text-white font-bold text-lg">
                                  R$ {pagamento.valor.toFixed(2)}
                                </p>
                              </div>

                              {pagamento.diasComprados && (
                                <div>
                                  <p className="text-purple-200 text-xs mb-1">Dias Comprados</p>
                                  <p className="text-cyan-300 font-bold text-lg">
                                    {pagamento.diasComprados} dias
                                  </p>
                                </div>
                              )}

                              <div>
                                <p className="text-purple-200 text-xs mb-1">Forma de Pagamento</p>
                                <p className="text-white text-sm font-semibold">
                                  {pagamento.formaPagamento === "cartao" ? "Cartão" : "PIX"}
                                </p>
                              </div>

                              <div>
                                <p className="text-purple-200 text-xs mb-1">Data</p>
                                <p className="text-white text-sm font-semibold">
                                  {pagamento.dataPagamento
                                    ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: ptBR })
                                    : pagamento.dataVencimento
                                      ? format(new Date(pagamento.dataVencimento), "dd/MM/yyyy", { locale: ptBR })
                                      : "N/A"
                                  }
                                </p>
                              </div>
                            </div>

                            {pagamento.tipoCompra && (
                              <div className="mt-3">
                                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/30">
                                  {pagamento.tipoCompra === "renovacao-60" && "Renovação 60 dias"}
                                  {pagamento.tipoCompra === "renovacao-100" && "Renovação 100 dias"}
                                  {pagamento.tipoCompra === "renovacao-180" && "Renovação Semestral"}
                                  {pagamento.tipoCompra === "renovacao-365" && "Renovação Anual"}
                                  {pagamento.tipoCompra === "renovacao-solicitada" && "Solicitação de Renovação"}
                                  {pagamento.tipoCompra === "personalizado" && "Compra Personalizada"}
                                </span>
                              </div>
                            )}

                            {/* Aviso de pagamento pendente */}
                            {pagamento.status === "pendente" && (
                              <div className="mt-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-300 text-sm font-semibold flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Aguardando aprovação do administrador</span>
                                </p>
                                <p className="text-yellow-200 text-xs mt-1">
                                  Os dias serão creditados automaticamente após a confirmação do pagamento
                                </p>
                              </div>
                            )}

                            {/* Observação do admin (se houver) */}
                            {pagamento.observacao_admin && (
                              <div className="mt-3 bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                                <p className="text-purple-200 text-xs mb-1">Observação do Admin:</p>
                                <p className="text-white text-sm">{pagamento.observacao_admin}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Seção de Renovação de Assinatura */}
        {diasRestantes >= 0 && (
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Renovar Assinatura</h2>

              {/* Exibir dias atuais */}
              <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/30 mb-4">
                <p className="text-white/80 text-sm mb-1">Dias Atuais</p>
                <p className="text-4xl font-bold text-white">{diasRestantes}</p>
                <p className="text-white/70 text-xs mt-1">{diasRestantes === 1 ? "dia disponível" : "dias disponíveis"}</p>
              </div>

              {dataProximoVencimento && (
                <p className="text-white/90 text-lg">
                  Você tem <span className="font-bold text-yellow-300">{diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</span> restantes
                  <br />
                  Vencimento: <span className="font-bold">{format(new Date(dataProximoVencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                </p>
              )}
            </div>

            {/* Aviso Importante */}
            <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-100 font-bold text-sm mb-1">IMPORTANTE</p>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Faça apenas <span className="font-bold">UM PAGAMENTO</span> e volte para Financeiro. Atualize a página - a ordem estará <span className="font-bold text-yellow-300">PENDENTE</span>. Aguarde a liberação do administrador.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Plano PIX - 60 dias */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border-2 border-white/30 hover:border-green-400 transition-all">
                <div className="text-center mb-4">
                  <div className="inline-block bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg mb-3">
                    PIX
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">R$ 59,90</h3>
                  <p className="text-white/80">60 dias de acesso</p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Acesso completo ao sistema</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Sincronização na nuvem</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Suporte técnico</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Pagamento instantâneo</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      // Buscar operador atual
                      console.log("🔄 Buscando operador atual...");
                      const { AuthSupabase } = await import("@/lib/auth-supabase");
                      const operador = await AuthSupabase.getCurrentOperador();

                      if (!operador) {
                        alert("Erro: usuário não encontrado. Por favor, faça login novamente.");
                        return;
                      }

                      console.log("✅ Operador encontrado:", operador.id, operador.nome);
                      console.log("🔄 Criando preferência de pagamento...");

                      // Criar preferência de pagamento usando a API
                      const response = await fetch("/api/create-payment-preference", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          usuario_id: operador.id,
                          forma_pagamento: "pix",
                        }),
                      });

                      console.log("📡 Resposta recebida:", response.status, response.statusText);
                      console.log("📋 Headers:", Object.fromEntries(response.headers.entries()));

                      // Verificar se a resposta é JSON válido
                      let data: any = {};
                      const responseText = await response.text();

                      console.log("📄 Tamanho da resposta:", responseText.length, "bytes");
                      console.log("📄 Resposta completa:", responseText);

                      if (!responseText || responseText.trim() === '') {
                        alert("❌ Servidor retornou resposta vazia.\n\nStatus HTTP: " + response.status + "\n\nO servidor pode não estar processando a requisição corretamente.\n\nAbra o Console (F12) para mais detalhes.");
                        return;
                      }

                      try {
                        data = JSON.parse(responseText);
                        console.log("📦 JSON parseado com sucesso:", data);
                      } catch (parseError: any) {
                        console.error("❌ Erro ao parsear JSON:", parseError);
                        console.error("📄 Texto que falhou ao parsear:", responseText);
                        alert("❌ Erro: Resposta do servidor não é JSON válido.\n\nO servidor retornou: " + responseText.substring(0, 200) + "\n\nAbra o Console (F12) para ver a resposta completa.");
                        return;
                      }

                      if (!response.ok || !data.success) {
                        const errorMessage = data.error || "Erro ao gerar link de pagamento";
                        const errorDetails = data.details ? `\n\nDetalhes técnicos: ${data.details}` : "";
                        alert(`❌ ${errorMessage}${errorDetails}\n\nStatus HTTP: ${response.status}\n\nTente novamente ou contate o suporte.`);
                        console.error("❌ Erro na API:", data);
                        return;
                      }

                      console.log("✅ Link gerado com sucesso:", data.init_point);

                      // Atualizar lista para mostrar solicitação pendente
                      await carregarDados();

                      // Abrir link de pagamento
                      window.open(data.init_point, "_blank");

                      alert(`✅ Link de pagamento gerado!\n\n⏳ Sua solicitação foi criada e aparecerá como PENDENTE no seu extrato.\n\n💳 Após efetuar o pagamento, aguarde a aprovação do administrador para que os dias sejam creditados.`);
                    } catch (error: any) {
                      console.error("❌ Erro ao criar pagamento:", error);
                      alert(`❌ Erro ao gerar link de pagamento.\n\n${error.message || "Erro desconhecido"}\n\nTente novamente ou contate o suporte.`);
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>Renovar com PIX</span>
                  <CheckCircle className="w-5 h-5" />
                </button>

                {diasRestantes > 0 && (
                  <p className="text-xs text-white/70 text-center mt-3">
                    Novo vencimento: {format(new Date(Date.now() + (diasRestantes + 60) * 24 * 60 * 60 * 1000), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              {/* Plano Cartão - 180 dias */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border-2 border-yellow-400 hover:border-yellow-300 transition-all relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full font-bold text-sm">
                  MAIS VANTAJOSO
                </div>

                <div className="text-center mb-4">
                  <div className="inline-block bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-lg mb-3">
                    CARTÃO
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">R$ 149,70</h3>
                  <p className="text-white/80">180 dias de acesso</p>
                  <p className="text-yellow-300 font-semibold text-sm mt-1">Parcele em até 3x sem juros</p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold">Tudo do plano PIX +</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">180 dias completos de acesso</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">120 dias a mais que PIX</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white/90">
                    <CheckCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">Parcelamento facilitado</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    // Buscar operador atual
                    const { AuthSupabase } = await import("@/lib/auth-supabase");
                    const operador = await AuthSupabase.getCurrentOperador();

                    if (!operador) {
                      alert("Erro: usuário não encontrado");
                      return;
                    }

                    // Criar preferência de pagamento usando a API
                    try {
                      const response = await fetch("/api/create-payment-preference", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          usuario_id: operador.id,
                          forma_pagamento: "cartao",
                        }),
                      });

                      const data = await response.json();

                      if (!response.ok || !data.success) {
                        alert("Erro ao gerar link de pagamento. Tente novamente.");
                        console.error("Erro na API:", data);
                        return;
                      }

                      // Atualizar lista para mostrar solicitação pendente
                      await carregarDados();

                      // Abrir link de pagamento
                      window.open(data.init_point, "_blank");

                      alert(`✅ Link de pagamento gerado!\n\n⏳ Sua solicitação foi criada e aparecerá como PENDENTE no seu extrato.\n\n💳 Após efetuar o pagamento, aguarde a aprovação do administrador para que os dias sejam creditados.`);
                    } catch (error) {
                      console.error("Erro ao criar pagamento:", error);
                      alert("Erro ao gerar link de pagamento. Tente novamente.");
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Renovar com Cartão</span>
                </button>

                {diasRestantes > 0 && (
                  <p className="text-xs text-white/70 text-center mt-3">
                    Novo vencimento: {format(new Date(Date.now() + (diasRestantes + 180) * 24 * 60 * 60 * 1000), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <div className="text-white/90 text-sm">
                  <p className="font-semibold mb-1">Como funciona a renovação:</p>
                  <p>✅ Os dias restantes da sua assinatura atual serão somados aos novos dias</p>
                  <p>✅ Sua conta é ativada automaticamente após a confirmação do pagamento</p>
                  <p>✅ Se o pagamento não for confirmado até o vencimento, sua conta será suspensa</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão WhatsApp - Suporte */}
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-2xl font-bold mb-2">Precisa de Ajuda?</h3>
              <p className="text-green-100 text-lg">
                Entre em contato com nosso suporte via WhatsApp para dúvidas sobre renovação ou pagamentos
              </p>
            </div>
            <button
              onClick={() => window.open("https://wa.me/5565981032239", "_blank")}
              className="bg-white hover:bg-green-50 text-green-600 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center space-x-3"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>Falar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Meta */}
      {showModalMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Definir Meta Diária</h3>
              <button
                onClick={() => setShowModalMeta(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Valor da Meta Diária (R$)
                </label>
                <input
                  type="number"
                  value={novaMeta}
                  onChange={(e) => setNovaMeta(e.target.value)}
                  placeholder="Ex: 500.00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-purple-200 text-xs mt-2">
                  A meta semanal será R$ {(parseFloat(novaMeta || "0") * 7).toFixed(2)} e mensal R$ {(parseFloat(novaMeta || "0") * 30).toFixed(2)}
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModalMeta(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarMeta}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                >
                  Salvar Meta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showModalPagamento && pagamentoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 my-8">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Realizar Pagamento</h3>
              <button
                onClick={() => setShowModalPagamento(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-purple-200 text-sm mb-1">Mensalidade</p>
                <p className="text-white font-bold text-lg">{pagamentoSelecionado.mesReferencia}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-purple-200 text-sm mb-1">Valor</p>
                <p className="text-white font-bold text-2xl">
                  R$ {pagamentoSelecionado.valor.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-3">
                  Forma de Pagamento
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setFormaPagamento("pix")}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      formaPagamento === "pix"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-xs">PIX</span>
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold">PIX</p>
                          <p className="text-purple-200 text-sm">Pagamento instantâneo</p>
                        </div>
                      </div>
                      {formaPagamento === "pix" && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setFormaPagamento("cartao")}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      formaPagamento === "cartao"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <p className="text-white font-semibold">Cartão de Crédito</p>
                          <p className="text-purple-200 text-sm">Débito ou crédito</p>
                        </div>
                      </div>
                      {formaPagamento === "cartao" && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Opção de Pagar com Cartão Salvo */}
              {formaPagamento === "cartao" && cartaoSalvo && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-blue-300" />
                      <p className="text-white font-semibold">Cartão Salvo</p>
                    </div>
                    <Save className="w-5 h-5 text-blue-300" />
                  </div>
                  <p className="text-blue-200 text-sm mb-2">
                    •••• •••• •••• {cartaoSalvo.numero}
                  </p>
                  <p className="text-blue-200 text-sm mb-3">
                    {cartaoSalvo.nome} - Validade: {cartaoSalvo.validade}
                  </p>
                  <button
                    onClick={pagarComCartaoSalvo}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                  >
                    Pagar com Cartão Salvo
                  </button>
                  <button
                    onClick={() => setCartaoSalvo(null)}
                    className="w-full mt-2 px-4 py-2 text-blue-300 hover:text-white text-sm transition-colors"
                  >
                    Usar outro cartão
                  </button>
                </div>
              )}

              {/* Formulário de Dados do Cartão */}
              {formaPagamento === "cartao" && !cartaoSalvo && (
                <div className="space-y-4 bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-semibold flex items-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Dados do Cartão</span>
                  </h4>
                  
                  <div>
                    <label className="block text-purple-200 text-sm mb-2">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      value={dadosCartao.numero}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, "");
                        if (valor.length <= 16) {
                          setDadosCartao({
                            ...dadosCartao,
                            numero: formatarNumeroCartao(valor),
                          });
                        }
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm mb-2">
                      Nome no Cartão
                    </label>
                    <input
                      type="text"
                      value={dadosCartao.nome}
                      onChange={(e) =>
                        setDadosCartao({
                          ...dadosCartao,
                          nome: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="NOME COMPLETO"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-purple-200 text-sm mb-2">
                        Validade
                      </label>
                      <input
                        type="text"
                        value={dadosCartao.validade}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, "");
                          if (valor.length <= 4) {
                            setDadosCartao({
                              ...dadosCartao,
                              validade: formatarValidade(valor),
                            });
                          }
                        }}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-purple-200 text-sm mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={dadosCartao.cvv}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/\D/g, "");
                          if (valor.length <= 3) {
                            setDadosCartao({
                              ...dadosCartao,
                              cvv: valor,
                            });
                          }
                        }}
                        placeholder="000"
                        maxLength={3}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="salvarCartao"
                      checked={salvarCartao}
                      onChange={(e) => setSalvarCartao(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-green-500 focus:ring-2 focus:ring-green-500"
                    />
                    <label htmlFor="salvarCartao" className="text-purple-200 text-sm cursor-pointer">
                      Salvar cartão para renovação automática após 3 meses
                    </label>
                  </div>
                </div>
              )}

              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-200 text-sm">
                  <strong>Atenção:</strong> Após confirmar o pagamento, aguarde a validação do administrador.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModalPagamento(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPagamento}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
