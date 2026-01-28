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

  useEffect(() => {
    const checkAuth = () => {
      const id = localStorage.getItem("operadorId");
      const nome = localStorage.getItem("operadorNome");
      const isAdmin = localStorage.getItem("isAdmin");

      if (!id || isAdmin === "true") {
        router.push("/");
        return false;
      }

      setOperadorId(id);
      setOperadorNome(nome || "Usuário");
      return true;
    };

    if (checkAuth()) {
      carregarDados();
    }
  }, [router]);

  useEffect(() => {
    if (operadorId) {
      calcularGanhos();
    }
  }, [filtroTempo, operadorId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const id = localStorage.getItem("operadorId");
      if (!id) return;

      // Carregar pagamentos
      const todosPagamentos = await db.getPagamentosByUsuario(id);
      todosPagamentos.sort((a, b) => 
        new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()
      );
      setPagamentos(todosPagamentos);

      // Carregar meta salva
      const metaSalva = localStorage.getItem(`meta_${id}`);
      if (metaSalva) {
        setMetaDiaria(parseFloat(metaSalva));
      }
      
      // Carregar cartão salvo
      const cartaoSalvoStorage = localStorage.getItem(`cartao_${id}`);
      if (cartaoSalvoStorage) {
        setCartaoSalvo(JSON.parse(cartaoSalvoStorage));
      }
      
      await calcularGanhos();
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const calcularGanhos = async () => {
    try {
      await db.init();
      
      // Buscar todas as vendas do operador
      const todasVendas = await db.getAllVendas();
      const vendasOperador = todasVendas.filter(v => v.operadorId === operadorId);
      
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

  // Filtrar mensalidades que estão a 5 dias ou menos do vencimento
  const getMensalidadesProximasVencimento = () => {
    const hoje = new Date();
    return pagamentos.filter((p) => {
      if (p.status !== "pendente") return false;
      const diasParaVencimento = differenceInDays(new Date(p.dataVencimento), hoje);
      return diasParaVencimento <= 5 && diasParaVencimento >= 0;
    });
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

  const mensalidadesProximas = getMensalidadesProximasVencimento();
  const pagamentosPendentes = pagamentos.filter((p) => p.status === "pendente");
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
        {/* Alerta de Mensalidades Próximas ao Vencimento */}
        {mensalidadesProximas.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 rounded-2xl shadow-2xl p-6 border border-white/20 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold mb-2">
                    ⚠️ Mensalidade Próxima ao Vencimento
                  </h3>
                  <p className="text-white/90 text-sm mb-4">
                    Você tem {mensalidadesProximas.length} mensalidade(s) vencendo nos próximos 5 dias. Realize o pagamento para manter seu acesso ativo.
                  </p>
                  
                  <div className="space-y-3">
                    {mensalidadesProximas.map((pagamento) => {
                      const diasRestantes = differenceInDays(new Date(pagamento.dataVencimento), new Date());
                      return (
                        <div
                          key={pagamento.id}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold text-lg">
                                {pagamento.mesReferencia}
                              </p>
                              <p className="text-white/80 text-sm">
                                Vence em {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"} - {format(new Date(pagamento.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-white font-bold text-xl mt-1">
                                R$ {pagamento.valor.toFixed(2)}
                              </p>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  abrirModalPagamento(pagamento);
                                  setFormaPagamento("pix");
                                }}
                                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-white/90 transition-all font-semibold shadow-lg flex items-center space-x-2"
                              >
                                <span>PIX</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  abrirModalPagamento(pagamento);
                                  setFormaPagamento("cartao");
                                }}
                                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-white/90 transition-all font-semibold shadow-lg flex items-center space-x-2"
                              >
                                <CreditCard className="w-5 h-5" />
                                <span>Cartão</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <button
              onClick={() => setShowModalMeta(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm"
            >
              <Target className="w-5 h-5" />
              <span>Definir Meta</span>
            </button>
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

        {/* Mensalidades - Lista */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <CreditCard className="w-7 h-7 mr-3" />
              Mensalidades Pendentes
            </h2>
          </div>

          <div className="p-8">
            {pagamentosPendentes.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-white/70 text-lg">Todas as mensalidades estão em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagamentosPendentes.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-500/20 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-purple-300" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {pagamento.mesReferencia}
                        </h3>
                        <p className="text-purple-200 text-sm">
                          Vencimento: {format(new Date(pagamento.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white font-bold text-xl">
                          R$ {pagamento.valor.toFixed(2)}
                        </p>
                        {getStatusBadge(pagamento.status)}
                      </div>
                      <button
                        onClick={() => abrirModalPagamento(pagamento)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos - Extrato */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Calendar className="w-7 h-7 mr-3" />
              Extrato de Pagamentos
            </h2>
          </div>

          <div className="p-8">
            {pagamentos.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-lg">Nenhum pagamento registrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagamentos.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        pagamento.status === "pago" 
                          ? "bg-green-500/20" 
                          : "bg-yellow-500/20"
                      }`}>
                        {pagamento.status === "pago" ? (
                          <CheckCircle className="w-5 h-5 text-green-300" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-300" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {pagamento.mesReferencia}
                        </h3>
                        <p className="text-purple-200 text-sm">
                          {pagamento.formaPagamento === "cartao" ? "Cartão de Crédito" : "PIX"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-white font-bold">
                          R$ {pagamento.valor.toFixed(2)}
                        </p>
                        {getStatusBadge(pagamento.status)}
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-purple-200 text-sm">
                          {pagamento.dataPagamento 
                            ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: ptBR })
                            : format(new Date(pagamento.dataVencimento), "dd/MM/yyyy", { locale: ptBR })
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
