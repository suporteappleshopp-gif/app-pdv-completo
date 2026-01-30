"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { CloudSync } from "@/lib/sync";
import { GerenciadorAssinatura } from "@/lib/assinatura";
import { Produto, ItemVenda, Venda, Operador, TipoPagamento } from "@/lib/types";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Printer,
  LogOut,
  Clock,
  User,
  DollarSign,
  Package,
  Building2,
  Scan,
  Camera,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  Calendar,
  Filter,
  XCircle,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
  Save,
  Cloud,
  HardDrive,
  Lock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  imprimirCupomFiscal,
  imprimirNFCe,
  imprimirNotaFiscalCompleta,
} from "@/lib/impressao";

interface Mensagem {
  id: string;
  remetente: "admin" | "usuario";
  texto: string;
  dataHora: string;
  lida: boolean;
}

export default function CaixaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [operadorNome, setOperadorNome] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());
  
  // Controle de assinatura
  const [statusAssinatura, setStatusAssinatura] = useState<"ativo" | "pendente" | "suspenso" | "cancelado">("pendente");
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [podeUsarApp, setPodeUsarApp] = useState(false);
  const [mostrarBloqueio, setMostrarBloqueio] = useState(false);
  const [mostrarAvisoRenovacao, setMostrarAvisoRenovacao] = useState(false);
  const [usuarioSemMensalidade, setUsuarioSemMensalidade] = useState(false);
  
  // Status de salvamento automático
  const [statusSalvamento, setStatusSalvamento] = useState<"salvando" | "salvo" | "erro">("salvo");
  const [online, setOnline] = useState(true);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date>(new Date());
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  
  // Carrinho
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [total, setTotal] = useState(0);
  
  // Busca de produtos
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [mostrarProdutos, setMostrarProdutos] = useState(false);

  // Leitor de código de barras
  const [mostrarLeitor, setMostrarLeitor] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);

  // Confirmação de cancelamento
  const [mostrarConfirmacaoCancelar, setMostrarConfirmacaoCancelar] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // Confirmação de exclusão de item
  const [mostrarConfirmacaoExcluirItem, setMostrarConfirmacaoExcluirItem] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | null>(null);

  // Modal de finalização com tipo de pagamento
  const [mostrarModalFinalizacao, setMostrarModalFinalizacao] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>("dinheiro");
  const [mostrarModalImpressao, setMostrarModalImpressao] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);

  // Lembrete de vencimento
  const [mostrarLembrete, setMostrarLembrete] = useState(false);
  const [diasAteVencimento, setDiasAteVencimento] = useState(0);

  // Buffer para leitor USB
  const [bufferCodigoBarras, setBufferCodigoBarras] = useState("");

  // Vendas realizadas e canceladas
  const [mostrarVendas, setMostrarVendas] = useState(false);
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([]);
  const [vendasCanceladas, setVendasCanceladas] = useState<Venda[]>([]);
  const [dataVendaFiltro, setDataVendaFiltro] = useState("");
  const [dataInicioCanceladas, setDataInicioCanceladas] = useState("");
  const [dataFimCanceladas, setDataFimCanceladas] = useState("");

  // Ref para o input de busca
  const buscaInputRef = useRef<HTMLInputElement>(null);

  // Timer para salvamento automático
  const salvamentoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar assinatura periodicamente
  useEffect(() => {
    const verificarAssinaturaLoop = async () => {
      if (!operadorId) return;
      
      // Verificar se é usuário sem mensalidade (criado pelo admin)
      const semMensalidade = localStorage.getItem("usuarioSemMensalidade") === "true";
      
      if (semMensalidade) {
        // Usuário sem mensalidade - acesso livre e permanente
        setStatusAssinatura("ativo");
        setDiasRestantes(999);
        setPodeUsarApp(true);
        setUsuarioSemMensalidade(true);
        setMostrarAvisoRenovacao(false);
        return;
      }
      
      // Usuário com mensalidade - verificar acesso
      const resultado = await GerenciadorAssinatura.verificarAcesso(operadorId);
      setStatusAssinatura(resultado.status as any);
      setDiasRestantes(resultado.diasRestantes);
      setPodeUsarApp(resultado.podeUsar);
      setUsuarioSemMensalidade(false);
      
      // Mostrar aviso de renovação quando especificado
      if (resultado.mostrarAviso) {
        setMostrarAvisoRenovacao(true);
      }
    };

    verificarAssinaturaLoop();
    
    // Verificar a cada 5 minutos
    const interval = setInterval(verificarAssinaturaLoop, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [operadorId]);

  // Interceptar ações quando não pode usar (APENAS para usuários COM mensalidade)
  const tentarAcao = (acao: () => void) => {
    // Usuários sem mensalidade podem usar livremente
    if (usuarioSemMensalidade) {
      acao();
      return;
    }
    
    // Usuários com mensalidade precisam estar ativos
    if (!podeUsarApp) {
      setMostrarBloqueio(true);
      return;
    }
    acao();
  };

  // Função de salvamento automático com sincronização em nuvem
  const salvarAutomaticamente = async (dados: any, tipo: string) => {
    try {
      setStatusSalvamento("salvando");
      
      // Salvar no IndexedDB (funciona offline)
      await db.init();
      
      // Salvar no localStorage como backup
      const chave = `autosave_${tipo}_${operadorId}`;
      localStorage.setItem(chave, JSON.stringify({
        dados,
        timestamp: new Date().toISOString(),
        tipo,
        operadorId,
        operadorNome,
      }));

      // Se online E Supabase configurado, sincronizar com nuvem
      if (online && supabaseConfigured) {
        // Sincronizar dados específicos baseado no tipo
        if (tipo === "venda_concluida" || tipo === "venda_cancelada") {
          const todasVendas = await db.getAllVendas();
          await CloudSync.syncVendas(todasVendas);
        } else if (tipo === "produto_estoque") {
          const todosProdutos = await db.getAllProdutos();
          await CloudSync.syncProdutos(todosProdutos);
        } else if (tipo === "carrinho") {
          // Carrinho é apenas local, não sincroniza
        }
      }

      setStatusSalvamento("salvo");
      setUltimoSalvamento(new Date());
    } catch (error) {
      console.error("Erro ao salvar automaticamente:", error);
      setStatusSalvamento("erro");
      
      // Mesmo com erro, tenta salvar no localStorage
      try {
        const chave = `autosave_backup_${tipo}_${Date.now()}`;
        localStorage.setItem(chave, JSON.stringify({
          dados,
          timestamp: new Date().toISOString(),
          tipo,
          erro: true,
        }));
      } catch (e) {
        console.error("Erro crítico no salvamento:", e);
      }
    }
  };

  // Debounce para salvamento automático
  const agendarSalvamento = (dados: any, tipo: string) => {
    if (salvamentoTimerRef.current) {
      clearTimeout(salvamentoTimerRef.current);
    }

    salvamentoTimerRef.current = setTimeout(() => {
      salvarAutomaticamente(dados, tipo);
    }, 1000); // Salva 1 segundo após última alteração
  };

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      console.log("✅ Conexão restaurada - sincronizando dados...");
      // Sincronizar dados pendentes quando voltar online
      if (supabaseConfigured) {
        CloudSync.syncAll();
      }
    };

    const handleOffline = () => {
      setOnline(false);
      console.log("⚠️ Modo offline ativado - dados serão salvos localmente");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Verificar status inicial
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [supabaseConfigured]);

  // Salvar carrinho automaticamente
  useEffect(() => {
    if (mounted && carrinho.length > 0) {
      agendarSalvamento({
        carrinho,
        total,
        dataHora: new Date().toISOString(),
      }, "carrinho");
    }
  }, [carrinho, total, mounted]);

  // Atualizar data/hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);

    // Verificar se Supabase está configurado
    const isConfigured = CloudSync.isConfigured();
    setSupabaseConfigured(isConfigured);

    // Inicializar banco e carregar produtos
    const init = async () => {
      // Buscar operador logado do Supabase (não do localStorage)
      const { AuthSupabase } = await import("@/lib/auth-supabase");
      const operador = await AuthSupabase.getCurrentOperador();

      if (!operador) {
        // Não tem sessão ativa - redirecionar para login
        router.push("/");
        return;
      }

      // Configurar dados do operador a partir do banco
      setOperadorNome(operador.nome);
      setOperadorId(operador.id);

      // Verificar se é usuário sem mensalidade (criado pelo admin)
      const semMensalidade = !operador.formaPagamento;
      setUsuarioSemMensalidade(semMensalidade);

      // Se é usuário sem mensalidade, libera acesso imediatamente
      if (semMensalidade) {
        setPodeUsarApp(true);
        setStatusAssinatura("ativo");
        setDiasRestantes(999);
      }

      await db.init();
      
      // Tentar carregar produtos da nuvem primeiro (se configurado)
      if (isConfigured) {
        try {
          const produtosNuvem = await CloudSync.loadProdutos();
          if (produtosNuvem.length > 0) {
            setProdutos(produtosNuvem);
            console.log("✅ Produtos carregados da nuvem");
            
            // Configurar sincronização automática a cada 30 segundos
            CloudSync.setupAutoSync(30000);
            return;
          }
        } catch (error) {
          console.error("⚠️ Erro ao carregar da nuvem, usando dados locais:", error);
        }
      }
      
      // Fallback: carregar produtos locais
      const todosProdutos = await db.getAllProdutos();
      setProdutos(todosProdutos);

      // Recuperar carrinho salvo automaticamente
      const chaveCarrinho = `autosave_carrinho_${operador.id}`;
      const carrinhoSalvo = localStorage.getItem(chaveCarrinho);
      if (carrinhoSalvo) {
        try {
          const { dados } = JSON.parse(carrinhoSalvo);
          if (dados.carrinho && dados.carrinho.length > 0) {
            setCarrinho(dados.carrinho);
            setTotal(dados.total);
            console.log("✅ Carrinho recuperado automaticamente");
          }
        } catch (e) {
          console.error("Erro ao recuperar carrinho:", e);
        }
      }

      // Verificar vencimento (apenas para usuários COM mensalidade)
      if (!semMensalidade) {
        const operadorDB = await db.getOperador(operador.id);
        if (operadorDB && operadorDB.dataProximoVencimento) {
          const dias = differenceInDays(new Date(operadorDB.dataProximoVencimento), new Date());
          if (dias <= 3 && dias >= 0) {
            setDiasAteVencimento(dias);
            setMostrarLembrete(true);
          }
        }
      }
    };
    init();
  }, []);

  // Listener para atalhos de teclado do caixa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em um input/textarea (exceto o input de busca)
      const target = e.target as HTMLElement;
      const isInputField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const isBuscaInput = target === buscaInputRef.current;
      
      // Se estiver em qualquer input que não seja o de busca, ignora os atalhos
      if (isInputField && !isBuscaInput) {
        return;
      }

      // Se estiver em modal de impressão, permite atalhos numéricos e N
      if (mostrarModalImpressao && vendaFinalizada) {
        if (e.key === "1") {
          e.preventDefault();
          imprimirNota("cupom");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          imprimirNota("nfce");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          imprimirNota("completa");
          return;
        }
        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          setMostrarModalImpressao(false);
          setVendaFinalizada(null);
          return;
        }
      }

      // Se estiver em modal de finalização, permite atalhos de pagamento e Enter
      if (mostrarModalFinalizacao) {
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          setTipoPagamento("credito");
          return;
        }
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          setTipoPagamento("debito");
          return;
        }
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          setTipoPagamento("dinheiro");
          return;
        }
        if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          setTipoPagamento("pix");
          return;
        }
        if (e.key.toLowerCase() === "o") {
          e.preventDefault();
          setTipoPagamento("outros");
          return;
        }
        if (e.key.toLowerCase() === "x") {
          e.preventDefault();
          setMostrarModalFinalizacao(false);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          finalizarVenda();
          return;
        }
      }

      // Atalhos gerais do caixa (apenas quando não estiver em modais)
      if (!mostrarModalFinalizacao && !mostrarModalImpressao && !mostrarConfirmacaoCancelar) {
        // B - Focar no campo de busca
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          buscaInputRef.current?.focus();
          return;
        }

        // X - Cancelar venda
        if (e.key.toLowerCase() === "x") {
          e.preventDefault();
          if (carrinho.length > 0) {
            tentarAcao(() => cancelarVenda());
          }
          return;
        }

        // F - Finalizar venda
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          if (carrinho.length > 0) {
            tentarAcao(() => abrirModalFinalizacao());
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [carrinho, mostrarModalFinalizacao, mostrarModalImpressao, mostrarConfirmacaoCancelar, vendaFinalizada, podeUsarApp, usuarioSemMensalidade]);

  // Listener para leitor USB de código de barras
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em um input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter finaliza a leitura do código
      if (e.key === "Enter" && bufferCodigoBarras.length > 0) {
        buscarProdutoPorCodigo(bufferCodigoBarras);
        setBufferCodigoBarras("");
        return;
      }

      // Acumula caracteres do código de barras
      if (e.key.length === 1) {
        setBufferCodigoBarras((prev) => prev + e.key);
        
        // Limpa o buffer após 100ms de inatividade
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setBufferCodigoBarras("");
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [bufferCodigoBarras, produtos]);

  useEffect(() => {
    if (busca.trim()) {
      const filtrados = produtos.filter(
        (p) =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.codigoBarras.includes(busca)
      );
      setProdutosFiltrados(filtrados);
      setMostrarProdutos(true);
    } else {
      setProdutosFiltrados([]);
      setMostrarProdutos(false);
    }
  }, [busca, produtos]);

  useEffect(() => {
    const novoTotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
    setTotal(novoTotal);
  }, [carrinho]);

  const carregarVendas = async () => {
    // Tentar carregar da nuvem primeiro
    if (supabaseConfigured) {
      try {
        const vendasNuvem = await CloudSync.loadVendas();
        const realizadas = vendasNuvem.filter(v => v.operadorId === operadorId && v.status === "concluida");
        const canceladas = vendasNuvem.filter(v => v.operadorId === operadorId && v.status === "cancelada");
        setVendasRealizadas(realizadas);
        setVendasCanceladas(canceladas);
        console.log("✅ Vendas carregadas da nuvem");
        return;
      } catch (error) {
        console.error("⚠️ Erro ao carregar vendas da nuvem, usando dados locais:", error);
      }
    }
    
    // Fallback: carregar vendas locais
    const todasVendas = await db.getAllVendas();
    const realizadas = todasVendas.filter(v => v.operadorId === operadorId && v.status === "concluida");
    const canceladas = todasVendas.filter(v => v.operadorId === operadorId && v.status === "cancelada");
    setVendasRealizadas(realizadas);
    setVendasCanceladas(canceladas);
  };

  const filtrarVendasRealizadas = () => {
    let vendas = vendasRealizadas;

    if (dataVendaFiltro) {
      const dataFiltro = new Date(dataVendaFiltro);
      vendas = vendas.filter(v => {
        const dataVenda = new Date(v.dataHora);
        return dataVenda.toDateString() === dataFiltro.toDateString();
      });
    }

    return vendas;
  };

  const filtrarVendasCanceladas = () => {
    let vendas = vendasCanceladas;

    if (dataInicioCanceladas) {
      const dataInicio = new Date(dataInicioCanceladas);
      vendas = vendas.filter(v => new Date(v.dataHora) >= dataInicio);
    }

    if (dataFimCanceladas) {
      const dataFim = new Date(dataFimCanceladas);
      dataFim.setHours(23, 59, 59, 999);
      vendas = vendas.filter(v => new Date(v.dataHora) <= dataFim);
    }

    return vendas;
  };

  const adicionarProduto = (produto: Produto) => {
    // Usuários sem mensalidade podem usar livremente
    if (!usuarioSemMensalidade && !podeUsarApp) {
      setMostrarBloqueio(true);
      return;
    }

    const itemExistente = carrinho.find((item) => item.produtoId === produto.id);
    
    if (itemExistente) {
      setCarrinho(
        carrinho.map((item) =>
          item.produtoId === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + 1,
                subtotal: (item.quantidade + 1) * item.precoUnitario,
              }
            : item
        )
      );
    } else {
      const novoItem: ItemVenda = {
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: 1,
        precoUnitario: produto.preco,
        subtotal: produto.preco,
      };
      setCarrinho([...carrinho, novoItem]);
    }
    
    setBusca("");
    setMostrarProdutos(false);
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    if (!usuarioSemMensalidade && !podeUsarApp) {
      setMostrarBloqueio(true);
      return;
    }

    setCarrinho(
      carrinho
        .map((item) => {
          if (item.produtoId === produtoId) {
            const novaQuantidade = item.quantidade + delta;
            if (novaQuantidade <= 0) return null;
            return {
              ...item,
              quantidade: novaQuantidade,
              subtotal: novaQuantidade * item.precoUnitario,
            };
          }
          return item;
        })
        .filter((item): item is ItemVenda => item !== null)
    );
  };

  const abrirConfirmacaoExcluirItem = (produtoId: string) => {
    if (!usuarioSemMensalidade && !podeUsarApp) {
      setMostrarBloqueio(true);
      return;
    }
    setItemParaExcluir(produtoId);
    setMostrarConfirmacaoExcluirItem(true);
  };

  const confirmarExclusaoItem = () => {
    if (itemParaExcluir) {
      setCarrinho(carrinho.filter((item) => item.produtoId !== itemParaExcluir));
      setMostrarConfirmacaoExcluirItem(false);
      setItemParaExcluir(null);
    }
  };

  const cancelarExclusaoItem = () => {
    setMostrarConfirmacaoExcluirItem(false);
    setItemParaExcluir(null);
  };

  const cancelarVenda = () => {
    if (carrinho.length === 0) {
      alert("Carrinho já está vazio!");
      return;
    }
    setMostrarConfirmacaoCancelar(true);
  };

  const confirmarCancelamento = async () => {
    try {
      const numeroVenda = await db.getProximoNumeroVenda();
      
      // Criar venda cancelada
      const vendaCancelada: Venda = {
        id: `venda-cancelada-${Date.now()}`,
        numero: numeroVenda,
        operadorId,
        operadorNome,
        itens: carrinho,
        total,
        dataHora: new Date(),
        status: "cancelada",
        motivoCancelamento: motivoCancelamento || "Cancelamento por defeito",
        tipoPagamento: undefined,
      };

      await db.addVenda(vendaCancelada);
      
      // Salvar automaticamente (sincroniza com nuvem se configurado)
      await salvarAutomaticamente(vendaCancelada, "venda_cancelada");
      
      // Se o motivo for "Produto com defeito", NÃO devolver ao estoque (vai direto para perdas)
      if (motivoCancelamento === "Produto com defeito") {
        alert("Venda cancelada por defeito! Os produtos foram registrados em perdas (não voltaram ao estoque).");
      } else {
        // Para outros motivos, devolver ao estoque
        for (const item of carrinho) {
          const produto = await db.getProduto(item.produtoId);
          if (produto) {
            produto.estoque += item.quantidade;
            await db.updateProduto(produto);
            // Salvar alteração de estoque (sincroniza com nuvem)
            await salvarAutomaticamente(produto, "produto_estoque");
          }
        }
        alert("Venda cancelada com sucesso! Os produtos foram devolvidos ao estoque.");
      }
      
      setCarrinho([]);
      setTotal(0);
      setMostrarConfirmacaoCancelar(false);
      setMotivoCancelamento("");
      
      // Limpar carrinho salvo
      const chaveCarrinho = `autosave_carrinho_${operadorId}`;
      localStorage.removeItem(chaveCarrinho);
      
      // Atualizar lista de produtos
      const todosProdutos = await db.getAllProdutos();
      setProdutos(todosProdutos);
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      alert("Erro ao cancelar venda!");
      setMostrarConfirmacaoCancelar(false);
      setMotivoCancelamento("");
    }
  };

  const iniciarLeitorCamera = async () => {
    if (!usuarioSemMensalidade && !podeUsarApp) {
      setMostrarBloqueio(true);
      return;
    }

    setMostrarLeitor(true);
    setScannerAtivo(true);

    try {
      // Importação dinâmica do html5-qrcode
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const html5QrCode = new Html5Qrcode("reader");
      
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Código de barras detectado
          buscarProdutoPorCodigo(decodedText);
          pararScanner(html5QrCode);
        },
        (errorMessage) => {
          // Erro de leitura (pode ser ignorado)
        }
      );
    } catch (err) {
      console.error("Erro ao iniciar câmera:", err);
      alert("Erro ao acessar a câmera. Verifique as permissões.");
      setMostrarLeitor(false);
      setScannerAtivo(false);
    }
  };

  const pararScanner = async (scanner: any) => {
    try {
      await scanner.stop();
      setScannerAtivo(false);
      setMostrarLeitor(false);
    } catch (err) {
      console.error("Erro ao parar scanner:", err);
    }
  };

  const buscarProdutoPorCodigo = (codigo: string) => {
    const produto = produtos.find((p) => p.codigoBarras === codigo);
    if (produto) {
      adicionarProduto(produto);
      alert(`Produto "${produto.nome}" adicionado ao carrinho!`);
    } else {
      alert(`Produto com código "${codigo}" não encontrado.`);
    }
  };

  const abrirModalFinalizacao = () => {
    if (carrinho.length === 0) {
      alert("Carrinho vazio!");
      return;
    }
    setMostrarModalFinalizacao(true);
  };

  const finalizarVenda = async () => {
    try {
      console.log("🔄 Iniciando finalização de venda...");
      
      const numeroVenda = await db.getProximoNumeroVenda();
      console.log("📝 Número da venda:", numeroVenda);
      
      const venda: Venda = {
        id: `venda-${Date.now()}`,
        numero: numeroVenda,
        operadorId,
        operadorNome,
        itens: carrinho,
        total,
        dataHora: new Date(),
        status: "concluida",
        tipoPagamento,
      };

      console.log("💾 Salvando venda no IndexedDB...");
      await db.addVenda(venda);
      console.log("✅ Venda salva no IndexedDB");
      
      // Salvar venda automaticamente (sincroniza com nuvem)
      console.log("☁️ Sincronizando com Supabase...");
      await salvarAutomaticamente(venda, "venda_concluida");
      console.log("✅ Venda sincronizada com Supabase");
      
      // Atualizar estoque - produtos saem automaticamente
      console.log("📦 Atualizando estoque...");
      for (const item of carrinho) {
        const produto = await db.getProduto(item.produtoId);
        if (produto) {
          produto.estoque -= item.quantidade;
          await db.updateProduto(produto);
          // Salvar alteração de estoque (sincroniza com nuvem)
          await salvarAutomaticamente(produto, "produto_estoque");
        }
      }
      console.log("✅ Estoque atualizado");

      // Atualizar lista de produtos
      const todosProdutos = await db.getAllProdutos();
      setProdutos(todosProdutos);

      // Guardar venda para impressão
      setVendaFinalizada(venda);
      
      // Limpar carrinho
      setCarrinho([]);
      setTotal(0);
      setMostrarModalFinalizacao(false);
      
      // Limpar carrinho salvo
      const chaveCarrinho = `autosave_carrinho_${operadorId}`;
      localStorage.removeItem(chaveCarrinho);
      
      console.log("✅ Venda finalizada com sucesso!");
      
      // Abrir modal de impressão
      setMostrarModalImpressao(true);
    } catch (error) {
      console.error("❌ Erro ao finalizar venda:", error);
      alert("Erro ao finalizar venda! Verifique o console para mais detalhes.");
    }
  };

  const imprimirNota = (tipo: "cupom" | "nfce" | "completa") => {
    if (!vendaFinalizada) return;
    
    switch (tipo) {
      case "cupom":
        imprimirCupomFiscal(vendaFinalizada);
        break;
      case "nfce":
        imprimirNFCe(vendaFinalizada);
        break;
      case "completa":
        imprimirNotaFiscalCompleta(vendaFinalizada);
        break;
    }
    
    setMostrarModalImpressao(false);
    setVendaFinalizada(null);
  };

  const enviarNotaWhatsApp = async (tipo: "cupom" | "nfce" | "completa") => {
    if (!vendaFinalizada) return;
    
    const { enviarNotaWhatsApp: enviarWhatsApp } = await import("@/lib/impressao");
    enviarWhatsApp(vendaFinalizada, tipo);
    
    setMostrarModalImpressao(false);
    setVendaFinalizada(null);
  };

  const abrirVendas = async () => {
    await carregarVendas();
    setMostrarVendas(true);
  };

  const sair = async () => {
    // Fazer logout no Supabase (limpa sessão em todos os navegadores)
    const { AuthSupabase } = await import("@/lib/auth-supabase");
    await AuthSupabase.signOut();

    // Limpar localStorage (apenas backup local)
    localStorage.clear();

    router.push("/");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const itemParaExcluirNome = carrinho.find(item => item.produtoId === itemParaExcluir)?.nome || "";
  const vendasRealizadasFiltradas = filtrarVendasRealizadas();
  const vendasCanceladasFiltradas = filtrarVendasCanceladas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Modal de Bloqueio - APENAS para usuários COM mensalidade */}
      {mostrarBloqueio && !usuarioSemMensalidade && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Lock className="w-6 h-6" />
                <span>Acesso Bloqueado</span>
              </h3>
              <button
                onClick={() => setMostrarBloqueio(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <Lock className="w-16 h-16 text-red-600 mx-auto mb-3" />
                <p className="text-gray-800 font-bold text-lg mb-2">
                  {statusAssinatura === "pendente" 
                    ? "Pagamento Pendente" 
                    : "Assinatura Suspensa"}
                </p>
                <p className="text-gray-700 text-sm">
                  {statusAssinatura === "pendente"
                    ? "Realize o pagamento da sua assinatura para usar todas as funcionalidades do app."
                    : "Sua assinatura está suspensa por falta de pagamento. Regularize para continuar usando."}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-semibold mb-2">💳 Planos Disponíveis:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>PIX:</strong> R$ 59,90 - 100 dias de acesso</li>
                  <li>• <strong>Cartão:</strong> R$ 149,70 - 365 dias (1 ano)</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setMostrarBloqueio(false);
                  router.push("/financeiro");
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-5 h-5" />
                <span>Renovar Assinatura</span>
              </button>

              <button
                onClick={() => window.open("https://wa.me/5565981032239", "_blank")}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>Contato WhatsApp</span>
              </button>

              <button
                onClick={() => setMostrarBloqueio(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de Renovação - APENAS para usuários COM mensalidade */}
      {mostrarAvisoRenovacao && podeUsarApp && !usuarioSemMensalidade && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-bold">
                  ⚠️ Lembrete de Renovação da Assinatura
                </p>
                <p className="text-sm">
                  Você tem {diasRestantes} dias restantes. Renove sua assinatura para continuar usando o app sem interrupções.
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarAvisoRenovacao(false)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Lembrete de Vencimento - APENAS para usuários COM mensalidade */}
      {mostrarLembrete && podeUsarApp && !usuarioSemMensalidade && (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-bold">
                  {diasAteVencimento === 0
                    ? "Seu pagamento vence HOJE!"
                    : `Seu pagamento vence em ${diasAteVencimento} ${diasAteVencimento === 1 ? "dia" : "dias"}!`}
                </p>
                <p className="text-sm">
                  Realize o pagamento para evitar suspensão da conta.
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarLembrete(false)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">PDV Operador</h1>
                <p className="text-sm text-gray-600 flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{operadorNome}</span>
                  {usuarioSemMensalidade && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                      Acesso Livre
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Dias restantes - APENAS para usuários COM mensalidade */}
              {!usuarioSemMensalidade && diasRestantes < 999 && (
                <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                  diasRestantes > 10 ? "bg-blue-100 text-blue-800" :
                  diasRestantes > 5 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    {diasRestantes >= 0 ? diasRestantes : 0} {diasRestantes === 1 ? "dia" : "dias"}
                  </span>
                </div>
              )}

              {/* Indicador Online/Offline */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                online ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
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
              {supabaseConfigured && (
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-800">
                  <Cloud className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    Sincronização Ativa
                  </span>
                </div>
              )}

              {/* Botão Sair */}
              <button
                onClick={sair}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md flex items-center space-x-1 transition-all shadow-sm"
                title="Sair"
              >
                <LogOut className="w-3 h-3" />
                <span className="text-xs font-semibold">Sair</span>
              </button>

              {/* Relógio pequeno no canto direito */}
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2 text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm font-semibold">
                    {format(dataHoraAtual, "HH:mm:ss")}
                  </span>
                </div>
              </div>

              {/* Botão Empresa */}
              <button
                onClick={() => router.push("/empresa")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md"
              >
                <Building2 className="w-5 h-5" />
                <span>Empresa</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Busca e Produtos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Botão de Leitor de Código de Barras por Câmera */}
              <div className="mb-4">
                <button
                  onClick={() => tentarAcao(() => iniciarLeitorCamera())}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <Camera className="w-5 h-5" />
                  <span className="font-semibold">Leitor de Código por Câmera</span>
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={buscaInputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto por nome ou código de barras... (Tecla B)"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {mostrarProdutos && produtosFiltrados.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto border rounded-lg">
                  {produtosFiltrados.map((produto) => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarProduto(produto)}
                      className="w-full p-4 hover:bg-blue-50 border-b last:border-b-0 text-left transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{produto.nome}</p>
                          <p className="text-sm text-gray-600">Cód: {produto.codigoBarras}</p>
                          <p className="text-xs text-gray-500">Estoque: {produto.estoque}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            R$ {produto.preco.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carrinho */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <ShoppingCart className="w-6 h-6" />
                <span>Carrinho de Compras</span>
              </h2>

              {carrinho.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Busque e adicione produtos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrinho.map((item) => (
                    <div
                      key={item.produtoId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.nome}</p>
                        <p className="text-sm text-gray-600">
                          R$ {item.precoUnitario.toFixed(2)} cada
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => tentarAcao(() => alterarQuantidade(item.produtoId, -1))}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <span className="font-bold text-lg w-12 text-center">
                          {item.quantidade}
                        </span>
                        
                        <button
                          onClick={() => tentarAcao(() => alterarQuantidade(item.produtoId, 1))}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <div className="w-24 text-right">
                          <p className="font-bold text-gray-800">
                            R$ {item.subtotal.toFixed(2)}
                          </p>
                        </div>

                        <button
                          onClick={() => abrirConfirmacaoExcluirItem(item.produtoId)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                          title="Excluir item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumo e Finalização */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Resumo</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Itens:</span>
                  <span className="font-semibold">{carrinho.length}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Quantidade:</span>
                  <span className="font-semibold">
                    {carrinho.reduce((acc, item) => acc + item.quantidade, 0)}
                  </span>
                </div>
                
                <div className="border-t-2 border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">TOTAL:</span>
                    <span className="text-3xl font-bold text-green-600">
                      R$ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => tentarAcao(() => abrirModalFinalizacao())}
                disabled={carrinho.length === 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DollarSign className="w-6 h-6" />
                <span>Finalizar Venda (F)</span>
              </button>

              <button
                onClick={() => tentarAcao(() => cancelarVenda())}
                disabled={carrinho.length === 0}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
                <span>Cancelar Venda (X)</span>
              </button>
            </div>

            {/* Status da Assinatura - APENAS MOSTRAR SE FALTAR 5 DIAS OU MENOS OU SE NÃO PUDER USAR (e não for usuário sem mensalidade) */}
            {!usuarioSemMensalidade && (!podeUsarApp || diasRestantes <= 5) && (
            <div className={`rounded-xl shadow-lg p-6 text-white ${
              podeUsarApp 
                ? "bg-gradient-to-r from-yellow-500 to-orange-600" 
                : "bg-gradient-to-r from-red-600 to-orange-600"
            }`}>
              <h3 className="font-bold mb-2 flex items-center space-x-2">
                {podeUsarApp ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                <span>Status da Assinatura</span>
              </h3>
              {podeUsarApp ? (
                <>
                  <p className="text-sm text-yellow-100">
                    ⚠️ Assinatura próxima do vencimento
                  </p>
                  <p className="text-sm text-yellow-100 mt-2">
                    📅 {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                  </p>
                  <p className="text-sm text-yellow-100 mt-2">
                    💳 Renove sua assinatura para continuar usando
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-red-100">
                    🔒 {statusAssinatura === "pendente" ? "Pagamento Pendente" : "Assinatura Suspensa"}
                  </p>
                  <p className="text-sm text-red-100 mt-2">
                    💳 Realize o pagamento para usar o app
                  </p>
                  <button
                    onClick={() => router.push("/pagamento")}
                    className="mt-3 w-full bg-white text-red-600 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                  >
                    Realizar Pagamento
                  </button>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Item */}
      {mostrarConfirmacaoExcluirItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <span>Confirmar Exclusão</span>
            </h3>
            <p className="text-gray-600 mb-6">
              Deseja realmente excluir <strong>{itemParaExcluirNome}</strong> do carrinho?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmarExclusaoItem}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Sim, Excluir
              </button>
              <button
                onClick={cancelarExclusaoItem}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {mostrarConfirmacaoCancelar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <span>Cancelar Venda</span>
            </h3>
            <p className="text-gray-600 mb-4">
              Selecione o motivo do cancelamento:
            </p>
            <select
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um motivo</option>
              <option value="Cliente desistiu">Cliente desistiu</option>
              <option value="Erro no pedido">Erro no pedido</option>
              <option value="Produto com defeito">Produto com defeito</option>
              <option value="Outros">Outros</option>
            </select>
            <div className="flex space-x-3">
              <button
                onClick={confirmarCancelamento}
                disabled={!motivoCancelamento}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Cancelamento
              </button>
              <button
                onClick={() => {
                  setMostrarConfirmacaoCancelar(false);
                  setMotivoCancelamento("");
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalização com Tipo de Pagamento */}
      {mostrarModalFinalizacao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span>Finalizar Venda</span>
            </h3>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Total da Venda:</p>
              <p className="text-3xl font-bold text-green-600">R$ {total.toFixed(2)}</p>
            </div>

            <p className="text-gray-600 mb-4 font-semibold">Selecione a forma de pagamento:</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setTipoPagamento("dinheiro")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                  tipoPagamento === "dinheiro"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Banknote className="w-6 h-6 text-green-600" />
                <span className="font-semibold">Dinheiro (R)</span>
              </button>

              <button
                onClick={() => setTipoPagamento("credito")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                  tipoPagamento === "credito"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <CreditCard className="w-6 h-6 text-blue-600" />
                <span className="font-semibold">Cartão de Crédito (C)</span>
              </button>

              <button
                onClick={() => setTipoPagamento("debito")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                  tipoPagamento === "debito"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <CreditCard className="w-6 h-6 text-purple-600" />
                <span className="font-semibold">Cartão de Débito (D)</span>
              </button>

              <button
                onClick={() => setTipoPagamento("pix")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                  tipoPagamento === "pix"
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Smartphone className="w-6 h-6 text-teal-600" />
                <span className="font-semibold">PIX (P)</span>
              </button>

              <button
                onClick={() => setTipoPagamento("outros")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${
                  tipoPagamento === "outros"
                    ? "border-gray-500 bg-gray-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Wallet className="w-6 h-6 text-gray-600" />
                <span className="font-semibold">Outros (O)</span>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={finalizarVenda}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Confirmar (Enter)</span>
              </button>
              <button
                onClick={() => setMostrarModalFinalizacao(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Cancelar (X)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressão */}
      {mostrarModalImpressao && vendaFinalizada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Venda Finalizada!</h3>
              <p className="text-gray-600">Venda #{vendaFinalizada.numero}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                R$ {vendaFinalizada.total.toFixed(2)}
              </p>
            </div>

            <p className="text-gray-600 mb-4 font-semibold text-center">
              Deseja imprimir a nota fiscal?
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => imprimirNota("cupom")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Cupom Fiscal (1)</span>
              </button>

              <button
                onClick={() => imprimirNota("nfce")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>NFC-e (2)</span>
              </button>

              <button
                onClick={() => imprimirNota("completa")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Nota Fiscal Completa (3)</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMostrarModalImpressao(false);
                setVendaFinalizada(null);
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Não Imprimir (N)
            </button>
          </div>
        </div>
      )}

      {/* Modal do Leitor de Código de Barras */}
      {mostrarLeitor && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Leitor de Código</h3>
              <button
                onClick={() => {
                  setMostrarLeitor(false);
                  setScannerAtivo(false);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div id="reader" className="w-full rounded-lg overflow-hidden"></div>
            
            <p className="text-sm text-gray-600 mt-4 text-center">
              Aponte a câmera para o código de barras
            </p>
          </div>
        </div>
      )}

      {/* Botão Renovar Assinatura no rodapé - visível apenas com 10 dias ou menos */}
      {!usuarioSemMensalidade && diasRestantes <= 10 && diasRestantes >= 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
          <button
            onClick={() => router.push("/financeiro")}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 animate-pulse"
          >
            <CreditCard className="w-5 h-5" />
            <span>Renovar Assinatura</span>
            {diasRestantes < 5 && (
              <AlertTriangle className="w-4 h-4 text-yellow-300" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
