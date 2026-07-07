// Tipos do sistema PDV

export interface Operador {
  id: string;
  nome: string;
  email: string;
  senha: string;
  ativo: boolean;
  isAdmin: boolean;
  createdAt: Date;
  formaPagamento?: "cartao" | "pix";
  suspenso?: boolean;
  aguardandoPagamento?: boolean;
  // Sistema de dias comprados
  diasRestantes?: number; // Dias restantes de assinatura
  totalDiasComprados?: number; // Total acumulado de dias
  dataUltimaCompra?: Date; // Data da última compra
  dataExpiracao?: Date; // Quando expira a assinatura
  historicoCompras?: Array<{
    data: Date;
    dias: number;
    valor: number;
    forma_pagamento: string;
  }>;
  // Campos adicionais de mensalidade
  valorMensal?: number;
  dataProximoVencimento?: Date;
  diasAssinatura?: number;
  dataPagamento?: Date;
  // Rastreamento de atividade
  ultimaAtividade?: Date; // Última vez que o usuário usou o sistema
}

export interface Produto {
  id: string;
  nome: string;
  codigoBarras: string;
  preco: number;
  estoque: number;
  estoqueMinimo: number;
  vendaPorKg?: boolean;
  categoria?: string;
  descricao?: string;
}

export interface ItemVenda {
  produtoId: string;
  produtoIdOriginal?: string; // ID original do produto (usado para produtos vendidos por KG)
  nome: string;
  codigoBarras?: string; // Código de barras do produto (para devolução)
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Devolucao {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  motivo: string;
  dataHora: Date;
  tipoDestino?: "estoque" | "avaria"; // Para onde foi o produto devolvido
}

export interface Exclusao {
  tipo: "item" | "venda";
  produtoId?: string;
  nomeProduto?: string;
  quantidade?: number;
  valorExcluido: number;
  dataHora: Date;
  operadorResponsavel?: string;
}

export interface Avaria {
  id: string;
  userId: string;
  vendaId?: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  motivo: string;
  observacoes?: string;
  createdAt: Date;
}

export type TipoPagamento = "dinheiro" | "credito" | "debito" | "pix" | "outros";

// Representa um pagamento parcial (para pagamentos mistos)
export interface PagamentoItem {
  tipo: TipoPagamento;
  valor: number;
  label: string; // ex: "Dinheiro", "PIX", "Crédito"
}

export interface Venda {
  id: string;
  numero: number;
  operadorId: string;
  operadorNome: string;
  itens: ItemVenda[];
  total: number;
  dataHora: Date;
  devolucoes?: Devolucao[];
  exclusoes?: Exclusao[];
  status?: "concluida" | "cancelada";
  motivoCancelamento?: string;
  tipoPagamento?: TipoPagamento;
  pagamentos?: PagamentoItem[]; // Para pagamentos mistos (múltiplas formas)
  valorRecebido?: number;
  troco?: number;
  clienteCpf?: string;
  clienteNome?: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  telefone: string;
  email: string;
}

export interface ConfiguracaoNFCe {
  id: string;
  empresaId: string;
  ambiente: "producao" | "homologacao";
  serieNFCe: string;
  proximoNumero: number;
  tokenCSC: string;
  idCSC: string;
  regimeTributario: "simples" | "normal" | "mei";
  aliquotaICMSPadrao: number;
  aliquotaPISPadrao: number;
  aliquotaCOFINSPadrao: number;
  cfopPadrao: string;
  mensagemNota: string;
  // Certificado Digital A1 (para assinatura XML e TLS 1.2)
  certificadoA1Base64?: string;
  certificadoA1Senha?: string;
  // Pagamento via Cartão/Pix - Grupo YA SEFAZ
  cnpjCredenciadora?: string;
  codigoAutorizacaoPagamento?: string;
}

export interface Pagamento {
  id: string;
  usuarioId: string;
  mesReferencia?: string; // Descrição do pagamento (ex: "Renovação 60 dias - PIX")
  valor: number;
  dataVencimento?: Date; // Data de vencimento do boleto/pagamento
  dataPagamento?: Date | null; // Data em que foi pago
  status: "pendente" | "pago" | "vencido" | "cancelado";
  formaPagamento: "pix" | "cartao";
  diasComprados: number; // Dias adicionados à conta (60, 100, 180, 365, etc)
  tipoCompra: "60-dias" | "180-dias" | "renovacao-60" | "renovacao-100" | "renovacao-180" | "renovacao-365" | "renovacao-solicitada" | "personalizado";
  // Campos para aprovação do admin
  observacao_admin?: string;
  aprovado_por?: string;
  data_aprovacao?: Date;
}

export interface CodigoRecuperacao {
  email: string;
  codigo: string;
  expiracao: Date;
}

// =============================================
// MÓDULO ESTOQUE + FINANCEIRO INTEGRADO
// =============================================

export interface Loja {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'matriz' | 'filial';
  cnpj?: string;
  endereco?: string;
  ativo: boolean;
  created_at?: string;
}

export interface ItemNotaFiscal {
  id?: string;
  nota_fiscal_id?: string;
  user_id?: string;
  loja_id?: string;
  produto_id?: string;
  codigo_produto: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_ipi: number;
  valor_frete_rateado: number;
  custo_unitario_calculado: number;
}

export interface NotaFiscal {
  id?: string;
  user_id?: string;
  loja_id?: string;
  numero_nota: string;
  serie?: string;
  chave_acesso?: string;
  cnpj_emitente?: string;
  nome_emitente?: string;
  data_emissao?: string;
  valor_total: number;
  valor_frete: number;
  valor_ipi: number;
  valor_icms: number;
  valor_pis: number;
  valor_cofins: number;
  valor_desconto: number;
  valor_outros: number;
  xml_content?: string;
  status: 'processada' | 'pendente' | 'erro';
  created_at?: string;
  itens?: ItemNotaFiscal[];
}

export interface ContaPagar {
  id?: string;
  user_id?: string;
  loja_id?: string;
  nota_fiscal_id?: string;
  descricao: string;
  fornecedor?: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: 'a_pagar' | 'pago' | 'vencido';
  forma_pagamento?: string;
  parcela_numero: number;
  total_parcelas: number;
  observacoes?: string;
  created_at?: string;
}

export interface MovimentacaoEstoque {
  id?: string;
  user_id?: string;
  loja_origem_id?: string;
  loja_destino_id?: string;
  produto_id?: string;
  quantidade: number;
  tipo: 'entrada' | 'saida' | 'transferencia' | 'ajuste';
  motivo?: string;
  operador_nome?: string;
  nota_fiscal_id?: string;
  created_at?: string;
}

export interface MovimentacaoCaixa {
  id?: string;
  user_id?: string;
  loja_id?: string;
  tipo: 'sangria' | 'suprimento';
  valor: number;
  motivo?: string;
  operador_nome: string;
  data_hora?: string;
  created_at?: string;
}

// Produto enriquecido com campos de custo
export interface ProdutoEstoque extends Produto {
  loja_id?: string;
  custo_unitario?: number;
  ultimo_custo_compra?: number;
  custo_medio?: number;
  margem_lucro?: number;
  preco_venda?: number;
}

// =============================================
// MÓDULO ABERTURA/FECHAMENTO DE CAIXA (Opcional)
// =============================================

export interface RegistroCaixa {
  id?: string;
  operadorId: string;
  operadorNome: string;
  tipo: "abertura" | "fechamento";
  valorInicial?: number;
  valorFinal?: number;
  totalVendas?: number;
  totalDinheiro?: number;
  totalCredito?: number;
  totalDebito?: number;
  totalPix?: number;
  totalOutros?: number;
  quantidadeVendas?: number;
  observacoes?: string;
  dataHora?: string;
  createdAt?: string;
}

export interface ResumoCaixa {
  abertura?: RegistroCaixa;
  fechamento?: RegistroCaixa;
  vendas: {
    total: number;
    quantidade: number;
    porFormaPagamento: Record<string, number>;
  };
  contingencias?: number; // notas NFC-e pendentes de envio
}

// Interface para registrar ganhos do admin
export interface GanhoAdmin {
  id: string;
  tipo: "conta-criada" | "mensalidade-paga";
  usuarioId: string;
  usuarioNome: string;
  valor: number;
  formaPagamento: "cartao" | "pix";
  dataHora: Date;
  descricao: string;
}
