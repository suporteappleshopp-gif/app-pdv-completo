"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Venda, ItemVenda } from "@/lib/types";
import {
  ArrowLeft,
  History,
  Search,
  Printer,
  RotateCcw,
  Calendar,
  DollarSign,
  ShoppingCart,
  User,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeftRight,
  RefreshCw,
  FileText,
  Receipt,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  imprimirCupomFiscal,
  imprimirNFCe,
  imprimirNotaFiscalCompleta,
} from "@/lib/impressao";

// Tipos para troca/extorno
interface ItemTrocaExtorno {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  codigoBarras?: string;
}

// Motivos fiscais conforme SEFAZ
const MOTIVOS_DEVOLUCAO_SEFAZ = [
  { codigo: "01", descricao: "Mercadoria com defeito" },
  { codigo: "02", descricao: "Mercadoria errada (erro na emissão)" },
  { codigo: "03", descricao: "Mercadoria em desacordo com o pedido" },
  { codigo: "04", descricao: "Não recebimento da mercadoria" },
  { codigo: "05", descricao: "Devolvida pelo destinatário" },
  { codigo: "06", descricao: "Arrependimento do consumidor (CDC art. 49)" },
  { codigo: "07", descricao: "Produto vencido ou deteriorado" },
  { codigo: "08", descricao: "Troca por produto diferente" },
  { codigo: "09", descricao: "Erro de preço ou cobrança" },
  { codigo: "99", descricao: "Outros motivos" },
];

