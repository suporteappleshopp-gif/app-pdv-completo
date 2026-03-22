"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GerenciadorAssinatura } from "@/lib/assinatura";
import { Produto, Loja, NotaFiscal, ItemNotaFiscal, MovimentacaoEstoque, ProdutoEstoque } from "@/lib/types";
import {
  ArrowLeft,
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Barcode,
  DollarSign,
  TrendingDown,
  Lock,
  Camera,
  Scale,
  FileText,
  Upload,
  Building2,
  ArrowRightLeft,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react";

// ---- Parser de XML de NF-e ----
function parseNFe(xmlString: string): NotaFiscal | null {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");

    const getText = (selector: string, parent?: Element | Document): string => {
      const el = (parent || xml).querySelector(selector);
      return el?.textContent?.trim() || "";
    };

    const getNum = (selector: string, parent?: Element | Document): number =>
      parseFloat(getText(selector, parent)) || 0;

    const ide = xml.querySelector("ide");
    const emit = xml.querySelector("emit");
    const total = xml.querySelector("ICMSTot");
    const transp = xml.querySelector("transp");

    const nNF = getText("nNF", ide || undefined);
    const serie = getText("serie", ide || undefined);
    const dhEmi = getText("dhEmi", ide || undefined) || getText("dEmi", ide || undefined);
    const chave = getText("chNFe") || xml.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";

    const cnpjEmit = getText("CNPJ", emit || undefined);
    const nomeEmit = getText("xNome", emit || undefined) || getText("xFant", emit || undefined);

    const vNF = getNum("vNF", total || undefined);
    const vFrete = getNum("vFrete", total || undefined);
    const vIPI = getNum("vIPI", total || undefined);
    const vICMS = getNum("vICMS", total || undefined);
    const vPIS = getNum("vPIS", total || undefined);
    const vCOFINS = getNum("vCOFINS", total || undefined);
    const vDesc = getNum("vDesc", total || undefined);
    const vOutro = getNum("vOutro", total || undefined);

    const detNodes = xml.querySelectorAll("det");
    const itens: ItemNotaFiscal[] = [];
    let somaValorItens = 0;

    detNodes.forEach((det) => {
      const prod = det.querySelector("prod");
      if (!prod) return;
      const imposto = det.querySelector("imposto");
      const ipiNode = imposto?.querySelector("IPI");

      const cProd = getText("cProd", prod);
      const xProd = getText("xProd", prod);
      const uCom = getText("uCom", prod) || "UN";
      const qCom = getNum("qCom", prod);
      const vUnCom = getNum("vUnCom", prod);
      const vProd = getNum("vProd", prod);
      const vIPIItem = ipiNode ? getNum("vIPI", ipiNode) : 0;

      somaValorItens += vProd;

      itens.push({
        codigo_produto: cProd,
        descricao: xProd,
        unidade: uCom,
        quantidade: qCom,
        valor_unitario: vUnCom,
        valor_total: vProd,
        valor_ipi: vIPIItem,
        valor_frete_rateado: 0,
        custo_unitario_calculado: 0,
      });
    });

    // Ratear frete proporcionalmente entre os itens
    const totalFrete = vFrete;
    const totalExtras = vIPI + vOutro;
    if (somaValorItens > 0 && itens.length > 0) {
      itens.forEach((item) => {
        const proporcao = item.valor_total / somaValorItens;
        item.valor_frete_rateado = totalFrete * proporcao;
        const custoBase = item.valor_total + item.valor_ipi + item.valor_frete_rateado + totalExtras * proporcao;
        item.custo_unitario_calculado = item.quantidade > 0 ? custoBase / item.quantidade : item.valor_unitario;
      });
    }

    return {
      numero_nota: nNF,
      serie,
      chave_acesso: chave,
      cnpj_emitente: cnpjEmit,
      nome_emitente: nomeEmit,
      data_emissao: dhEmi,
      valor_total: vNF,
      valor_frete: vFrete,
      valor_ipi: vIPI,
      valor_icms: vICMS,
      valor_pis: vPIS,
      valor_cofins: vCOFINS,
      valor_desconto: vDesc,
      valor_outros: vOutro,
      xml_content: xmlString,
      status: "processada",
      itens,
    };
  } catch (err) {
    console.error("Erro ao parsear XML:", err);
    return null;
  }
}

type Aba = "produtos" | "xml" | "transferencia" | "configuracoes";

