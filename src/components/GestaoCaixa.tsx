"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Printer,
  Clock,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RegistroCaixa } from "@/lib/types";

interface GestaoCaixaProps {
  operadorId: string;
  operadorNome: string;
  empresaNome?: string;
  empresaCnpj?: string;
  empresaEndereco?: string;
  empresaTelefone?: string;
  temDadosFiscais?: boolean;
}

interface VendaDia {
  total: number;
  quantidade: number;
  totalDinheiro: number;
  totalCredito: number;
  totalDebito: number;
  totalPix: number;
  totalOutros: number;
}

export default function GestaoCaixa({
  operadorId,
  operadorNome,
  empresaNome,
  empresaCnpj,
  empresaEndereco,
  empresaTelefone,
  temDadosFiscais = false,
}: GestaoCaixaProps) {
  const [expandido, setExpandido] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const [ultimaAbertura, setUltimaAbertura] = useState<RegistroCaixa | null>(null);
  const [ultimoFechamento, setUltimoFechamento] = useState<RegistroCaixa | null>(null);
  const [caixaAberto, setCaixaAberto] = useState(false);

  // Modal de abertura
  const [mostrarModalAbertura, setMostrarModalAbertura] = useState(false);
  const [valorInicialAbertura, setValorInicialAbertura] = useState("0.00");
  const [observacoesAbertura, setObservacoesAbertura] = useState("");

  // Modal de fechamento
  const [mostrarModalFechamento, setMostrarModalFechamento] = useState(false);
  const [resumoFechamento, setResumoFechamento] = useState<VendaDia | null>(null);
  const [observacoesFechamento, setObservacoesFechamento] = useState("");
  const [contingencias, setContingencias] = useState(0);
  const [mostrarAlertaContingencia, setMostrarAlertaContingencia] = useState(false);

  // Modal impressão relatório
  const [mostrarModalImpressao, setMostrarModalImpressao] = useState(false);
  const [dadosFechamentoFinal, setDadosFechamentoFinal] = useState<RegistroCaixa | null>(null);

  useEffect(() => {
    if (operadorId && expandido) {
      carregarStatusCaixa();
    }
  }, [operadorId, expandido]);

  const carregarStatusCaixa = async () => {
    if (!operadorId) return;
    setCarregando(true);
    try {
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

      const { data, error } = await supabase
        .from("registros_caixa")
        .select("*")
        .eq("operador_id", operadorId)
        .gte("data_hora", inicioHoje)
        .order("data_hora", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const abertura = data.find((r) => r.tipo === "abertura");
        const fechamento = data.find((r) => r.tipo === "fechamento");

        if (abertura) {
          setUltimaAbertura({
            id: abertura.id,
            operadorId: abertura.operador_id,
            operadorNome: abertura.operador_nome,
            tipo: abertura.tipo,
            valorInicial: abertura.valor_inicial,
            observacoes: abertura.observacoes,
            dataHora: abertura.data_hora,
          });
        }

        if (fechamento) {
          setUltimoFechamento({
            id: fechamento.id,
            operadorId: fechamento.operador_id,
            operadorNome: fechamento.operador_nome,
            tipo: fechamento.tipo,
            valorFinal: fechamento.valor_final,
            totalVendas: fechamento.total_vendas,
            totalDinheiro: fechamento.total_dinheiro,
            totalCredito: fechamento.total_credito,
            totalDebito: fechamento.total_debito,
            totalPix: fechamento.total_pix,
            totalOutros: fechamento.total_outros,
            quantidadeVendas: fechamento.quantidade_vendas,
            observacoes: fechamento.observacoes,
            dataHora: fechamento.data_hora,
          });
        }

        // Caixa está aberto se tem abertura mas não tem fechamento hoje
        setCaixaAberto(!!abertura && !fechamento);
      } else {
        setUltimaAbertura(null);
        setUltimoFechamento(null);
        setCaixaAberto(false);
      }
    } catch (err) {
      console.error("Erro ao carregar status do caixa:", err);
    } finally {
      setCarregando(false);
    }
  };

  const consultarVendasDoDia = async (): Promise<VendaDia> => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();

    const { data, error } = await supabase
      .from("vendas")
      .select("total, tipo_pagamento, pagamentos")
      .eq("operador_id", operadorId)
      .eq("status", "concluida")
      .gte("created_at", inicioHoje)
      .lt("created_at", fimHoje);

    if (error) throw error;

    const resumo: VendaDia = {
      total: 0,
      quantidade: 0,
      totalDinheiro: 0,
      totalCredito: 0,
      totalDebito: 0,
      totalPix: 0,
      totalOutros: 0,
    };

    if (data) {
      data.forEach((venda) => {
        resumo.total += Number(venda.total) || 0;
        resumo.quantidade += 1;

        // Pagamentos mistos
        if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
          venda.pagamentos.forEach((p: { tipo: string; valor: number }) => {
            const val = Number(p.valor) || 0;
            if (p.tipo === "dinheiro") resumo.totalDinheiro += val;
            else if (p.tipo === "credito") resumo.totalCredito += val;
            else if (p.tipo === "debito") resumo.totalDebito += val;
            else if (p.tipo === "pix") resumo.totalPix += val;
            else resumo.totalOutros += val;
          });
        } else {
          const val = Number(venda.total) || 0;
          const tipo = venda.tipo_pagamento;
          if (tipo === "dinheiro") resumo.totalDinheiro += val;
          else if (tipo === "credito") resumo.totalCredito += val;
          else if (tipo === "debito") resumo.totalDebito += val;
          else if (tipo === "pix") resumo.totalPix += val;
          else resumo.totalOutros += val;
        }
      });
    }

    return resumo;
  };

  const abrirCaixa = async () => {
    if (!operadorId) return;
    setProcessando(true);
    try {
      const registro: Record<string, unknown> = {
        operador_id: operadorId,
        operador_nome: operadorNome,
        tipo: "abertura",
        valor_inicial: parseFloat(valorInicialAbertura) || 0,
        observacoes: observacoesAbertura || null,
        data_hora: new Date().toISOString(),
      };

      const { error } = await supabase.from("registros_caixa").insert([registro]);
      if (error) throw error;

      setMostrarModalAbertura(false);
      setObservacoesAbertura("");
      setValorInicialAbertura("0.00");
      setMensagem({ tipo: "sucesso", texto: "Caixa aberto com sucesso!" });
      setTimeout(() => setMensagem(null), 4000);
      await carregarStatusCaixa();
    } catch (err) {
      console.error("Erro ao abrir caixa:", err);
      setMensagem({ tipo: "erro", texto: "Erro ao registrar abertura de caixa." });
      setTimeout(() => setMensagem(null), 4000);
    } finally {
      setProcessando(false);
    }
  };

  const prepararFechamento = async () => {
    setCarregando(true);
    try {
      const resumo = await consultarVendasDoDia();
      setResumoFechamento(resumo);

      // Verificar contingências (NFC-e pendentes) - só se tiver dados fiscais
      if (temDadosFiscais) {
        setContingencias(0); // Placeholder - futura integração com fila de NFC-e
        if (contingencias > 0) {
          setMostrarAlertaContingencia(true);
          return;
        }
      }

      setMostrarModalFechamento(true);
    } catch (err) {
      console.error("Erro ao preparar fechamento:", err);
      setMensagem({ tipo: "erro", texto: "Erro ao consultar vendas do dia." });
      setTimeout(() => setMensagem(null), 4000);
    } finally {
      setCarregando(false);
    }
  };

  const fecharCaixa = async () => {
    if (!operadorId || !resumoFechamento) return;
    setProcessando(true);
    try {
      const registro: Record<string, unknown> = {
        operador_id: operadorId,
        operador_nome: operadorNome,
        tipo: "fechamento",
        valor_inicial: ultimaAbertura?.valorInicial || 0,
        valor_final: (ultimaAbertura?.valorInicial || 0) + resumoFechamento.totalDinheiro,
        total_vendas: resumoFechamento.total,
        total_dinheiro: resumoFechamento.totalDinheiro,
        total_credito: resumoFechamento.totalCredito,
        total_debito: resumoFechamento.totalDebito,
        total_pix: resumoFechamento.totalPix,
        total_outros: resumoFechamento.totalOutros,
        quantidade_vendas: resumoFechamento.quantidade,
        observacoes: observacoesFechamento || null,
        data_hora: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("registros_caixa")
        .insert([registro])
        .select()
        .single();

      if (error) throw error;

      const registroFechado: RegistroCaixa = {
        id: data.id,
        operadorId: data.operador_id,
        operadorNome: data.operador_nome,
        tipo: "fechamento",
        valorInicial: data.valor_inicial,
        valorFinal: data.valor_final,
        totalVendas: data.total_vendas,
        totalDinheiro: data.total_dinheiro,
        totalCredito: data.total_credito,
        totalDebito: data.total_debito,
        totalPix: data.total_pix,
        totalOutros: data.total_outros,
        quantidadeVendas: data.quantidade_vendas,
        observacoes: data.observacoes,
        dataHora: data.data_hora,
      };

      setDadosFechamentoFinal(registroFechado);
      setMostrarModalFechamento(false);
      setObservacoesFechamento("");
      setMensagem({ tipo: "sucesso", texto: "Caixa fechado com sucesso!" });
      setTimeout(() => setMensagem(null), 4000);
      await carregarStatusCaixa();

      // Oferecer impressão
      setMostrarModalImpressao(true);
    } catch (err) {
      console.error("Erro ao fechar caixa:", err);
      setMensagem({ tipo: "erro", texto: "Erro ao registrar fechamento de caixa." });
      setTimeout(() => setMensagem(null), 4000);
    } finally {
      setProcessando(false);
    }
  };

  const imprimirRelatorioCaixa = (dados: RegistroCaixa) => {
    const dataHora = dados.dataHora
      ? new Date(dados.dataHora).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");

    const linhas: string[] = [];

    // Cabeçalho
    if (temDadosFiscais && empresaNome) {
      linhas.push("================================");
      linhas.push(empresaNome.toUpperCase());
      if (empresaCnpj) linhas.push(`CNPJ: ${empresaCnpj}`);
      if (empresaEndereco) linhas.push(empresaEndereco);
      if (empresaTelefone) linhas.push(`Tel: ${empresaTelefone}`);
    } else {
      linhas.push("================================");
      linhas.push("    RELATÓRIO DE FECHAMENTO     ");
    }

    linhas.push("================================");
    linhas.push(`Operador: ${dados.operadorNome}`);
    linhas.push(`Data/Hora: ${dataHora}`);
    linhas.push("================================");
    linhas.push("       RESUMO DO CAIXA          ");
    linhas.push("================================");
    linhas.push(`Qtd de Vendas: ${dados.quantidadeVendas ?? 0}`);
    linhas.push(`TOTAL GERAL: R$ ${(dados.totalVendas ?? 0).toFixed(2)}`);
    linhas.push("--------------------------------");
    linhas.push("FORMAS DE PAGAMENTO:");
    if ((dados.totalDinheiro ?? 0) > 0)
      linhas.push(`  Dinheiro:  R$ ${(dados.totalDinheiro ?? 0).toFixed(2)}`);
    if ((dados.totalCredito ?? 0) > 0)
      linhas.push(`  Crédito:   R$ ${(dados.totalCredito ?? 0).toFixed(2)}`);
    if ((dados.totalDebito ?? 0) > 0)
      linhas.push(`  Débito:    R$ ${(dados.totalDebito ?? 0).toFixed(2)}`);
    if ((dados.totalPix ?? 0) > 0)
      linhas.push(`  PIX:       R$ ${(dados.totalPix ?? 0).toFixed(2)}`);
    if ((dados.totalOutros ?? 0) > 0)
      linhas.push(`  Outros:    R$ ${(dados.totalOutros ?? 0).toFixed(2)}`);
    linhas.push("--------------------------------");
    if (dados.valorInicial !== undefined)
      linhas.push(`Troco/Fundo: R$ ${(dados.valorInicial ?? 0).toFixed(2)}`);
    if (dados.valorFinal !== undefined)
      linhas.push(`Caixa Final: R$ ${(dados.valorFinal ?? 0).toFixed(2)}`);
    if (dados.observacoes) {
      linhas.push("--------------------------------");
      linhas.push(`Obs: ${dados.observacoes}`);
    }
    linhas.push("================================");
    linhas.push("     Sistema PDV Operador       ");
    linhas.push("================================");

    const conteudo = linhas.join("\n");

    const janela = window.open("", "_blank", "width=400,height=600");
    if (janela) {
      janela.document.write(`
        <html>
          <head>
            <title>Relatório de Caixa</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 10px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${conteudo}</pre>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      janela.document.close();
    }
  };

  const formatarHora = (iso?: string) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const statusCaixa = ultimoFechamento
    ? "fechado"
    : ultimaAbertura
    ? "aberto"
    : "sem_registro";

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => {
          setExpandido(!expandido);
          if (!expandido && !carregando) {
            carregarStatusCaixa();
          }
        }}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              statusCaixa === "aberto"
                ? "bg-green-400 animate-pulse"
                : statusCaixa === "fechado"
                ? "bg-gray-400"
                : "bg-yellow-400"
            }`}
          />
          <DollarSign className="w-6 h-6 text-green-300" />
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">Abertura / Fechamento de Caixa</h2>
            <p className="text-purple-300 text-sm">
              {statusCaixa === "aberto"
                ? `Caixa aberto às ${formatarHora(ultimaAbertura?.dataHora)}`
                : statusCaixa === "fechado"
                ? `Caixa fechado às ${formatarHora(ultimoFechamento?.dataHora)}`
                : "Sem registro hoje — opcional"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              statusCaixa === "aberto"
                ? "bg-green-500/30 text-green-300"
                : statusCaixa === "fechado"
                ? "bg-gray-500/30 text-gray-300"
                : "bg-yellow-500/30 text-yellow-300"
            }`}
          >
            {statusCaixa === "aberto" ? "ABERTO" : statusCaixa === "fechado" ? "FECHADO" : "OPCIONAL"}
          </span>
          {expandido ? (
            <ChevronUp className="w-5 h-5 text-purple-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-300" />
          )}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="px-6 pb-6 space-y-4">
          {/* Aviso opcional */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
            <p className="text-blue-200 text-sm">
              <strong>Módulo opcional:</strong> O app funciona normalmente sem abertura/fechamento de caixa. Use quando quiser controle de turno ou relatórios diários.
            </p>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${
                mensagem.tipo === "sucesso"
                  ? "bg-green-500/20 border border-green-500 text-green-200"
                  : "bg-red-500/20 border border-red-500 text-red-200"
              }`}
            >
              {mensagem.tipo === "sucesso" ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{mensagem.texto}</span>
            </div>
          )}

          {/* Cards de status */}
          {carregando ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-6 h-6 text-purple-300 animate-spin" />
              <span className="text-purple-300 ml-2">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Abertura */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <LogIn className="w-5 h-5 text-green-300" />
                  <span className="text-white font-semibold">Abertura do Dia</span>
                </div>
                {ultimaAbertura ? (
                  <div className="space-y-1">
                    <p className="text-green-300 text-sm font-bold">
                      Aberto às {formatarHora(ultimaAbertura.dataHora)}
                    </p>
                    <p className="text-purple-200 text-xs">
                      Fundo: R$ {(ultimaAbertura.valorInicial ?? 0).toFixed(2)}
                    </p>
                    {ultimaAbertura.observacoes && (
                      <p className="text-purple-300 text-xs italic">{ultimaAbertura.observacoes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-purple-400 text-sm">Sem abertura registrada hoje</p>
                )}
              </div>

              {/* Fechamento */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <LogOut className="w-5 h-5 text-red-300" />
                  <span className="text-white font-semibold">Fechamento do Dia</span>
                </div>
                {ultimoFechamento ? (
                  <div className="space-y-1">
                    <p className="text-red-300 text-sm font-bold">
                      Fechado às {formatarHora(ultimoFechamento.dataHora)}
                    </p>
                    <p className="text-purple-200 text-xs">
                      Total: R$ {(ultimoFechamento.totalVendas ?? 0).toFixed(2)} •{" "}
                      {ultimoFechamento.quantidadeVendas ?? 0} venda(s)
                    </p>
                    <button
                      onClick={() => {
                        setDadosFechamentoFinal(ultimoFechamento);
                        setMostrarModalImpressao(true);
                      }}
                      className="flex items-center space-x-1 text-xs text-purple-300 hover:text-white transition-colors mt-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Reimprimir relatório</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-purple-400 text-sm">Sem fechamento registrado hoje</p>
                )}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!ultimaAbertura && !ultimoFechamento && (
              <button
                onClick={() => setMostrarModalAbertura(true)}
                disabled={processando || carregando}
                className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span>Abrir Caixa</span>
              </button>
            )}

            {ultimaAbertura && !ultimoFechamento && (
              <>
                <button
                  onClick={prepararFechamento}
                  disabled={processando || carregando}
                  className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
                >
                  {carregando ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                  <span>Fechar Caixa</span>
                </button>
              </>
            )}

            {ultimoFechamento && (
              <div className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 bg-gray-700/50 text-gray-300 rounded-xl font-semibold">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Caixa fechado hoje</span>
              </div>
            )}

            <button
              onClick={carregarStatusCaixa}
              disabled={carregando}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL: ABERTURA DE CAIXA ===== */}
      {mostrarModalAbertura && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <LogIn className="w-6 h-6 text-green-300" />
                </div>
                <h3 className="text-xl font-bold text-white">Abrir Caixa</h3>
              </div>
              <button
                onClick={() => setMostrarModalAbertura(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  <Banknote className="w-4 h-4 inline mr-1" />
                  Valor em caixa (fundo de troco)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorInicialAbertura}
                  onChange={(e) => setValorInicialAbertura(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-semibold mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoesAbertura}
                  onChange={(e) => setObservacoesAbertura(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Ex: Início do turno da manhã..."
                />
              </div>

              <div className="bg-white/5 rounded-lg px-4 py-3 text-sm text-purple-200">
                <p>
                  <Clock className="w-4 h-4 inline mr-1" />
                  Operador: <strong className="text-white">{operadorNome}</strong>
                </p>
                <p className="mt-1">
                  Data: <strong className="text-white">{new Date().toLocaleDateString("pt-BR")}</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalAbertura(false)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={abrirCaixa}
                  disabled={processando}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
                >
                  {processando ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  <span>{processando ? "Registrando..." : "Confirmar Abertura"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: ALERTA CONTINGÊNCIA ===== */}
      {mostrarAlertaContingencia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-yellow-500/40 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-300" />
              </div>
              <h3 className="text-xl font-bold text-white">Notas em Contingência</h3>
            </div>
            <p className="text-purple-200 mb-2">
              Existem <strong className="text-yellow-300">{contingencias} nota(s) NFC-e</strong> em modo de contingência (offline) que ainda não foram enviadas à SEFAZ.
            </p>
            <p className="text-purple-300 text-sm mb-5">
              Recomendamos sincronizar essas notas antes de fechar o caixa para garantir a conformidade fiscal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarAlertaContingencia(false);
                  setMostrarModalFechamento(true);
                }}
                className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold transition-all text-sm"
              >
                Fechar mesmo assim
              </button>
              <button
                onClick={() => setMostrarAlertaContingencia(false)}
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: FECHAMENTO DE CAIXA ===== */}
      {mostrarModalFechamento && resumoFechamento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <LogOut className="w-6 h-6 text-red-300" />
                </div>
                <h3 className="text-xl font-bold text-white">Fechar Caixa</h3>
              </div>
              <button
                onClick={() => setMostrarModalFechamento(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Resumo de vendas */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-300" />
                <span className="text-white font-bold">Resumo do Dia</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Vendas realizadas:</span>
                <span className="text-white font-bold">{resumoFechamento.quantidade}</span>
              </div>

              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span className="text-purple-300 font-bold">TOTAL GERAL:</span>
                <span className="text-green-300 font-bold text-lg">
                  R$ {resumoFechamento.total.toFixed(2)}
                </span>
              </div>

              <div className="pt-1 space-y-1">
                <p className="text-purple-400 text-xs font-semibold uppercase mb-1">Por forma de pagamento</p>
                {resumoFechamento.totalDinheiro > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300 flex items-center space-x-1">
                      <Banknote className="w-3 h-3" /><span>Dinheiro</span>
                    </span>
                    <span className="text-white">R$ {resumoFechamento.totalDinheiro.toFixed(2)}</span>
                  </div>
                )}
                {resumoFechamento.totalCredito > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300 flex items-center space-x-1">
                      <CreditCard className="w-3 h-3" /><span>Crédito</span>
                    </span>
                    <span className="text-white">R$ {resumoFechamento.totalCredito.toFixed(2)}</span>
                  </div>
                )}
                {resumoFechamento.totalDebito > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300 flex items-center space-x-1">
                      <CreditCard className="w-3 h-3" /><span>Débito</span>
                    </span>
                    <span className="text-white">R$ {resumoFechamento.totalDebito.toFixed(2)}</span>
                  </div>
                )}
                {resumoFechamento.totalPix > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300 flex items-center space-x-1">
                      <Smartphone className="w-3 h-3" /><span>PIX</span>
                    </span>
                    <span className="text-white">R$ {resumoFechamento.totalPix.toFixed(2)}</span>
                  </div>
                )}
                {resumoFechamento.totalOutros > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300 flex items-center space-x-1">
                      <Wallet className="w-3 h-3" /><span>Outros</span>
                    </span>
                    <span className="text-white">R$ {resumoFechamento.totalOutros.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {ultimaAbertura && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Fundo de caixa:</span>
                    <span className="text-white">R$ {(ultimaAbertura.valorInicial ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-purple-300 font-bold">Caixa final (dinheiro):</span>
                    <span className="text-green-300 font-bold">
                      R$ {((ultimaAbertura.valorInicial ?? 0) + resumoFechamento.totalDinheiro).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-purple-200 text-sm font-semibold mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={observacoesFechamento}
                onChange={(e) => setObservacoesFechamento(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Ex: Fim do turno, tudo conferido..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalFechamento(false)}
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={fecharCaixa}
                disabled={processando}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
              >
                {processando ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
                <span>{processando ? "Fechando..." : "Confirmar Fechamento"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: IMPRIMIR RELATÓRIO ===== */}
      {mostrarModalImpressao && dadosFechamentoFinal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/20 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-5">
              <div className="bg-green-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
              <h3 className="text-xl font-bold text-white">Caixa Fechado!</h3>
              <p className="text-purple-300 text-sm mt-1">
                Total: R$ {(dadosFechamentoFinal.totalVendas ?? 0).toFixed(2)} •{" "}
                {dadosFechamentoFinal.quantidadeVendas ?? 0} venda(s)
              </p>
            </div>

            <p className="text-purple-200 text-sm text-center mb-4">
              Deseja imprimir o relatório de fechamento?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  imprimirRelatorioCaixa(dadosFechamentoFinal);
                  setMostrarModalImpressao(false);
                  setDadosFechamentoFinal(null);
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir na Térmica</span>
              </button>

              <button
                onClick={() => {
                  setMostrarModalImpressao(false);
                  setDadosFechamentoFinal(null);
                }}
                className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
              >
                Não Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
