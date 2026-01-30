// Tipos do sistema PDV

export interface Operador {
  id: string;
  nome: string;
  email: string;
  senha: string;
  ativo: boolean;
  isAdmin: boolean;
  createdAt: Date;
  formaPagamento?: "cartao" | "pix" | "sem-mensalidade";
  valorMensal?: number;
  dataProximoVencimento?: Date;
  suspenso?: boolean;
  aguardandoPagamento?: boolean;
  dataExclusao?: Date; // Data em que o usuário foi excluído
  dataPagamento?: Date; // Data do último pagamento
  diasAssinatura?: number; // Total de dias da assinatura (365 para anual, 100 para PIX)
}

export interface Produto {
  id: string;
  nome: string;
  codigoBarras: string;
  preco: number;
  estoque: number;
  estoqueMinimo: number;
  categoria?: string;
  descricao?: string;
}

export interface ItemVenda {
  produtoId: string;
  nome: string;
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
}

export type TipoPagamento = "dinheiro" | "credito" | "debito" | "pix" | "outros";

export interface Venda {
  id: string;
  numero: number;
  operadorId: string;
  operadorNome: string;
  itens: ItemVenda[];
  total: number;
  dataHora: Date;
  devolucoes?: Devolucao[];
  status?: "concluida" | "cancelada";
  motivoCancelamento?: string;
  tipoPagamento?: TipoPagamento;
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
}

export interface Pagamento {
  id: string;
  usuarioId: string;
  mesReferencia: string;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  status: "pendente" | "pago";
  formaPagamento: "cartao" | "pix";
  diasComprados?: number; // Quantidade de dias adquiridos nesta compra
  tipoCompra?: "renovacao-100" | "renovacao-365" | "personalizado"; // Tipo de compra
}

export interface CodigoRecuperacao {
  email: string;
  codigo: string;
  expiracao: Date;
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