export default function EstoquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<Aba>("produtos");
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaSelecionada, setLojaSelecionada] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [podeUsarApp, setPodeUsarApp] = useState(false);
  const [usuarioSemMensalidade, setUsuarioSemMensalidade] = useState(false);
  const [mostrarBloqueio, setMostrarBloqueio] = useState(false);

  // Form produto
  const [produtoForm, setProdutoForm] = useState<ProdutoEstoque>({
    id: "", nome: "", codigoBarras: "", preco: 0, estoque: 0, estoqueMinimo: 0,
    categoria: "", vendaPorKg: false, margem_lucro: 0, preco_venda: 0,
  });
  const [precoFormatado, setPrecoFormatado] = useState("");
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);

  // XML
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [notaParsed, setNotaParsed] = useState<NotaFiscal | null>(null);
  const [processandoXML, setProcessandoXML] = useState(false);
  const [mostrarPreviewNota, setMostrarPreviewNota] = useState(false);

  // Entrada Manual
  const [modoEntrada, setModoEntrada] = useState<"xml" | "manual">("xml");
  const [entradaManualForm, setEntradaManualForm] = useState({
    numeroNota: "",
    nomeProduto: "",
    codigoBarras: "",
    quantidade: 0,
    precoCusto: 0,
    precoVenda: 0,
  });
  const [salvandoManual, setSalvandoManual] = useState(false);

  // Transferência
  const [produtoTransf, setProdutoTransf] = useState("");
  const [qtdTransf, setQtdTransf] = useState(0);
  const [lojaOrigemTransf, setLojaOrigemTransf] = useState("");
  const [lojaDestinoTransf, setLojaDestinoTransf] = useState("");
  const [motivoTransf, setMotivoTransf] = useState("");
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const resultado = await GerenciadorAssinatura.verificarAcesso(operador.id);
      setPodeUsarApp(resultado.podeUsar);
      if (!operador.formaPagamento && operador.ativo && !operador.suspenso) {
        setUsuarioSemMensalidade(true);
        setPodeUsarApp(true);
      }

      await Promise.all([
        carregarProdutos(operador.id),
        carregarLojas(operador.id),
        carregarMovimentacoes(operador.id),
      ]);
    } catch (err) {
      console.error(err);
      setErro("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const carregarProdutos = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("produtos").select("*").eq("user_id", uid).order("nome");
    setProdutos((data || []).map((p: any) => ({
      id: p.id, nome: p.nome, codigoBarras: p.codigo_barras,
      preco: p.preco, estoque: p.estoque, estoqueMinimo: p.estoque_minimo,
      vendaPorKg: p.venda_por_kg ?? false, categoria: p.categoria,
      descricao: p.descricao, loja_id: p.loja_id,
      custo_unitario: p.custo_unitario ?? 0,
      ultimo_custo_compra: p.ultimo_custo_compra ?? 0,
      custo_medio: p.custo_medio ?? 0,
      margem_lucro: p.margem_lucro ?? 0,
      preco_venda: p.preco_venda ?? 0,
    })));
  };

  const carregarLojas = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("lojas").select("*").eq("user_id", uid).eq("ativo", true);
    setLojas(data || []);
    if (!lojaSelecionada && data && data.length > 0) {
      setLojaSelecionada(data[0].id);
    }
  };

  const carregarMovimentacoes = async (uid: string) => {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("movimentacoes_estoque").select("*")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
    setMovimentacoes(data || []);
  };

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg);
    setTimeout(() => setSucesso(""), 4000);
  };
  const mostrarErro = (msg: string) => {
    setErro(msg);
    setTimeout(() => setErro(""), 4000);
  };

  // ---- UPLOAD XML ----
  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXmlFile(file);
    const text = await file.text();
    const nota = parseNFe(text);
    if (!nota) { mostrarErro("XML inválido ou formato não reconhecido"); return; }
    setNotaParsed(nota);
    setMostrarPreviewNota(true);
  };

  const processarNota = async () => {
    if (!notaParsed || !operadorId) return;
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); return; }

    try {
      setProcessandoXML(true);
      const { supabase } = await import("@/lib/supabase");

      // 1. Salvar nota fiscal
      const { data: notaSalva, error: errNota } = await supabase
        .from("notas_fiscais")
        .insert({
          user_id: operadorId,
          loja_id: lojaSelecionada || null,
          numero_nota: notaParsed.numero_nota,
          serie: notaParsed.serie,
          chave_acesso: notaParsed.chave_acesso,
          cnpj_emitente: notaParsed.cnpj_emitente,
          nome_emitente: notaParsed.nome_emitente,
          data_emissao: notaParsed.data_emissao,
          valor_total: notaParsed.valor_total,
          valor_frete: notaParsed.valor_frete,
          valor_ipi: notaParsed.valor_ipi,
          valor_icms: notaParsed.valor_icms,
          valor_pis: notaParsed.valor_pis,
          valor_cofins: notaParsed.valor_cofins,
          valor_desconto: notaParsed.valor_desconto,
          valor_outros: notaParsed.valor_outros,
          xml_content: notaParsed.xml_content,
          status: "processada",
        })
        .select().single();

      if (errNota) { mostrarErro("Erro ao salvar nota: " + errNota.message); return; }

      const notaId = notaSalva.id;
      const itens = notaParsed.itens || [];
      let produtosNovos = 0;
      let produtosAtualizados = 0;

      // 2. Processar cada item da nota
      for (const item of itens) {
        // Salvar item da nota
        await supabase.from("itens_nota_fiscal").insert({
          nota_fiscal_id: notaId,
          user_id: operadorId,
          loja_id: lojaSelecionada || null,
          codigo_produto: item.codigo_produto,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          valor_ipi: item.valor_ipi,
          valor_frete_rateado: item.valor_frete_rateado,
          custo_unitario_calculado: item.custo_unitario_calculado,
        });

        // Verificar se produto existe pelo código
        const { data: prodExistente } = await supabase
          .from("produtos").select("*")
          .eq("user_id", operadorId)
          .eq("codigo_barras", item.codigo_produto)
          .maybeSingle();

        if (prodExistente) {
          // Atualizar estoque e custo médio
          const estoqueAtual = prodExistente.estoque || 0;
          const custoAtual = prodExistente.custo_medio || 0;
          const qtdNova = item.quantidade;
          const custoNovo = item.custo_unitario_calculado;

          // Fórmula custo médio ponderado
          const novoEstoque = estoqueAtual + qtdNova;
          const novoCustoMedio = novoEstoque > 0
            ? (estoqueAtual * custoAtual + qtdNova * custoNovo) / novoEstoque
            : custoNovo;

          await supabase.from("produtos").update({
            estoque: novoEstoque,
            custo_medio: novoCustoMedio,
            ultimo_custo_compra: custoNovo,
          }).eq("id", prodExistente.id);

          // Registrar movimentação
          await supabase.from("movimentacoes_estoque").insert({
            user_id: operadorId,
            loja_destino_id: lojaSelecionada || null,
            produto_id: prodExistente.id,
            quantidade: qtdNova,
            tipo: "entrada",
            motivo: `NF ${notaParsed.numero_nota} - ${notaParsed.nome_emitente}`,
            operador_nome: operadorNome,
            nota_fiscal_id: notaId,
          });

          produtosAtualizados++;
        } else {
          // Criar novo produto
          const { data: novoProd } = await supabase.from("produtos").insert({
            user_id: operadorId,
            loja_id: lojaSelecionada || null,
            nome: item.descricao,
            codigo_barras: item.codigo_produto,
            preco: item.valor_unitario,
            preco_venda: item.valor_unitario,
            estoque: item.quantidade,
            estoque_minimo: 0,
            venda_por_kg: false,
            custo_unitario: item.custo_unitario_calculado,
            custo_medio: item.custo_unitario_calculado,
            ultimo_custo_compra: item.custo_unitario_calculado,
            margem_lucro: 0,
          }).select().single();

          if (novoProd) {
            await supabase.from("movimentacoes_estoque").insert({
              user_id: operadorId,
              loja_destino_id: lojaSelecionada || null,
              produto_id: novoProd.id,
              quantidade: item.quantidade,
              tipo: "entrada",
              motivo: `NF ${notaParsed.numero_nota} - ${notaParsed.nome_emitente} (produto novo)`,
              operador_nome: operadorNome,
              nota_fiscal_id: notaId,
            });
          }
          produtosNovos++;
        }
      }

      // 3. Gerar contas a pagar automaticamente no financeiro
      // Calcular vencimento (30 dias da emissão como padrão)
      const dataEmissao = notaParsed.data_emissao
        ? new Date(notaParsed.data_emissao)
        : new Date();
      const dataVencimento = new Date(dataEmissao);
      dataVencimento.setDate(dataVencimento.getDate() + 30);

      await supabase.from("contas_pagar").insert({
        user_id: operadorId,
        loja_id: lojaSelecionada || null,
        nota_fiscal_id: notaId,
        descricao: `NF ${notaParsed.numero_nota} - ${notaParsed.nome_emitente || "Fornecedor"}`,
        fornecedor: notaParsed.nome_emitente,
        valor: notaParsed.valor_total,
        data_vencimento: dataVencimento.toISOString().split("T")[0],
        status: "a_pagar",
        parcela_numero: 1,
        total_parcelas: 1,
      });

      mostrarSucesso(
        `Nota processada! ${produtosNovos} produto(s) cadastrado(s), ${produtosAtualizados} atualizado(s). Conta a pagar gerada.`
      );

      setNotaParsed(null);
      setXmlFile(null);
      setMostrarPreviewNota(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await carregarProdutos(operadorId);
      await carregarMovimentacoes(operadorId);
    } catch (err: any) {
      mostrarErro("Erro ao processar nota: " + err.message);
    } finally {
      setProcessandoXML(false);
    }
  };

  // ---- ENTRADA MANUAL ----
  const processarEntradaManual = async () => {
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); return; }
    const { nomeProduto, codigoBarras, quantidade, precoCusto, precoVenda, numeroNota } = entradaManualForm;
    if (!nomeProduto || !codigoBarras) { mostrarErro("Preencha Nome do Produto e Código de Barras"); return; }
    if (quantidade <= 0) { mostrarErro("Quantidade deve ser maior que zero"); return; }
    if (precoCusto <= 0) { mostrarErro("Preço de Custo deve ser maior que zero"); return; }
    if (precoVenda <= 0) { mostrarErro("Preço de Venda deve ser maior que zero"); return; }

    try {
      setSalvandoManual(true);
      const { supabase } = await import("@/lib/supabase");

      // 1. Salvar nota fiscal (entrada manual)
      const { data: notaSalva, error: errNota } = await supabase
        .from("notas_fiscais")
        .insert({
          user_id: operadorId,
          loja_id: lojaSelecionada || null,
          numero_nota: numeroNota || "MANUAL",
          serie: "0",
          chave_acesso: "",
          cnpj_emitente: "",
          nome_emitente: "Entrada Manual",
          data_emissao: new Date().toISOString(),
          valor_total: precoCusto * quantidade,
          valor_frete: 0,
          valor_ipi: 0,
          valor_icms: 0,
          valor_pis: 0,
          valor_cofins: 0,
          valor_desconto: 0,
          valor_outros: 0,
          xml_content: "",
          status: "processada",
        })
        .select().single();

      if (errNota) { mostrarErro("Erro ao salvar entrada: " + errNota.message); return; }

      const notaId = notaSalva.id;

      // 2. Salvar item da nota
      await supabase.from("itens_nota_fiscal").insert({
        nota_fiscal_id: notaId,
        user_id: operadorId,
        loja_id: lojaSelecionada || null,
        codigo_produto: codigoBarras,
        descricao: nomeProduto,
        unidade: "UN",
        quantidade: quantidade,
        valor_unitario: precoCusto,
        valor_total: precoCusto * quantidade,
        valor_ipi: 0,
        valor_frete_rateado: 0,
        custo_unitario_calculado: precoCusto,
      });

      // 3. Verificar se produto já existe pelo código de barras
      const { data: prodExistente } = await supabase
        .from("produtos").select("*")
        .eq("user_id", operadorId)
        .eq("codigo_barras", codigoBarras)
        .maybeSingle();

      if (prodExistente) {
        // Atualizar estoque e custo médio (mesma fórmula do XML)
        const estoqueAtual = prodExistente.estoque || 0;
        const custoAtual = prodExistente.custo_medio || 0;
        const novoEstoque = estoqueAtual + quantidade;
        const novoCustoMedio = novoEstoque > 0
          ? (estoqueAtual * custoAtual + quantidade * precoCusto) / novoEstoque
          : precoCusto;

        await supabase.from("produtos").update({
          estoque: novoEstoque,
          custo_medio: novoCustoMedio,
          ultimo_custo_compra: precoCusto,
          preco_venda: precoVenda,
        }).eq("id", prodExistente.id);

        // Registrar movimentação
        await supabase.from("movimentacoes_estoque").insert({
          user_id: operadorId,
          loja_destino_id: lojaSelecionada || null,
          produto_id: prodExistente.id,
          quantidade: quantidade,
          tipo: "entrada",
          motivo: `Entrada Manual${numeroNota ? ` - NF ${numeroNota}` : ""}`,
          operador_nome: operadorNome,
          nota_fiscal_id: notaId,
        });

        mostrarSucesso(`Estoque atualizado! +${quantidade} unidades somadas ao produto existente.`);
      } else {
        // Criar novo produto
        const { data: novoProd } = await supabase.from("produtos").insert({
          user_id: operadorId,
          loja_id: lojaSelecionada || null,
          nome: nomeProduto,
          codigo_barras: codigoBarras,
          preco: precoVenda,
          preco_venda: precoVenda,
          estoque: quantidade,
          estoque_minimo: 0,
          venda_por_kg: false,
          custo_unitario: precoCusto,
          custo_medio: precoCusto,
          ultimo_custo_compra: precoCusto,
          margem_lucro: 0,
        }).select().single();

        if (novoProd) {
          await supabase.from("movimentacoes_estoque").insert({
            user_id: operadorId,
            loja_destino_id: lojaSelecionada || null,
            produto_id: novoProd.id,
            quantidade: quantidade,
            tipo: "entrada",
            motivo: `Entrada Manual${numeroNota ? ` - NF ${numeroNota}` : ""} (produto novo)`,
            operador_nome: operadorNome,
            nota_fiscal_id: notaId,
          });
        }

        mostrarSucesso(`Produto cadastrado e estoque criado com ${quantidade} unidade(s)!`);
      }

      // Limpar formulário
      setEntradaManualForm({ numeroNota: "", nomeProduto: "", codigoBarras: "", quantidade: 0, precoCusto: 0, precoVenda: 0 });
      await carregarProdutos(operadorId);
      await carregarMovimentacoes(operadorId);
    } catch (err: any) {
      mostrarErro("Erro ao salvar entrada manual: " + err.message);
    } finally {
      setSalvandoManual(false);
    }
  };

  // ---- TRANSFERÊNCIA ----
  const realizarTransferencia = async () => {
    if (!produtoTransf || qtdTransf <= 0 || !lojaOrigemTransf || !lojaDestinoTransf) {
      mostrarErro("Preencha todos os campos da transferência");
      return;
    }
    if (lojaOrigemTransf === lojaDestinoTransf) {
      mostrarErro("Origem e destino devem ser diferentes");
      return;
    }
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("movimentacoes_estoque").insert({
        user_id: operadorId,
        loja_origem_id: lojaOrigemTransf,
        loja_destino_id: lojaDestinoTransf,
        produto_id: produtoTransf,
        quantidade: qtdTransf,
        tipo: "transferencia",
        motivo: motivoTransf || "Transferência entre lojas",
        operador_nome: operadorNome,
      });

      mostrarSucesso("Transferência registrada com sucesso!");
      setProdutoTransf(""); setQtdTransf(0);
      setLojaOrigemTransf(""); setLojaDestinoTransf(""); setMotivoTransf("");
      await carregarMovimentacoes(operadorId);
    } catch (err: any) {
      mostrarErro("Erro ao transferir: " + err.message);
    }
  };

  // ---- CRUD PRODUTO ----
  const abrirModalNovo = () => {
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); return; }
    setProdutoForm({ id: "", nome: "", codigoBarras: "", preco: 0, estoque: 0, estoqueMinimo: 0, categoria: "", vendaPorKg: false, margem_lucro: 0, preco_venda: 0 });
    setPrecoFormatado(""); setModoEdicao(false); setShowModal(true);
  };

  const abrirModalEdicao = (produto: ProdutoEstoque) => {
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); return; }
    setProdutoForm(produto);
    setPrecoFormatado(produto.preco.toFixed(2).replace(".", ","));
    setModoEdicao(true); setShowModal(true);
  };

  const handlePrecoChange = (valor: string) => {
    const limpo = valor.replace(/[^\d,]/g, "");
    const partes = limpo.split(",");
    let fmt = partes[0];
    if (partes.length > 1) fmt += "," + partes[1].slice(0, 2);
    setPrecoFormatado(fmt);
    setProdutoForm({ ...produtoForm, preco: parseFloat(fmt.replace(",", ".")) || 0 });
  };

  const salvarProduto = async () => {
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); setShowModal(false); return; }
    if (!produtoForm.nome || !produtoForm.codigoBarras) { mostrarErro("Preencha nome e código de barras"); return; }
    if (produtoForm.preco <= 0) { mostrarErro("Preço deve ser maior que zero"); return; }

    try {
      const { supabase } = await import("@/lib/supabase");
      const payload = {
        user_id: operadorId,
        nome: produtoForm.nome,
        codigo_barras: produtoForm.codigoBarras,
        preco: produtoForm.preco,
        estoque: produtoForm.estoque,
        estoque_minimo: produtoForm.estoqueMinimo,
        venda_por_kg: produtoForm.vendaPorKg ?? false,
        categoria: produtoForm.categoria,
        descricao: produtoForm.descricao,
        margem_lucro: produtoForm.margem_lucro ?? 0,
        preco_venda: produtoForm.preco_venda ?? produtoForm.preco,
        loja_id: lojaSelecionada || null,
      };

      if (modoEdicao && produtoForm.id) {
        await supabase.from("produtos").update(payload).eq("id", produtoForm.id);
        mostrarSucesso("Produto atualizado!");
      } else {
        await supabase.from("produtos").insert(payload);
        mostrarSucesso("Produto adicionado!");
      }
      setShowModal(false);
      await carregarProdutos(operadorId);
    } catch (err: any) {
      mostrarErro("Erro ao salvar: " + err.message);
    }
  };

  const excluirProduto = async (id: string) => {
    if (!podeUsarApp && !usuarioSemMensalidade) { setMostrarBloqueio(true); return; }
    if (!confirm("Excluir este produto?")) return;
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("produtos").delete().eq("id", id);
    mostrarSucesso("Produto excluído!");
    await carregarProdutos(operadorId);
  };

  const salvarConfiguracaoProduto = async (prod: ProdutoEstoque) => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("produtos").update({
      margem_lucro: prod.margem_lucro,
      preco_venda: prod.preco_venda,
    }).eq("id", prod.id);
    mostrarSucesso("Configurações salvas!");
    await carregarProdutos(operadorId);
  };

  const produtosFiltrados = produtos.filter((p) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return p.nome.toLowerCase().includes(b) || p.codigoBarras.includes(busca) || p.categoria?.toLowerCase().includes(b);
  });

  const produtosEstoqueBaixo = produtos.filter((p) => p.estoque <= p.estoqueMinimo);
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + p.preco * p.estoque, 0);

  const BarcodeScanner = ({ onScanSuccess, onClose, isActive }: { onScanSuccess: (c: string) => void; onClose: () => void; isActive: boolean }) => {
    const scannerRef = useRef<any>(null);
    useEffect(() => {
      if (!isActive) return;
      const init = async () => {
        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const sc = new Html5Qrcode("barcode-reader");
          scannerRef.current = sc;
          await sc.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 150 }, aspectRatio: 2.0 },
            (decoded) => { onScanSuccess(decoded); sc.stop().catch(() => {}); }, () => {});
        } catch { onClose(); }
      };
      init();
      return () => { scannerRef.current?.stop().catch(() => {}); };
    }, [isActive]);
    return (
      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"><div id="barcode-reader" className="w-full" /></div>
        <p className="text-purple-200 text-center text-sm">Posicione o código de barras na frente da câmera</p>
        <button onClick={onClose} className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold">Cancelar</button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Carregando estoque...</p>
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
                <Package className="w-7 h-7" /><span>Gestão de Estoque</span>
              </h1>
              <p className="text-purple-200 text-sm">Controle de produtos, XML e multiloja</p>
            </div>
            <div className="flex items-center gap-2">
              {lojas.length > 0 && (
                <select value={lojaSelecionada} onChange={e => setLojaSelecionada(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm">
                  <option value="">Todas as lojas</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              )}
              <button onClick={abrirModalNovo} className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                <Plus className="w-5 h-5" /><span>Novo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {([
              { id: "produtos", label: "Produtos", icon: Package },
              { id: "xml", label: "Importar XML", icon: Upload },
              { id: "transferencia", label: "Transferências", icon: ArrowRightLeft },
              { id: "configuracoes", label: "Configurações", icon: Settings },
            ] as { id: Aba; label: string; icon: any }[]).map(aba => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${abaAtiva === aba.id ? "border-purple-400 text-white" : "border-transparent text-purple-300 hover:text-white"}`}>
                <aba.icon className="w-4 h-4" /><span>{aba.label}</span>
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

        {/* ===== ABA PRODUTOS ===== */}
        {abaAtiva === "produtos" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-lg">{produtos.length}</span>
                </div>
                <h3 className="text-white text-lg font-bold">Total de Produtos</h3>
                <p className="text-blue-100 text-sm">Cadastrados no sistema</p>
              </div>
              <div className="bg-green-600/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-sm">R$ {valorTotalEstoque.toFixed(2).replace(".", ",")}</span>
                </div>
                <h3 className="text-white text-lg font-bold">Valor do Estoque</h3>
                <p className="text-green-100 text-sm">Valor total em produtos</p>
              </div>
              <div className="bg-orange-600/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-10 h-10 text-white/80" />
                  <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-lg">{produtosEstoqueBaixo.length}</span>
                </div>
                <h3 className="text-white text-lg font-bold">Estoque Baixo</h3>
                <p className="text-orange-100 text-sm">Abaixo do mínimo</p>
              </div>
            </div>

            {produtosEstoqueBaixo.length > 0 && (
              <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-6 h-6 text-orange-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold mb-1">⚠️ {produtosEstoqueBaixo.length} produto(s) com estoque baixo</p>
                    {produtosEstoqueBaixo.slice(0, 3).map(p => (
                      <p key={p.id} className="text-orange-200 text-sm">• {p.nome} — Estoque: {p.estoque} (Mín: {p.estoqueMinimo})</p>
                    ))}
                    {produtosEstoqueBaixo.length > 3 && <p className="text-orange-200 text-sm">... e mais {produtosEstoqueBaixo.length - 3}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-indigo-600/80 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center"><Package className="w-6 h-6 mr-2" />Produtos em Estoque</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                    className="pl-9 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                {produtosFiltrados.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">{busca ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-indigo-700/80">
                      <tr>
                        {["Produto", "Código", "Categoria", "Tipo", "Preço Venda", "Custo Médio", "Estoque", "Ações"].map(h => (
                          <th key={h} className="text-left text-purple-200 text-xs font-semibold py-2 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {produtosFiltrados.map((p) => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-3 text-white font-medium text-sm">{p.nome}</td>
                          <td className="py-3 px-3 text-purple-200 text-xs">{p.codigoBarras}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">{p.categoria || "—"}</span>
                          </td>
                          <td className="py-3 px-3">
                            {p.vendaPorKg ? (
                              <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full">KG</span>
                            ) : (
                              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">Un</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-white text-sm font-bold">R$ {(p.preco_venda || p.preco).toFixed(2).replace(".", ",")}</td>
                          <td className="py-3 px-3 text-yellow-300 text-sm">
                            {p.custo_medio ? `R$ ${p.custo_medio.toFixed(4).replace(".", ",")}` : "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.estoque <= p.estoqueMinimo ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
                              {p.estoque}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex space-x-1">
                              <button onClick={() => abrirModalEdicao(p)} className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => excluirProduto(p.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== ABA XML ===== */}
        {abaAtiva === "xml" && (
          <div className="space-y-6">
            {/* Seletor de modo de entrada */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-2 flex gap-2">
              <button
                onClick={() => setModoEntrada("xml")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${modoEntrada === "xml" ? "bg-purple-600 text-white shadow-lg" : "text-purple-300 hover:text-white hover:bg-white/10"}`}
              >
                <Upload className="w-5 h-5" />Importar XML
              </button>
              <button
                onClick={() => setModoEntrada("manual")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${modoEntrada === "manual" ? "bg-green-600 text-white shadow-lg" : "text-purple-300 hover:text-white hover:bg-white/10"}`}
              >
                <Plus className="w-5 h-5" />Entrada Manual
              </button>
            </div>

            {/* Formulário de Entrada Manual */}
            {modoEntrada === "manual" && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center"><Package className="w-6 h-6 mr-2" />Entrada Manual de Produto</h2>
                <p className="text-purple-200 text-sm mb-6">Informe os dados do produto manualmente. Se o código de barras já existir, o estoque será somado. Caso contrário, um novo produto será criado.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Número da Nota (opcional)</label>
                    <input
                      type="text"
                      value={entradaManualForm.numeroNota}
                      onChange={e => setEntradaManualForm({...entradaManualForm, numeroNota: e.target.value})}
                      placeholder="Ex: 001234"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Código de Barras / EAN *</label>
                    <input
                      type="text"
                      value={entradaManualForm.codigoBarras}
                      onChange={e => setEntradaManualForm({...entradaManualForm, codigoBarras: e.target.value})}
                      placeholder="Ex: 7891234567890"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Nome do Produto *</label>
                    <input
                      type="text"
                      value={entradaManualForm.nomeProduto}
                      onChange={e => setEntradaManualForm({...entradaManualForm, nomeProduto: e.target.value})}
                      placeholder="Ex: Coca-Cola 2L"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Quantidade *</label>
                    <input
                      type="number"
                      value={entradaManualForm.quantidade || ""}
                      onChange={e => setEntradaManualForm({...entradaManualForm, quantidade: parseInt(e.target.value) || 0})}
                      placeholder="0"
                      min={1}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Preço de Custo (R$) *</label>
                    <input
                      type="number"
                      value={entradaManualForm.precoCusto || ""}
                      onChange={e => setEntradaManualForm({...entradaManualForm, precoCusto: parseFloat(e.target.value) || 0})}
                      placeholder="0,00"
                      min={0}
                      step="0.01"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      value={entradaManualForm.precoVenda || ""}
                      onChange={e => setEntradaManualForm({...entradaManualForm, precoVenda: parseFloat(e.target.value) || 0})}
                      placeholder="0,00"
                      min={0}
                      step="0.01"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <button
                  onClick={processarEntradaManual}
                  disabled={salvandoManual}
                  className="mt-6 w-full px-4 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-lg"
                >
                  {salvandoManual ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="w-5 h-5" />Salvar Entrada Manual</>
                  )}
                </button>
              </div>
            )}

            {/* Painel de Importar XML */}
            {modoEntrada === "xml" && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center"><Upload className="w-6 h-6 mr-2" />Importar XML de NF-e</h2>
              <p className="text-purple-200 text-sm mb-6">Suba o arquivo XML da nota fiscal. O sistema irá cadastrar produtos novos automaticamente, somar ao estoque existente e calcular o custo médio com rateio de frete/impostos. Uma conta a pagar será gerada automaticamente no financeiro.</p>

              <div
                className="border-2 border-dashed border-purple-400/50 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-500/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-1">Clique para selecionar o arquivo XML</p>
                <p className="text-purple-300 text-sm">Formato: NF-e padrão SEFAZ (.xml)</p>
                {xmlFile && <p className="mt-3 text-green-300 font-medium">✅ {xmlFile.name}</p>}
              </div>
              <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleXmlUpload} />
            </div>
            )}

            {/* Preview da nota */}
            {notaParsed && mostrarPreviewNota && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-green-600/80 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Nota Fiscal Lida com Sucesso</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Nota / Série</p>
                      <p className="text-white font-bold">{notaParsed.numero_nota} / {notaParsed.serie}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Fornecedor</p>
                      <p className="text-white font-bold text-sm">{notaParsed.nome_emitente || "—"}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Valor Total</p>
                      <p className="text-green-300 font-bold">R$ {notaParsed.valor_total.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Itens</p>
                      <p className="text-white font-bold">{notaParsed.itens?.length || 0} produtos</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Frete</p>
                      <p className="text-white">R$ {notaParsed.valor_frete.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">IPI</p>
                      <p className="text-white">R$ {notaParsed.valor_ipi.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">ICMS</p>
                      <p className="text-white">R$ {notaParsed.valor_icms.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-purple-300 text-xs">Desconto</p>
                      <p className="text-white">R$ {notaParsed.valor_desconto.toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>

                  {/* Tabela de itens */}
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-800/80">
                        <tr>
                          {["Código", "Descrição", "Un", "Qtd", "Vl. Unit.", "Vl. Total", "Custo c/ Rateio"].map(h => (
                            <th key={h} className="text-left text-purple-200 text-xs py-2 px-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {notaParsed.itens?.map((item, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-2 px-2 text-purple-300 text-xs">{item.codigo_produto}</td>
                            <td className="py-2 px-2 text-white text-xs">{item.descricao}</td>
                            <td className="py-2 px-2 text-white text-xs">{item.unidade}</td>
                            <td className="py-2 px-2 text-white text-xs">{item.quantidade}</td>
                            <td className="py-2 px-2 text-white text-xs">R$ {item.valor_unitario.toFixed(4).replace(".", ",")}</td>
                            <td className="py-2 px-2 text-white text-xs">R$ {item.valor_total.toFixed(2).replace(".", ",")}</td>
                            <td className="py-2 px-2 text-yellow-300 text-xs font-bold">R$ {item.custo_unitario_calculado.toFixed(4).replace(".", ",")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setNotaParsed(null); setMostrarPreviewNota(false); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold">
                      Cancelar
                    </button>
                    <button onClick={processarNota} disabled={processandoXML}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                      {processandoXML ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processando...</>
                      ) : (
                        <><CheckCircle className="w-5 h-5" />Confirmar e Processar Nota</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ABA TRANSFERÊNCIA ===== */}
        {abaAtiva === "transferencia" && (
          <div className="space-y-6">
            {lojas.length < 2 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-center">
                <Building2 className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-white text-lg font-semibold mb-2">Você precisa de pelo menos 2 lojas cadastradas</p>
                <p className="text-purple-300 text-sm">Cadastre suas lojas na aba Configurações para usar transferências entre lojas.</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center"><ArrowRightLeft className="w-6 h-6 mr-2" />Transferência de Estoque</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Produto</label>
                    <select value={produtoTransf} onChange={e => setProdutoTransf(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                      <option value="">Selecione o produto</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Quantidade</label>
                    <input type="number" value={qtdTransf} onChange={e => setQtdTransf(Number(e.target.value))} min={1}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Loja de Origem</label>
                    <select value={lojaOrigemTransf} onChange={e => setLojaOrigemTransf(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                      <option value="">Selecione</option>
                      {lojas.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Loja de Destino</label>
                    <select value={lojaDestinoTransf} onChange={e => setLojaDestinoTransf(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                      <option value="">Selecione</option>
                      {lojas.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-purple-200 text-sm font-semibold mb-2">Motivo (opcional)</label>
                    <input type="text" value={motivoTransf} onChange={e => setMotivoTransf(e.target.value)}
                      placeholder="Ex: Reposição para filial..." className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300" />
                  </div>
                </div>
                <button onClick={realizarTransferencia} className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />Realizar Transferência
                </button>
              </div>
            )}

            {/* Histórico de movimentações */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-indigo-600/80 px-6 py-4">
                <h3 className="text-lg font-bold text-white">Histórico de Movimentações</h3>
              </div>
              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                {movimentacoes.length === 0 ? (
                  <div className="p-8 text-center text-purple-300">Nenhuma movimentação registrada</div>
                ) : movimentacoes.map((mov, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full mr-2 ${
                        mov.tipo === "entrada" ? "bg-green-500/20 text-green-300" :
                        mov.tipo === "saida" ? "bg-red-500/20 text-red-300" :
                        mov.tipo === "transferencia" ? "bg-blue-500/20 text-blue-300" :
                        "bg-yellow-500/20 text-yellow-300"}`}>
                        {mov.tipo.toUpperCase()}
                      </span>
                      <span className="text-white text-sm">{mov.motivo || "—"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">Qtd: {mov.quantidade}</p>
                      <p className="text-purple-300 text-xs">{mov.operador_nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ABA CONFIGURAÇÕES ===== */}
        {abaAtiva === "configuracoes" && (
          <div className="space-y-6">
            {/* Configuração de margens por produto */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="bg-indigo-600/80 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center"><Percent className="w-6 h-6 mr-2" />Margens e Preços de Venda</h2>
              </div>
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                {produtos.length === 0 ? (
                  <div className="p-8 text-center text-purple-300">Nenhum produto cadastrado</div>
                ) : produtos.map((prod) => (
                  <ConfiguracaoProdutoRow
                    key={prod.id}
                    produto={prod}
                    onSave={salvarConfiguracaoProduto}
                  />
                ))}
              </div>
            </div>

            {/* Gerenciar Lojas */}
            <LojaManager userId={operadorId} lojas={lojas} onUpdate={() => carregarLojas(operadorId)} />
          </div>
        )}
      </div>

      {/* Modal de Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">{modoEdicao ? "Editar Produto" : "Novo Produto"}</h3>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Nome *</label>
                  <input type="text" value={produtoForm.nome} onChange={e => setProdutoForm({...produtoForm, nome: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300" placeholder="Ex: Coca-Cola 2L" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Código de Barras *</label>
                  <div className="flex space-x-2">
                    <input type="text" value={produtoForm.codigoBarras} onChange={e => setProdutoForm({...produtoForm, codigoBarras: e.target.value})}
                      className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300" placeholder="7891234567890" />
                    <button onClick={() => { setMostrarCamera(true); setScannerAtivo(true); }}
                      className="px-3 py-2.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg"><Camera className="w-5 h-5" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Categoria</label>
                  <input type="text" value={produtoForm.categoria} onChange={e => setProdutoForm({...produtoForm, categoria: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300" placeholder="Ex: Bebidas" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Preço (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">R$</span>
                    <input type="text" value={precoFormatado} onChange={e => handlePrecoChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Estoque</label>
                  <input type="number" value={produtoForm.estoque} onChange={e => setProdutoForm({...produtoForm, estoque: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Estoque Mínimo</label>
                  <input type="number" value={produtoForm.estoqueMinimo} onChange={e => setProdutoForm({...produtoForm, estoqueMinimo: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Margem (%)</label>
                  <input type="number" value={produtoForm.margem_lucro || 0} onChange={e => setProdutoForm({...produtoForm, margem_lucro: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="0" />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-1">Preço de Venda (R$)</label>
                  <input type="number" value={produtoForm.preco_venda || 0} onChange={e => setProdutoForm({...produtoForm, preco_venda: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="0,00" step="0.01" />
                </div>
              </div>
              <button type="button" onClick={() => setProdutoForm({...produtoForm, vendaPorKg: !produtoForm.vendaPorKg})}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all font-semibold ${produtoForm.vendaPorKg ? "bg-orange-500/20 border-orange-400 text-orange-300" : "bg-white/10 border-white/20 text-purple-200"}`}>
                <div className="flex items-center space-x-2"><Scale className="w-5 h-5" /><span>Vendido por KG</span></div>
                <div className={`w-11 h-6 rounded-full transition-all flex items-center px-1 ${produtoForm.vendaPorKg ? "bg-orange-500" : "bg-white/20"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${produtoForm.vendaPorKg ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold">Cancelar</button>
                <button onClick={salvarProduto} className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />{modoEdicao ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Câmera */}
      {mostrarCamera && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full border border-white/10">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center"><Camera className="w-6 h-6 mr-2" />Scanner</h3>
              <button onClick={() => { setMostrarCamera(false); setScannerAtivo(false); }} className="text-white hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <BarcodeScanner
                onScanSuccess={(code) => { setProdutoForm({...produtoForm, codigoBarras: code}); setMostrarCamera(false); setScannerAtivo(false); }}
                onClose={() => { setMostrarCamera(false); setScannerAtivo(false); }}
                isActive={scannerAtivo}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloqueio */}
      {mostrarBloqueio && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-red-600 p-6 rounded-t-2xl text-white flex items-center space-x-4">
              <Lock className="w-10 h-10" />
              <div><h2 className="text-2xl font-bold">Conta Suspensa</h2><p className="text-sm opacity-90">Acesso bloqueado</p></div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-red-800 font-semibold">⚠️ Sua conta está suspensa. Entre em contato com o administrador para reativar.</p>
              <button onClick={() => setMostrarBloqueio(false)} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold">Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Componente de configuração de produto ----
function ConfiguracaoProdutoRow({ produto, onSave }: { produto: ProdutoEstoque; onSave: (p: ProdutoEstoque) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [margem, setMargem] = useState(produto.margem_lucro ?? 0);
  const [precoVenda, setPrecoVenda] = useState(produto.preco_venda ?? produto.preco);

  const calcularPrecoByMargem = (m: number) => {
    const custo = produto.custo_medio || produto.preco;
    return custo > 0 ? custo * (1 + m / 100) : produto.preco;
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div>
          <p className="text-white font-semibold">{produto.nome}</p>
          <p className="text-purple-300 text-xs">Custo médio: {produto.custo_medio ? `R$ ${produto.custo_medio.toFixed(4).replace(".", ",")}` : "Não calculado"} | Último custo: {produto.ultimo_custo_compra ? `R$ ${produto.ultimo_custo_compra.toFixed(4).replace(".", ",")}` : "—"}</p>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-purple-300" /> : <ChevronDown className="w-5 h-5 text-purple-300" />}
      </div>
      {expanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-purple-300 text-xs mb-1">Margem de Lucro (%)</label>
            <input type="number" value={margem} onChange={e => {
              const m = parseFloat(e.target.value) || 0;
              setMargem(m);
              setPrecoVenda(parseFloat(calcularPrecoByMargem(m).toFixed(2)));
            }} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-purple-300 text-xs mb-1">Preço de Venda (R$)</label>
            <input type="number" value={precoVenda} onChange={e => setPrecoVenda(parseFloat(e.target.value) || 0)}
              step="0.01" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={() => onSave({...produto, margem_lucro: margem, preco_venda: precoVenda})}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Componente de gestão de lojas ----
function LojaManager({ userId, lojas, onUpdate }: { userId: string; lojas: Loja[]; onUpdate: () => void }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"matriz" | "filial">("filial");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const salvarLoja = async () => {
    if (!nome) return;
    setSalvando(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("lojas").insert({ user_id: userId, nome, tipo });
      setNome(""); setMsg("Loja cadastrada!"); setTimeout(() => setMsg(""), 3000);
      onUpdate();
    } finally { setSalvando(false); }
  };

  const removerLoja = async (id: string) => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("lojas").update({ ativo: false }).eq("id", id);
    onUpdate();
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center"><Building2 className="w-6 h-6 mr-2" />Gerenciar Lojas</h2>
      {msg && <p className="text-green-300 text-sm mb-3">{msg}</p>}
      <div className="flex gap-3 mb-4">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da loja"
          className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300" />
        <select value={tipo} onChange={e => setTipo(e.target.value as "matriz" | "filial")}
          className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white">
          <option value="matriz">Matriz</option>
          <option value="filial">Filial</option>
        </select>
        <button onClick={salvarLoja} disabled={salvando || !nome}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2">
          <Plus className="w-4 h-4" />Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {lojas.length === 0 ? (
          <p className="text-purple-300 text-sm">Nenhuma loja cadastrada. Adicione sua Matriz acima.</p>
        ) : lojas.map(l => (
          <div key={l.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
            <div>
              <span className="text-white font-semibold">{l.nome}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${l.tipo === "matriz" ? "bg-purple-500/30 text-purple-300" : "bg-blue-500/30 text-blue-300"}`}>{l.tipo}</span>
            </div>
            <button onClick={() => removerLoja(l.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
