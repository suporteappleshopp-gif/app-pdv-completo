"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Download,
  Plus,
  Edit,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Calendar,
  Building2,
  AlertCircle,
  Save,
  Filter,
} from "lucide-react";
import { format, isAfter, isBefore, isToday, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContaPagar, MovimentacaoCaixa, Loja, Venda } from "@/lib/types";

type AbaFinanceiro = "contas" | "caixa" | "relatorios";
type FiltroContas = "todas" | "a_pagar" | "pago" | "vencido";

export default function FinanceiroGestaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaFinanceiro>("contas");
  const [operadorId, setOperadorId] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaSelecionada, setLojaSelecionada] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Contas a Pagar
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [filtroContas, setFiltroContas] = useState<FiltroContas>("todas");
  const [showModalConta, setShowModalConta] = useState(false);
  const [contaForm, setContaForm] = useState<Partial<ContaPagar>>({
    descricao: "", fornecedor: "", valor: 0, data_vencimento: "",
    status: "a_pagar", parcela_numero: 1, total_parcelas: 1,
  });
  const [modoEdicaoConta, setModoEdicaoConta] = useState(false);

  // Caixa
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>([]);
  const [showModalCaixa, setShowModalCaixa] = useState(false);
  const [tipoCaixa, setTipoCaixa] = useState<"sangria" | "suprimento">("sangria");
  const [valorCaixa, setValorCaixa] = useState("");
  const [motivoCaixa, setMotivoCaixa] = useState("");

  // Relatórios
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [periodoRelatorio, setPeriodoRelatorio] = useState("mes_atual");
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    try {
      setLoading(true);
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();
      if (operador?.isAdmin) { window.location.href = "/admin"; return; }
      if (!operador) { router.push("/"); return; }

      setOperadorId(operador.id);
      setOperadorNome(operador.nome);
      await Promise.all([
        carregarContas(operador.id),
        carregarMovimentacoesCaixa(operador.id),
        carregarLojas(operador.id),
        carregarVendas(operador.id),
      ]);
    } catch (err: any) {
      setErro("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const carregarContas = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");

    // Atualizar automaticamente o status de vencidas
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("contas_pagar")
      .update({ status: "vencido" })
      .eq("user_id", uid)
      .eq("status", "a_pagar")
      .lt("data_vencimento", hoje);

    const { data } = await supabase.from("contas_pagar")
      .select("*").eq("user_id", uid).order("data_vencimento", { ascending: true });
    setContas(data || []);
  };

  const carregarMovimentacoesCaixa = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("movimentacoes_caixa")
      .select("*").eq("user_id", uid).order("data_hora", { ascending: false }).limit(100);
    setMovimentacoesCaixa(data || []);
  };

  const carregarLojas = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("lojas").select("*").eq("user_id", uid).eq("ativo", true);
    setLojas(data || []);
  };

  const carregarVendas = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.from("vendas").select("*")
      .eq("operador_id", uid).order("created_at", { ascending: false });
    const vendaMapped = (data || []).map((v: any) => ({
      id: v.id,
      numero: v.numero,
      operadorId: v.operador_id,
      operadorNome: v.operador_nome,
      itens: v.itens || [],
      total: v.total,
      dataHora: new Date(v.created_at),
      tipoPagamento: v.forma_pagamento,
      status: v.status,
    }));
    setVendas(vendaMapped);
  };

  const mostrarSucesso = (msg: string) => { setSucesso(msg); setTimeout(() => setSucesso(""), 4000); };
  const mostrarErro = (msg: string) => { setErro(msg); setTimeout(() => setErro(""), 4000); };

  // ---- CONTAS A PAGAR ----
  const salvarConta = async () => {
    if (!contaForm.descricao || !contaForm.valor || !contaForm.data_vencimento) {
      mostrarErro("Preencha descrição, valor e vencimento"); return;
    }
    try {
      const { supabase } = await import("@/lib/supabase");
      const payload = {
        user_id: operadorId,
        loja_id: lojaSelecionada || null,
        descricao: contaForm.descricao,
        fornecedor: contaForm.fornecedor,
        valor: contaForm.valor,
        data_vencimento: contaForm.data_vencimento,
        status: contaForm.status || "a_pagar",
        forma_pagamento: contaForm.forma_pagamento,
        parcela_numero: contaForm.parcela_numero || 1,
        total_parcelas: contaForm.total_parcelas || 1,
        observacoes: contaForm.observacoes,
      };
      if (modoEdicaoConta && contaForm.id) {
        await supabase.from("contas_pagar").update(payload).eq("id", contaForm.id);
        mostrarSucesso("Conta atualizada!");
      } else {
        await supabase.from("contas_pagar").insert(payload);
        mostrarSucesso("Conta adicionada!");
      }
      setShowModalConta(false);
      await carregarContas(operadorId);
    } catch (err: any) { mostrarErro("Erro: " + err.message); }
  };

  const marcarComoPago = async (conta: ContaPagar) => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("contas_pagar").update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    }).eq("id", conta.id!);
    mostrarSucesso("Conta marcada como paga!");
    await carregarContas(operadorId);
  };

  const excluirConta = async (id: string) => {
    if (!confirm("Excluir esta conta?")) return;
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("contas_pagar").delete().eq("id", id);
    mostrarSucesso("Conta excluída!");
    await carregarContas(operadorId);
  };

  // ---- SANGRIA / SUPRIMENTO ----
  const registrarMovimentacaoCaixa = async () => {
    const valor = parseFloat(valorCaixa.replace(",", "."));
    if (!valor || valor <= 0) { mostrarErro("Informe um valor válido"); return; }
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("movimentacoes_caixa").insert({
        user_id: operadorId,
        loja_id: lojaSelecionada || null,
        tipo: tipoCaixa,
        valor,
        motivo: motivoCaixa || (tipoCaixa === "sangria" ? "Sangria de caixa" : "Suprimento de caixa"),
        operador_nome: operadorNome,
        data_hora: new Date().toISOString(),
      });
      setValorCaixa(""); setMotivoCaixa("");
      setShowModalCaixa(false);
      mostrarSucesso(`${tipoCaixa === "sangria" ? "Sangria" : "Suprimento"} registrado com sucesso!`);
      await carregarMovimentacoesCaixa(operadorId);
    } catch (err: any) { mostrarErro("Erro: " + err.message); }
  };

  // ---- RELATÓRIOS ----
  const getVendasPorPeriodo = () => {
    const agora = new Date();
    let inicio: Date, fim: Date;
    switch (periodoRelatorio) {
      case "mes_atual": inicio = startOfMonth(agora); fim = endOfMonth(agora); break;
      case "mes_anterior": inicio = startOfMonth(subMonths(agora, 1)); fim = endOfMonth(subMonths(agora, 1)); break;
      case "ultimos_30": inicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000); fim = agora; break;
      default: inicio = startOfMonth(agora); fim = endOfMonth(agora);
    }
    return vendas.filter(v => {
      const d = new Date(v.dataHora);
      return d >= inicio && d <= fim;
    });
  };

  const calcularDRE = () => {
    const vendasPeriodo = getVendasPorPeriodo();
    const faturamento = vendasPeriodo.filter(v => v.status !== "cancelada").reduce((acc, v) => acc + v.total, 0);

    // Custos: contas pagas no período
    const contasPagasPeriodo = contas.filter(c => {
      if (c.status !== "pago" || !c.data_pagamento) return false;
      const d = parseISO(c.data_pagamento);
      const vendasP = getVendasPorPeriodo();
      if (vendasP.length === 0) return false;
      const inicio = new Date(Math.min(...vendasP.map(v => new Date(v.dataHora).getTime())));
      const fim = new Date(Math.max(...vendasP.map(v => new Date(v.dataHora).getTime())));
      return d >= inicio && d <= fim;
    }).reduce((acc, c) => acc + c.valor, 0);

    // Sangrias
    const sangriasPeriodo = movimentacoesCaixa.filter(m => m.tipo === "sangria").reduce((acc, m) => acc + m.valor, 0);

    const lucroLiquido = faturamento - contasPagasPeriodo;
    return { faturamento, custos: contasPagasPeriodo, despesas: sangriasPeriodo, lucroLiquido };
  };

  const gerarRelatorioTexto = (tipo: "dre" | "caixa" | "abc") => {
    setGerandoRelatorio(true);
    try {
      const vendasPeriodo = getVendasPorPeriodo();
      let conteudo = "";

      if (tipo === "dre") {
        const dre = calcularDRE();
        conteudo = `DRE SIMPLIFICADO\n================\nFaturamento: R$ ${dre.faturamento.toFixed(2)}\nCustos (NFs/Compras): R$ ${dre.custos.toFixed(2)}\nDespesas (Sangrias): R$ ${dre.despesas.toFixed(2)}\n------------------------\nLucro Líquido: R$ ${dre.lucroLiquido.toFixed(2)}`;
      } else if (tipo === "caixa") {
        const totalSangrias = movimentacoesCaixa.filter(m => m.tipo === "sangria").reduce((acc, m) => acc + m.valor, 0);
        const totalSuprimentos = movimentacoesCaixa.filter(m => m.tipo === "suprimento").reduce((acc, m) => acc + m.valor, 0);
        const linhas = movimentacoesCaixa.slice(0, 50).map(m =>
          `${m.data_hora ? format(new Date(m.data_hora), "dd/MM HH:mm") : "—"} | ${m.tipo.toUpperCase()} | R$ ${m.valor.toFixed(2)} | ${m.motivo || "—"} | ${m.operador_nome}`
        ).join("\n");
        conteudo = `FECHAMENTO DE CAIXA\n===================\nTotal Sangrias: R$ ${totalSangrias.toFixed(2)}\nTotal Suprimentos: R$ ${totalSuprimentos.toFixed(2)}\n\nDETALHAMENTO:\n${linhas}`;
      } else if (tipo === "abc") {
        const mapProdutos: Record<string, { nome: string; qtd: number; valor: number }> = {};
        vendasPeriodo.forEach(v => {
          if (!v.itens) return;
          v.itens.forEach((item: any) => {
            if (!mapProdutos[item.produtoId]) mapProdutos[item.produtoId] = { nome: item.nome, qtd: 0, valor: 0 };
            mapProdutos[item.produtoId].qtd += item.quantidade;
            mapProdutos[item.produtoId].valor += item.subtotal;
          });
        });
        const sorted = Object.values(mapProdutos).sort((a, b) => b.valor - a.valor);
        const linhas = sorted.slice(0, 20).map((p, i) => `${i + 1}. ${p.nome} | Qtd: ${p.qtd} | R$ ${p.valor.toFixed(2)}`).join("\n");
        conteudo = `CURVA ABC - TOP 20 PRODUTOS\n===========================\n${linhas}`;
      }

      // Download como TXT
      const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `relatorio_${tipo}_${new Date().toISOString().split("T")[0]}.txt`;
      a.click(); URL.revokeObjectURL(url);
      mostrarSucesso("Relatório gerado e baixado!");
    } catch (err: any) {
      mostrarErro("Erro ao gerar relatório");
    } finally {
      setGerandoRelatorio(false);
    }
  };

  // ---- CÁLCULOS GERAIS ----
  const contasFiltradas = contas.filter(c => filtroContas === "todas" || c.status === filtroContas);
  const totalAPagar = contas.filter(c => c.status === "a_pagar").reduce((acc, c) => acc + c.valor, 0);
  const totalVencido = contas.filter(c => c.status === "vencido").reduce((acc, c) => acc + c.valor, 0);
  const totalPago = contas.filter(c => c.status === "pago").reduce((acc, c) => acc + c.valor, 0);
  const totalSangrias = movimentacoesCaixa.filter(m => m.tipo === "sangria").reduce((acc, m) => acc + m.valor, 0);
  const totalSuprimentos = movimentacoesCaixa.filter(m => m.tipo === "suprimento").reduce((acc, m) => acc + m.valor, 0);
  const dre = calcularDRE();

  const contasVencendoHoje = contas.filter(c => c.status === "a_pagar" && c.data_vencimento === new Date().toISOString().split("T")[0]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Carregando financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/empresa")} className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
              <ArrowLeft className="w-5 h-5" /><span>Voltar</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-7 h-7" /><span>Painel Financeiro</span>
              </h1>
              <p className="text-purple-200 text-sm">Contas a pagar, caixa e relatórios</p>
            </div>
            <div className="flex gap-2 items-center">
              {lojas.length > 0 && (
                <select value={lojaSelecionada} onChange={e => setLojaSelecionada(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm">
                  <option value="">Todas as lojas</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              )}
              <button onClick={() => router.push("/financeiro")} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">
                Metas / Ganhos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {([
              { id: "contas", label: "Contas a Pagar", icon: FileText },
              { id: "caixa", label: "Controle de Caixa", icon: ArrowDownCircle },
              { id: "relatorios", label: "Relatórios", icon: BarChart3 },
            ] as { id: AbaFinanceiro; label: string; icon: any }[]).map(aba => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${abaAtiva === aba.id ? "border-purple-400 text-white" : "border-transparent text-purple-300 hover:text-white"}`}>
                <aba.icon className="w-4 h-4" /><span>{aba.label}</span>
                {aba.id === "contas" && (contas.filter(c => c.status === "vencido").length > 0) && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                    {contas.filter(c => c.status === "vencido").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Alertas */}
        {sucesso && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" /><span className="font-medium">{sucesso}</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /><span className="font-medium">{erro}</span>
          </div>
        )}

        {/* Alerta de vencimento hoje */}
        {contasVencendoHoje.length > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 font-semibold">{contasVencendoHoje.length} conta(s) vencem HOJE!</p>
              {contasVencendoHoje.map(c => (
                <p key={c.id} className="text-yellow-300 text-sm">• {c.descricao} — R$ {c.valor.toFixed(2).replace(".", ",")}</p>
              ))}
            </div>
          </div>
        )}

        {/* ===== ABA CONTAS ===== */}
        {abaAtiva === "contas" && (
          <div className="space-y-6">
            {/* Cards resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-600/70 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold">
                    {contas.filter(c => c.status === "a_pagar").length}
                  </span>
                </div>
                <h3 className="text-white font-bold">A Pagar</h3>
                <p className="text-orange-100 text-lg font-bold">R$ {totalAPagar.toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="bg-red-700/70 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold">
                    {contas.filter(c => c.status === "vencido").length}
                  </span>
                </div>
                <h3 className="text-white font-bold">Vencidas</h3>
                <p className="text-red-100 text-lg font-bold">R$ {totalVencido.toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="bg-green-600/70 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold">
                    {contas.filter(c => c.status === "pago").length}
                  </span>
                </div>
                <h3 className="text-white font-bold">Pagas</h3>
                <p className="text-green-100 text-lg font-bold">R$ {totalPago.toFixed(2).replace(".", ",")}</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {(["todas", "a_pagar", "vencido", "pago"] as FiltroContas[]).map(f => (
                  <button key={f} onClick={() => setFiltroContas(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filtroContas === f ? "bg-purple-600 text-white" : "bg-white/10 text-purple-200 hover:bg-white/20"}`}>
                    {f === "todas" ? "Todas" : f === "a_pagar" ? "A Pagar" : f === "vencido" ? "Vencidas" : "Pagas"}
                  </button>
                ))}
              </div>
              <button onClick={() => { setContaForm({ descricao: "", fornecedor: "", valor: 0, data_vencimento: "", status: "a_pagar", parcela_numero: 1, total_parcelas: 1 }); setModoEdicaoConta(false); setShowModalConta(true); }}
                className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />Nova Conta
              </button>
            </div>

            {/* Lista de contas */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                {contasFiltradas.length === 0 ? (
                  <div className="p-10 text-center">
                    <FileText className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                    <p className="text-purple-300">Nenhuma conta encontrada</p>
                  </div>
                ) : contasFiltradas.map((conta) => (
                  <div key={conta.id} className={`p-4 flex items-center justify-between gap-4 ${conta.status === "vencido" ? "bg-red-900/20" : conta.status === "pago" ? "bg-green-900/10" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{conta.descricao}</p>
                        {conta.total_parcelas > 1 && (
                          <span className="text-xs text-purple-300">({conta.parcela_numero}/{conta.total_parcelas})</span>
                        )}
                        <StatusBadge status={conta.status} />
                      </div>
                      {conta.fornecedor && <p className="text-purple-300 text-xs mt-0.5">Fornecedor: {conta.fornecedor}</p>}
                      <p className="text-purple-300 text-xs">
                        Vence: {conta.data_vencimento ? format(parseISO(conta.data_vencimento), "dd/MM/yyyy") : "—"}
                        {conta.data_pagamento && ` | Pago em: ${format(parseISO(conta.data_pagamento), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-lg ${conta.status === "vencido" ? "text-red-300" : conta.status === "pago" ? "text-green-300" : "text-white"}`}>
                        R$ {conta.valor.toFixed(2).replace(".", ",")}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {conta.status !== "pago" && (
                          <button onClick={() => marcarComoPago(conta)}
                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg" title="Marcar como pago">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setContaForm(conta); setModoEdicaoConta(true); setShowModalConta(true); }}
                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => excluirConta(conta.id!)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ABA CAIXA ===== */}
        {abaAtiva === "caixa" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-700/70 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowDownCircle className="w-10 h-10 text-white/80" />
                </div>
                <h3 className="text-white font-bold">Total Sangrias</h3>
                <p className="text-red-100 text-xl font-bold">R$ {totalSangrias.toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="bg-green-600/70 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowUpCircle className="w-10 h-10 text-white/80" />
                </div>
                <h3 className="text-white font-bold">Total Suprimentos</h3>
                <p className="text-green-100 text-xl font-bold">R$ {totalSuprimentos.toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="bg-blue-600/70 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-10 h-10 text-white/80" />
                </div>
                <h3 className="text-white font-bold">Saldo Movimentações</h3>
                <p className={`text-xl font-bold ${totalSuprimentos - totalSangrias >= 0 ? "text-green-200" : "text-red-200"}`}>
                  R$ {(totalSuprimentos - totalSangrias).toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setTipoCaixa("sangria"); setShowModalCaixa(true); }}
                className="flex-1 px-4 py-3 bg-red-600/70 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <ArrowDownCircle className="w-5 h-5" />Registrar Sangria
              </button>
              <button onClick={() => { setTipoCaixa("suprimento"); setShowModalCaixa(true); }}
                className="flex-1 px-4 py-3 bg-green-600/70 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <ArrowUpCircle className="w-5 h-5" />Registrar Suprimento
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-indigo-600/80 px-6 py-4">
                <h3 className="text-lg font-bold text-white">Histórico de Movimentações de Caixa</h3>
              </div>
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                {movimentacoesCaixa.length === 0 ? (
                  <div className="p-8 text-center text-purple-300">Nenhuma movimentação registrada</div>
                ) : movimentacoesCaixa.map((mov, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full mr-2 ${mov.tipo === "sangria" ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
                        {mov.tipo === "sangria" ? "SANGRIA" : "SUPRIMENTO"}
                      </span>
                      <span className="text-white text-sm">{mov.motivo || "—"}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${mov.tipo === "sangria" ? "text-red-300" : "text-green-300"}`}>
                        {mov.tipo === "sangria" ? "-" : "+"}R$ {mov.valor.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-purple-300 text-xs">
                        {mov.data_hora ? format(new Date(mov.data_hora), "dd/MM/yyyy HH:mm") : "—"} | {mov.operador_nome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ABA RELATÓRIOS ===== */}
        {abaAtiva === "relatorios" && (
          <div className="space-y-6">
            {/* Seletor de período */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Calendar className="w-5 h-5" />Período de Análise</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "mes_atual", label: "Mês Atual" },
                  { id: "mes_anterior", label: "Mês Anterior" },
                  { id: "ultimos_30", label: "Últimos 30 dias" },
                ].map(p => (
                  <button key={p.id} onClick={() => setPeriodoRelatorio(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${periodoRelatorio === p.id ? "bg-purple-600 text-white" : "bg-white/10 text-purple-200 hover:bg-white/20"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DRE ao vivo */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-6 h-6" />DRE Simplificado</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-green-300 font-semibold flex items-center gap-2"><ArrowUpCircle className="w-5 h-5" />Faturamento Bruto</span>
                  <span className="text-green-300 text-xl font-bold">R$ {dre.faturamento.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <span className="text-red-300 font-semibold flex items-center gap-2"><ArrowDownCircle className="w-5 h-5" />Custos (NFs/Compras Pagas)</span>
                  <span className="text-red-300 text-xl font-bold">- R$ {dre.custos.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <span className="text-orange-300 font-semibold flex items-center gap-2"><TrendingDown className="w-5 h-5" />Despesas (Sangrias)</span>
                  <span className="text-orange-300 text-xl font-bold">- R$ {dre.despesas.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${dre.lucroLiquido >= 0 ? "bg-purple-500/20 border-purple-500" : "bg-red-700/20 border-red-600"}`}>
                  <span className="text-white font-bold text-lg">Lucro Líquido</span>
                  <span className={`text-2xl font-bold ${dre.lucroLiquido >= 0 ? "text-purple-300" : "text-red-300"}`}>
                    R$ {dre.lucroLiquido.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de download */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-300" />DRE Simplificado</h4>
                <p className="text-purple-300 text-sm mb-4">Faturamento, custos, despesas e lucro líquido do período.</p>
                <button onClick={() => gerarRelatorioTexto("dre")} disabled={gerandoRelatorio}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Download className="w-4 h-4" />Baixar Relatório
                </button>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-red-300" />Fechamento de Caixa</h4>
                <p className="text-purple-300 text-sm mb-4">Detalhamento de todas as sangrias e suprimentos registrados.</p>
                <button onClick={() => gerarRelatorioTexto("caixa")} disabled={gerandoRelatorio}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Download className="w-4 h-4" />Baixar Relatório
                </button>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-300" />Curva ABC</h4>
                <p className="text-purple-300 text-sm mb-4">Top 20 produtos que mais vendem e geram receita no período.</p>
                <button onClick={() => gerarRelatorioTexto("abc")} disabled={gerandoRelatorio}
                  className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Download className="w-4 h-4" />Baixar Relatório
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      {showModalConta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0">
              <h3 className="text-xl font-bold text-white">{modoEdicaoConta ? "Editar Conta" : "Nova Conta a Pagar"}</h3>
              <button onClick={() => setShowModalConta(false)} className="text-white hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Descrição *</label>
                <input type="text" value={contaForm.descricao || ""} onChange={e => setContaForm({...contaForm, descricao: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="Ex: Fatura de fornecedor" />
              </div>
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Fornecedor</label>
                <input type="text" value={contaForm.fornecedor || ""} onChange={e => setContaForm({...contaForm, fornecedor: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Valor (R$) *</label>
                  <input type="number" value={contaForm.valor || 0} onChange={e => setContaForm({...contaForm, valor: parseFloat(e.target.value) || 0})}
                    step="0.01" className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Vencimento *</label>
                  <input type="date" value={contaForm.data_vencimento || ""} onChange={e => setContaForm({...contaForm, data_vencimento: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Parcela Nº</label>
                  <input type="number" value={contaForm.parcela_numero || 1} onChange={e => setContaForm({...contaForm, parcela_numero: parseInt(e.target.value) || 1})}
                    min={1} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Total de Parcelas</label>
                  <input type="number" value={contaForm.total_parcelas || 1} onChange={e => setContaForm({...contaForm, total_parcelas: parseInt(e.target.value) || 1})}
                    min={1} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
              </div>
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Forma de Pagamento</label>
                <input type="text" value={contaForm.forma_pagamento || ""} onChange={e => setContaForm({...contaForm, forma_pagamento: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="Ex: PIX, Boleto, Transferência" />
              </div>
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Observações</label>
                <textarea value={contaForm.observacoes || ""} onChange={e => setContaForm({...contaForm, observacoes: e.target.value})}
                  rows={2} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModalConta(false)} className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold">Cancelar</button>
                <button onClick={salvarConta} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />{modoEdicaoConta ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sangria/Suprimento */}
      {showModalCaixa && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className={`${tipoCaixa === "sangria" ? "bg-red-700" : "bg-green-700"} px-6 py-4 flex items-center justify-between rounded-t-2xl`}>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {tipoCaixa === "sangria" ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                {tipoCaixa === "sangria" ? "Sangria de Caixa" : "Suprimento de Caixa"}
              </h3>
              <button onClick={() => setShowModalCaixa(false)} className="text-white hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Valor (R$) *</label>
                <input type="text" value={valorCaixa} onChange={e => setValorCaixa(e.target.value.replace(/[^\d,]/g, ""))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-xl font-bold" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-1">Motivo</label>
                <input type="text" value={motivoCaixa} onChange={e => setMotivoCaixa(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder={tipoCaixa === "sangria" ? "Ex: Pagamento de conta" : "Ex: Troco para abertura"} />
              </div>
              {lojas.length > 0 && (
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Loja</label>
                  <select value={lojaSelecionada} onChange={e => setLojaSelecionada(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white">
                    <option value="">Selecione</option>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModalCaixa(false)} className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold">Cancelar</button>
                <button onClick={registrarMovimentacaoCaixa}
                  className={`flex-1 px-4 py-3 ${tipoCaixa === "sangria" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} text-white rounded-lg font-bold flex items-center justify-center gap-2`}>
                  <Save className="w-5 h-5" />Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    a_pagar: { label: "A PAGAR", className: "bg-orange-500/20 text-orange-300" },
    pago: { label: "PAGO", className: "bg-green-500/20 text-green-300" },
    vencido: { label: "VENCIDA", className: "bg-red-500/20 text-red-300" },
  };
  const c = config[status] || config.a_pagar;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.className}`}>{c.label}</span>
  );
}