export default function HistoricoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [busca, setBusca] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Modal de Troca/Extorno
  const [showModalTrocaExtorno, setShowModalTrocaExtorno] = useState(false);
  const [tipoOperacao, setTipoOperacao] = useState<"troca" | "extorno">("extorno");
  const [vendaTrocaExtorno, setVendaTrocaExtorno] = useState<Venda | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<Array<{item: ItemVenda; quantidade: number; selecionado: boolean}>>([]);
  const [motivoFiscal, setMotivoFiscal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [notaReferenciada, setNotaReferenciada] = useState("");
  const [formaPagamentoDevolucao, setFormaPagamentoDevolucao] = useState<"dinheiro" | "credito" | "debito" | "pix" | "troca">("dinheiro");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let channel: any = null;
    let channelItens: any = null;

    const init = async () => {
      await carregarVendas();

      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (operador && !operador.isAdmin) {
        const { supabase } = await import("@/lib/supabase");

        const channelId = `vendas_historico_${operador.id}_${Date.now()}`;
        channel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'vendas',
              filter: `operador_id=eq.${operador.id}`,
            },
            () => { carregarVendas(true); }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log('✅ Realtime CONECTADO para histórico');
          });

        const channelItensId = `itens_historico_${operador.id}_${Date.now()}`;
        channelItens = supabase
          .channel(channelItensId)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'itens_venda' },
            () => { carregarVendas(true); }
          )
          .subscribe();
      }
    };

    init();

    return () => {
      if (channel) channel.unsubscribe();
      if (channelItens) channelItens.unsubscribe();
    };
  }, []);

  const carregarVendas = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);

      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        router.push("/");
        return;
      }

      if (operador.isAdmin) {
        router.push("/admin");
        return;
      }

      const { supabase } = await import("@/lib/supabase");

      const { data: vendasData, error: errorVendas } = await supabase
        .from("vendas")
        .select("*")
        .eq("operador_id", operador.id)
        .order("created_at", { ascending: false });

      if (errorVendas) {
        console.error("❌ Erro ao carregar vendas:", errorVendas);
        setErro("Erro ao carregar vendas do banco de dados");
        setTimeout(() => setErro(""), 3000);
        return;
      }

      if (!vendasData || vendasData.length === 0) {
        setVendas([]);
        return;
      }

      const vendasComItens = await Promise.all(
        vendasData.map(async (v) => {
          const { data: itens } = await supabase
            .from("itens_venda")
            .select("*")
            .eq("venda_id", v.id);

          return {
            id: v.id,
            numero: v.numero || 0,
            operadorId: v.operador_id,
            operadorNome: v.operador_nome,
            itens: (itens || []).map((item) => ({
              produtoId: item.produto_id,
              nome: item.nome,
              codigoBarras: item.codigo_barras || "",
              quantidade: item.quantidade,
              precoUnitario: parseFloat(item.preco_unitario.toString()),
              subtotal: parseFloat(item.subtotal.toString()),
            })),
            total: parseFloat(v.total.toString()),
            dataHora: new Date(v.created_at),
            status: v.status as "concluida" | "cancelada",
            tipoPagamento: v.forma_pagamento || v.tipo_pagamento,
            motivoCancelamento: v.motivo_cancelamento,
            devolucoes: v.devolucoes || [],
            exclusoes: v.exclusoes || [],
            clienteCpf: v.cliente_cpf || undefined,
            clienteNome: v.cliente_nome || undefined,
          } as Venda;
        })
      );

      setVendas(vendasComItens);
    } catch (err) {
      console.error("❌ Erro ao carregar vendas:", err);
      setErro("Erro ao carregar histórico de vendas");
      setTimeout(() => setErro(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const imprimirNota = (venda: Venda) => {
    imprimirNotaFiscalCompleta(venda);
  };

  // Abrir modal de troca/extorno
  const abrirModalTrocaExtorno = (venda: Venda, tipo: "troca" | "extorno") => {
    setVendaTrocaExtorno(venda);
    setTipoOperacao(tipo);
    setItensSelecionados(
      venda.itens.map(item => ({
        item,
        quantidade: item.quantidade,
        selecionado: tipo === "extorno", // Para extorno, seleciona tudo por padrão
      }))
    );
    setMotivoFiscal("");
    setObservacoes("");
    setNotaReferenciada(venda.numero?.toString() || "");
    setFormaPagamentoDevolucao("dinheiro");
    setShowModalTrocaExtorno(true);
  };

  // Calcular valor total dos itens selecionados
  const calcularValorSelecionado = () => {
    return itensSelecionados
      .filter(i => i.selecionado)
      .reduce((acc, i) => acc + (i.item.precoUnitario * i.quantidade), 0);
  };

  const processarTrocaExtorno = async () => {
    if (!vendaTrocaExtorno) return;

    const itensSel = itensSelecionados.filter(i => i.selecionado && i.quantidade > 0);
    if (itensSel.length === 0) {
      setErro("Selecione ao menos um item para processar");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    if (!motivoFiscal) {
      setErro("Informe o motivo fiscal conforme SEFAZ");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    try {
      setProcessando(true);

      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        setErro("Operador não encontrado");
        return;
      }

      const { supabase } = await import("@/lib/supabase");

      const valorTotal = calcularValorSelecionado();
      const motivoSefaz = MOTIVOS_DEVOLUCAO_SEFAZ.find(m => m.codigo === motivoFiscal);
      const numero = `${tipoOperacao.toUpperCase()}-${Date.now().toString().slice(-8)}`;

      // 1. Registrar na tabela trocas_extornos
      const { data: registro, error: erroRegistro } = await supabase
        .from("trocas_extornos")
        .insert({
          venda_id: vendaTrocaExtorno.id,
          operador_id: operador.id,
          operador_nome: operador.nome,
          tipo: tipoOperacao,
          numero,
          itens_originais: itensSel.map(i => ({
            produtoId: i.item.produtoId,
            nome: i.item.nome,
            quantidade: i.quantidade,
            precoUnitario: i.item.precoUnitario,
            subtotal: i.item.precoUnitario * i.quantidade,
            codigoBarras: i.item.codigoBarras,
          })),
          itens_novos: [],
          valor_original: valorTotal,
          valor_diferenca: tipoOperacao === "extorno" ? -valorTotal : 0,
          forma_pagamento_diferenca: tipoOperacao === "extorno" ? formaPagamentoDevolucao : null,
          motivo: motivoSefaz?.descricao || motivoFiscal,
          observacoes,
          nota_referenciada: notaReferenciada || vendaTrocaExtorno.numero?.toString(),
          cfop_devolucao: tipoOperacao === "extorno" ? "5411" : "5411",
          motivo_fiscal: `${motivoFiscal} - ${motivoSefaz?.descricao}`,
          status: "processado",
        })
        .select()
        .single();

      if (erroRegistro) {
        console.error("Erro ao registrar:", erroRegistro);
        setErro("Erro ao registrar operação no banco de dados");
        return;
      }

      // 2. Registrar na tabela avarias (para controle de estoque se necessário)
      for (const itemSel of itensSel) {
        // Tenta inserir na tabela de avarias, ignorando erro se falhar
        await supabase.from("avarias").insert({
          produto_nome: itemSel.item.nome,
          codigo_barras: itemSel.item.codigoBarras || null,
          quantidade: itemSel.quantidade,
          valor_unitario: itemSel.item.precoUnitario,
          valor_total: itemSel.item.precoUnitario * itemSel.quantidade,
          motivo: `${tipoOperacao === "troca" ? "TROCA" : "EXTORNO"}: ${motivoSefaz?.descricao}`,
          observacoes: `Nota Referenciada: ${notaReferenciada || vendaTrocaExtorno.numero} | ${observacoes}`,
          tipo_destino: tipoOperacao === "troca" ? "estoque" : "avaria",
        }).then(({ error: avError }) => {
          if (avError) console.warn("Aviso ao registrar avaria:", avError.message);
        });
      }

      // 3. Atualizar venda com registro da operação
      const devolucaoRecord = {
        tipo: tipoOperacao,
        numero,
        itens: itensSel.map(i => ({
          produtoId: i.item.produtoId,
          nomeProduto: i.item.nome,
          quantidade: i.quantidade,
          valorUnitario: i.item.precoUnitario,
        })),
        valorTotal,
        motivoFiscal: `${motivoFiscal} - ${motivoSefaz?.descricao}`,
        observacoes,
        formaPagamentoDevolucao: tipoOperacao === "extorno" ? formaPagamentoDevolucao : null,
        dataHora: new Date().toISOString(),
        operador: operador.nome,
      };

      const devolucoeAtuais = vendaTrocaExtorno.devolucoes || [];
      await supabase
        .from("vendas")
        .update({
          devolucoes: [...devolucoeAtuais, devolucaoRecord],
        })
        .eq("id", vendaTrocaExtorno.id)
        .eq("operador_id", operador.id);

      const msg = tipoOperacao === "extorno"
        ? `Extorno registrado com sucesso! Valor devolvido: R$ ${valorTotal.toFixed(2)} via ${formaPagamentoDevolucao}. Protocolo: ${numero}`
        : `Troca registrada com sucesso! Protocolo: ${numero}. Encaminhe o produto ao estoque.`;

      setSucesso(msg);
      setTimeout(() => setSucesso(""), 8000);
      setShowModalTrocaExtorno(false);
      await carregarVendas();

    } catch (err) {
      console.error("Erro ao processar:", err);
      setErro("Erro ao processar operação");
      setTimeout(() => setErro(""), 3000);
    } finally {
      setProcessando(false);
    }
  };

  const vendasFiltradas = vendas.filter((venda) => {
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const matchBusca =
        venda.numero.toString().includes(busca) ||
        venda.operadorNome.toLowerCase().includes(buscaLower) ||
        venda.itens.some((item) => item.nome.toLowerCase().includes(buscaLower)) ||
        (venda.clienteNome && venda.clienteNome.toLowerCase().includes(buscaLower)) ||
        (venda.clienteCpf && venda.clienteCpf.replace(/\D/g, "").includes(busca.replace(/\D/g, "")));
      if (!matchBusca) return false;
    }

    if (dataFiltro) {
      const dataVenda = format(new Date(venda.dataHora), "yyyy-MM-dd");
      if (dataVenda !== dataFiltro) return false;
    }

    return true;
  });

  const totalVendas = vendasFiltradas.filter(v => v.status !== "cancelada").length;
  const valorTotalVendas = vendasFiltradas
    .filter(v => v.status !== "cancelada")
    .reduce((acc, venda) => acc + venda.total, 0);
  const ticketMedio = totalVendas > 0 ? valorTotalVendas / totalVendas : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/empresa")}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                <History className="w-8 h-8" />
                <span>Histórico de Vendas</span>
              </h1>
              <p className="text-purple-200">Todas as vendas realizadas</p>
            </div>

            <button
              onClick={() => carregarVendas()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alertas */}
        {sucesso && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-start backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{sucesso}</span>
          </div>
        )}

        {erro && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{erro}</span>
          </div>
        )}

        {/* Aviso fiscal sobre trocas/extornos */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-5 py-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-200 font-semibold mb-1">Trocas e Extornos — Conformidade Fiscal (SEFAZ/Receita Federal)</p>
            <p className="text-blue-300/80">
              Use os botões <strong>Troca</strong> ou <strong>Extorno</strong> para processar devoluções de forma legal.
              Cada operação gera um protocolo com CFOP 5411 e motivo fiscal conforme tabela SEFAZ,
              sendo registrada no banco de dados para auditoria da Receita Federal.
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">{totalVendas}</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Total de Vendas</h3>
            <p className="text-blue-100 text-sm">Vendas realizadas</p>
          </div>

          <div className="bg-green-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  R$ {valorTotalVendas.toFixed(2)}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Valor Total</h3>
            <p className="text-green-100 text-sm">Faturamento total</p>
          </div>

          <div className="bg-purple-600 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-12 h-12 text-white/80" />
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-bold text-lg">
                  R$ {ticketMedio.toFixed(2)}
                </span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Ticket Médio</h3>
            <p className="text-purple-100 text-sm">Valor médio por venda</p>
          </div>
        </div>

        {/* Lista de Vendas */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <History className="w-7 h-7 mr-3" />
                Vendas Realizadas
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              {dataFiltro && (
                <button
                  onClick={() => setDataFiltro("")}
                  className="flex items-center space-x-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-semibold">Limpar</span>
                </button>
              )}

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar vendas..."
                  className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {vendasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 text-lg">
                  {busca || dataFiltro ? "Nenhuma venda encontrada com os filtros aplicados" : "Nenhuma venda realizada"}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                {vendasFiltradas.map((venda) => (
                  <div
                    key={venda.id}
                    className={`border rounded-xl p-6 hover:bg-white/10 transition-all ${
                      venda.status === "cancelada"
                        ? "bg-red-500/5 border-red-500/30"
                        : venda.devolucoes && venda.devolucoes.length > 0
                        ? "bg-orange-500/5 border-orange-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {/* Cabeçalho da venda */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            venda.status === "cancelada"
                              ? "bg-red-500/20 text-red-300"
                              : venda.devolucoes && venda.devolucoes.length > 0
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          }`}>
                            Venda #{venda.numero}
                            {venda.status === "cancelada" && " (CANCELADA)"}
                            {venda.status !== "cancelada" && venda.devolucoes && venda.devolucoes.length > 0 && " (COM DEVOLUÇÃO)"}
                          </span>
                          <span className="text-purple-200 text-sm flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(venda.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          Operador: {venda.operadorNome}
                        </p>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <button
                          onClick={() => imprimirCupomFiscal(venda)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all"
                          title="Imprimir Cupom"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="font-semibold text-sm">Cupom</span>
                        </button>

                        <button
                          onClick={() => imprimirNFCe(venda)}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                          title="Imprimir NFC-e"
                        >
                          <Receipt className="w-4 h-4" />
                          <span className="font-semibold text-sm">NFC-e</span>
                        </button>

                        <button
                          onClick={() => imprimirNotaFiscalCompleta(venda)}
                          className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
                          title="Nota Completa"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="font-semibold text-sm">Nota</span>
                        </button>

                        {venda.status !== "cancelada" && (
                          <>
                            <button
                              onClick={() => abrirModalTrocaExtorno(venda, "troca")}
                              className="flex items-center space-x-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all border border-amber-500/30"
                              title="Solicitar Troca"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                              <span className="font-semibold text-sm">Troca</span>
                            </button>

                            <button
                              onClick={() => abrirModalTrocaExtorno(venda, "extorno")}
                              className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all border border-red-500/30"
                              title="Processar Extorno/Devolução"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="font-semibold text-sm">Extorno</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Itens da venda */}
                    <div className="space-y-2 mb-4">
                      {venda.itens.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <Package className="w-5 h-5 text-purple-300" />
                            <div>
                              <p className="text-white font-semibold">{item.nome}</p>
                              <p className="text-purple-200 text-sm">
                                {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <p className="text-white font-bold">
                            R$ {item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Dados do Cliente (CPF/Nome) */}
                    {(venda.clienteCpf || venda.clienteNome) && (
                      <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-blue-300 font-semibold mb-1 flex items-center text-sm">
                          <User className="w-4 h-4 mr-2" />
                          Dados do Cliente
                        </p>
                        {venda.clienteNome && (
                          <p className="text-blue-100 text-sm ml-6">
                            <strong>Nome:</strong> {venda.clienteNome}
                          </p>
                        )}
                        {venda.clienteCpf && (
                          <p className="text-blue-100 text-sm ml-6">
                            <strong>CPF:</strong> {venda.clienteCpf}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Histórico de Trocas/Extornos */}
                    {venda.devolucoes && venda.devolucoes.length > 0 && (
                      <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-orange-300 font-semibold mb-2 flex items-center">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Histórico de Trocas/Extornos:
                        </p>
                        <div className="space-y-2">
                          {venda.devolucoes.map((dev: any, idx: number) => (
                            <div key={idx} className="ml-2 bg-white/5 rounded-lg p-2 border border-orange-500/20">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  dev.tipo === "extorno" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                                }`}>
                                  {dev.tipo === "extorno" ? "EXTORNO" : "TROCA"}
                                </span>
                                {dev.numero && (
                                  <span className="text-white/50 text-xs">#{dev.numero}</span>
                                )}
                              </div>
                              {dev.itens ? (
                                dev.itens.map((i: any, iIdx: number) => (
                                  <p key={iIdx} className="text-orange-200 text-sm">
                                    • {i.quantidade}x {i.nomeProduto}
                                  </p>
                                ))
                              ) : dev.nomeProduto ? (
                                <p className="text-orange-200 text-sm">
                                  • {dev.quantidade}x {dev.nomeProduto}
                                </p>
                              ) : null}
                              {dev.motivoFiscal && (
                                <p className="text-orange-300/70 text-xs mt-1">
                                  Motivo: {dev.motivoFiscal}
                                </p>
                              )}
                              {dev.valorTotal && (
                                <p className="text-orange-300/70 text-xs">
                                  Valor: R$ {dev.valorTotal.toFixed(2)}
                                  {dev.formaPagamentoDevolucao && ` via ${dev.formaPagamentoDevolucao}`}
                                </p>
                              )}
                              <p className="text-orange-300/50 text-xs">
                                {new Date(dev.dataHora).toLocaleString("pt-BR")} — {dev.operador}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-4">
                        <span className="text-purple-200 font-semibold">TOTAL:</span>
                        {venda.tipoPagamento && (
                          <span className="text-purple-300 text-sm">
                            {venda.tipoPagamento === "dinheiro" ? "Dinheiro" :
                             venda.tipoPagamento === "credito" ? "Crédito" :
                             venda.tipoPagamento === "debito" ? "Débito" :
                             venda.tipoPagamento === "pix" ? "PIX" : venda.tipoPagamento}
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-green-400">
                        R$ {venda.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Troca/Extorno */}
      {showModalTrocaExtorno && vendaTrocaExtorno && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 my-8 max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className={`px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0 ${
              tipoOperacao === "extorno" ? "bg-red-700" : "bg-amber-700"
            }`}>
              <div className="flex items-center space-x-3">
                {tipoOperacao === "extorno" ? (
                  <RotateCcw className="w-6 h-6 text-white" />
                ) : (
                  <ArrowLeftRight className="w-6 h-6 text-white" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {tipoOperacao === "extorno" ? "Extorno / Devolução" : "Troca de Produto"}
                  </h3>
                  <p className="text-white/70 text-sm">
                    Venda #{vendaTrocaExtorno.numero} — Conforme SEFAZ/Receita Federal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalTrocaExtorno(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Aviso fiscal */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-200 text-sm font-semibold mb-1">
                  {tipoOperacao === "extorno" ? "Extorno Fiscal (CFOP 5411)" : "Troca de Mercadoria (CFOP 5411)"}
                </p>
                <p className="text-blue-300/70 text-xs">
                  {tipoOperacao === "extorno"
                    ? "O extorno cancela parcial ou totalmente a nota fiscal original. O consumidor tem direito por 30 dias (bem durável: 90 dias) conforme CDC. Registro obrigatório para conformidade com a Receita Federal."
                    : "A troca gera um novo registro fiscal vinculado à nota original. O produto devolvido volta ao estoque. Registro obrigatório para conformidade com a SEFAZ."}
                </p>
              </div>

              {/* Seleção de itens */}
              <div>
                <label className="block text-white text-sm font-semibold mb-3">
                  Selecione os itens para {tipoOperacao === "extorno" ? "extorno" : "troca"}:
                </label>
                <div className="space-y-2">
                  {itensSelecionados.map((itemSel, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                        itemSel.selecionado
                          ? "bg-white/10 border-white/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={itemSel.selecionado}
                        onChange={(e) => {
                          const novos = [...itensSelecionados];
                          novos[idx].selecionado = e.target.checked;
                          setItensSelecionados(novos);
                        }}
                        className="w-5 h-5 rounded accent-purple-500"
                      />
                      <div className="flex-1">
                        <p className="text-white font-semibold">{itemSel.item.nome}</p>
                        <p className="text-purple-200 text-sm">
                          R$ {itemSel.item.precoUnitario.toFixed(2)} por unidade
                        </p>
                      </div>
                      {itemSel.selecionado && (
                        <div className="flex items-center space-x-2">
                          <label className="text-purple-200 text-sm">Qtd:</label>
                          <input
                            type="number"
                            min="1"
                            max={itemSel.item.quantidade}
                            value={itemSel.quantidade}
                            onChange={(e) => {
                              const novos = [...itensSelecionados];
                              novos[idx].quantidade = Math.min(
                                parseInt(e.target.value) || 1,
                                itemSel.item.quantidade
                              );
                              setItensSelecionados(novos);
                            }}
                            className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-white/50 text-sm">/ {itemSel.item.quantidade}</span>
                        </div>
                      )}
                      <p className="text-white font-bold min-w-[80px] text-right">
                        R$ {(itemSel.item.precoUnitario * (itemSel.selecionado ? itemSel.quantidade : 0)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total selecionado */}
                <div className="mt-3 flex justify-between items-center bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-white font-semibold">
                    {tipoOperacao === "extorno" ? "Valor a ser extornado:" : "Valor dos itens para troca:"}
                  </span>
                  <span className="text-green-400 font-bold text-xl">
                    R$ {calcularValorSelecionado().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Motivo Fiscal (obrigatório SEFAZ) */}
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Motivo Fiscal (obrigatório — conforme tabela SEFAZ) *
                </label>
                <select
                  value={motivoFiscal}
                  onChange={(e) => setMotivoFiscal(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="" className="bg-slate-800">Selecione o motivo fiscal...</option>
                  {MOTIVOS_DEVOLUCAO_SEFAZ.map(m => (
                    <option key={m.codigo} value={m.codigo} className="bg-slate-800">
                      {m.codigo} — {m.descricao}
                    </option>
                  ))}
                </select>
                {motivoFiscal && (
                  <p className="text-purple-300 text-xs mt-1">
                    CFOP: 5411 | Motivo {motivoFiscal}: {MOTIVOS_DEVOLUCAO_SEFAZ.find(m => m.codigo === motivoFiscal)?.descricao}
                  </p>
                )}
              </div>

              {/* Nota referenciada */}
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Número da Nota Original Referenciada
                </label>
                <input
                  type="text"
                  value={notaReferenciada}
                  onChange={(e) => setNotaReferenciada(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={`Nº ${vendaTrocaExtorno.numero} (preenchido automaticamente)`}
                />
              </div>

              {/* Forma de pagamento da devolução (apenas extorno) */}
              {tipoOperacao === "extorno" && (
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">
                    Como será devolvido o dinheiro ao cliente? *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { valor: "dinheiro", label: "Dinheiro" },
                      { valor: "credito", label: "Crédito" },
                      { valor: "debito", label: "Débito" },
                      { valor: "pix", label: "PIX" },
                      { valor: "troca", label: "Crédito na Loja" },
                    ].map(op => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => setFormaPagamentoDevolucao(op.valor as any)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          formaPagamentoDevolucao === op.valor
                            ? "bg-red-600 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Detalhes adicionais sobre a operação..."
                />
              </div>

              {/* Resumo da operação */}
              <div className={`border rounded-lg p-4 ${
                tipoOperacao === "extorno"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <p className={`font-semibold text-sm mb-2 ${tipoOperacao === "extorno" ? "text-red-300" : "text-amber-300"}`}>
                  O que acontecerá:
                </p>
                <ul className={`text-sm space-y-1 ${tipoOperacao === "extorno" ? "text-red-200/80" : "text-amber-200/80"}`}>
                  {tipoOperacao === "extorno" ? (
                    <>
                      <li>• Extorno de R$ {calcularValorSelecionado().toFixed(2)} ao cliente via {formaPagamentoDevolucao}</li>
                      <li>• Registro fiscal com CFOP 5411 vinculado à nota #{vendaTrocaExtorno.numero}</li>
                      <li>• Histórico de auditoria gerado para a Receita Federal</li>
                      <li>• Protocolo de extorno gerado para o cliente</li>
                    </>
                  ) : (
                    <>
                      <li>• Produto(s) devolvido(s) ao estoque para nova venda</li>
                      <li>• Registro de troca com CFOP 5411 vinculado à nota #{vendaTrocaExtorno.numero}</li>
                      <li>• Histórico de auditoria gerado conforme exigência SEFAZ</li>
                      <li>• Protocolo de troca gerado para o cliente</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Botões */}
            <div className="p-6 pt-4 border-t border-white/10 bg-slate-900/50 rounded-b-2xl flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModalTrocaExtorno(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                  disabled={processando}
                >
                  Cancelar
                </button>
                <button
                  onClick={processarTrocaExtorno}
                  disabled={processando || !motivoFiscal || itensSelecionados.filter(i => i.selecionado).length === 0}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition-all font-semibold shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    tipoOperacao === "extorno"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {processando ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : tipoOperacao === "extorno" ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <ArrowLeftRight className="w-5 h-5" />
                  )}
                  <span>
                    {processando
                      ? "Processando..."
                      : tipoOperacao === "extorno"
                      ? "Confirmar Extorno"
                      : "Confirmar Troca"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
