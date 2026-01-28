/**
 * Sistema de Impressão Inteligente
 * Detecta dispositivo e imprime notas fiscais, NFC-e e cupons
 * Funciona mesmo sem dados da empresa configurados
 * Inclui opção de enviar pelo WhatsApp
 */

import { Venda, Empresa, ConfiguracaoNFCe } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Detectar tipo de dispositivo
export function detectarDispositivo(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  const isTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  return (isMobile || isTablet || isTouchScreen) ? "mobile" : "desktop";
}

// Gerar dados padrão da empresa se não configurado
function obterDadosEmpresa(): Empresa {
  const empresaSalva = localStorage.getItem("empresa");
  
  if (empresaSalva) {
    return JSON.parse(empresaSalva);
  }
  
  // Dados padrão se não configurado
  return {
    id: "empresa-1",
    nome: "EMPRESA NÃO CONFIGURADA",
    cnpj: "00.000.000/0000-00",
    inscricaoEstadual: "ISENTO",
    endereco: "Endereço não configurado",
    telefone: "(00) 00000-0000",
    email: "contato@empresa.com",
  };
}

// Gerar configurações padrão de NFC-e se não configurado
function obterConfigNFCe(): ConfiguracaoNFCe {
  const configSalva = localStorage.getItem("configNFCe");
  
  if (configSalva) {
    return JSON.parse(configSalva);
  }
  
  // Configurações padrão
  return {
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
  };
}

// Calcular impostos
function calcularImpostos(valor: number, config: ConfiguracaoNFCe) {
  const icms = (valor * config.aliquotaICMSPadrao) / 100;
  const pis = (valor * config.aliquotaPISPadrao) / 100;
  const cofins = (valor * config.aliquotaCOFINSPadrao) / 100;
  const totalImpostos = icms + pis + cofins;
  
  return {
    icms,
    pis,
    cofins,
    total: totalImpostos,
  };
}

// Gerar chave de acesso NFC-e (simulada)
function gerarChaveAcesso(venda: Venda, empresa: Empresa, config: ConfiguracaoNFCe): string {
  const uf = "35"; // São Paulo (padrão)
  const aamm = format(venda.dataHora, "yyMM");
  const cnpj = empresa.cnpj.replace(/\D/g, "").padStart(14, "0");
  const modelo = "65"; // NFC-e
  const serie = config.serieNFCe.padStart(3, "0");
  const numero = venda.numero.toString().padStart(9, "0");
  const tipoEmissao = "1"; // Normal
  const codigoNumerico = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
  
  const chave = `${uf}${aamm}${cnpj}${modelo}${serie}${numero}${tipoEmissao}${codigoNumerico}`;
  
  // Calcular dígito verificador (simplificado)
  const dv = (parseInt(chave) % 11).toString();
  
  return chave + dv;
}

// Gerar texto formatado para WhatsApp
function gerarTextoWhatsApp(venda: Venda, tipo: "cupom" | "nfce" | "completa"): string {
  const empresa = obterDadosEmpresa();
  const config = obterConfigNFCe();
  const impostos = calcularImpostos(venda.total, config);
  
  let texto = "";
  
  // Cabeçalho
  texto += `*${empresa.nome}*\n`;
  texto += `CNPJ: ${empresa.cnpj}\n`;
  if (empresa.inscricaoEstadual) texto += `IE: ${empresa.inscricaoEstadual}\n`;
  texto += `${empresa.endereco}\n`;
  if (empresa.telefone) texto += `Tel: ${empresa.telefone}\n`;
  texto += `\n`;
  
  // Tipo de nota
  if (tipo === "cupom") {
    texto += `*CUPOM FISCAL*\n`;
  } else if (tipo === "nfce") {
    texto += `*NFC-e - NOTA FISCAL DO CONSUMIDOR ELETRÔNICA*\n`;
  } else {
    texto += `*NOTA FISCAL DE VENDA*\n`;
  }
  texto += `\n`;
  
  // Dados da venda
  texto += `*Dados da Nota*\n`;
  texto += `Número: #${venda.numero.toString().padStart(6, "0")}\n`;
  texto += `Data: ${format(venda.dataHora, "dd/MM/yyyy", { locale: ptBR })}\n`;
  texto += `Hora: ${format(venda.dataHora, "HH:mm:ss", { locale: ptBR })}\n`;
  texto += `Operador: ${venda.operadorNome}\n`;
  if (venda.tipoPagamento) {
    const pagamento = venda.tipoPagamento === "dinheiro" ? "Dinheiro" : 
                      venda.tipoPagamento === "credito" ? "Crédito" : 
                      venda.tipoPagamento === "debito" ? "Débito" : 
                      venda.tipoPagamento === "pix" ? "PIX" : "Outros";
    texto += `Pagamento: ${pagamento}\n`;
  }
  texto += `\n`;
  
  // Produtos
  texto += `*Produtos*\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━\n`;
  venda.itens.forEach((item, index) => {
    texto += `${index + 1}. ${item.nome}\n`;
    texto += `   ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n`;
  });
  texto += `━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `\n`;
  
  // Impostos (apenas para NFC-e e completa)
  if (tipo === "nfce" || tipo === "completa") {
    texto += `*Tributos*\n`;
    texto += `ICMS (${config.aliquotaICMSPadrao}%): R$ ${impostos.icms.toFixed(2)}\n`;
    texto += `PIS (${config.aliquotaPISPadrao}%): R$ ${impostos.pis.toFixed(2)}\n`;
    texto += `COFINS (${config.aliquotaCOFINSPadrao}%): R$ ${impostos.cofins.toFixed(2)}\n`;
    texto += `Total Tributos: R$ ${impostos.total.toFixed(2)}\n`;
    texto += `\n`;
  }
  
  // Total
  texto += `*TOTAL: R$ ${venda.total.toFixed(2)}*\n`;
  texto += `\n`;
  
  // Mensagem final
  texto += `${config.mensagemNota}\n`;
  texto += `\n`;
  texto += `Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}\n`;
  
  return texto;
}

// Enviar nota pelo WhatsApp
export function enviarNotaWhatsApp(venda: Venda, tipo: "cupom" | "nfce" | "completa", numeroTelefone?: string) {
  const texto = gerarTextoWhatsApp(venda, tipo);
  const textoEncoded = encodeURIComponent(texto);
  
  let url = "";
  if (numeroTelefone) {
    // Remover caracteres não numéricos
    const numero = numeroTelefone.replace(/\D/g, "");
    url = `https://wa.me/${numero}?text=${textoEncoded}`;
  } else {
    // Abrir WhatsApp sem número específico
    url = `https://wa.me/?text=${textoEncoded}`;
  }
  
  window.open(url, "_blank");
}

// Imprimir Cupom Fiscal Simples (para mobile ou impressão rápida)
export function imprimirCupomFiscal(venda: Venda) {
  const dispositivo = detectarDispositivo();
  const empresa = obterDadosEmpresa();
  const config = obterConfigNFCe();
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cupom Fiscal #${venda.numero}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          max-width: ${dispositivo === "mobile" ? "100%" : "300px"};
          margin: ${dispositivo === "mobile" ? "0" : "20px auto"};
          padding: 10px;
          font-size: ${dispositivo === "mobile" ? "14px" : "12px"};
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        
        .header h2 {
          font-size: ${dispositivo === "mobile" ? "18px" : "16px"};
          margin-bottom: 5px;
        }
        
        .info {
          margin: 10px 0;
          font-size: ${dispositivo === "mobile" ? "13px" : "11px"};
        }
        
        .info p {
          margin: 3px 0;
        }
        
        .items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 10px 0;
          margin: 10px 0;
        }
        
        .item {
          margin: 8px 0;
        }
        
        .item-nome {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .item-detalhes {
          display: flex;
          justify-content: space-between;
          font-size: ${dispositivo === "mobile" ? "12px" : "11px"};
        }
        
        .total {
          font-size: ${dispositivo === "mobile" ? "20px" : "16px"};
          font-weight: bold;
          text-align: right;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: ${dispositivo === "mobile" ? "12px" : "10px"};
          border-top: 2px dashed #000;
          padding-top: 10px;
        }
        
        .aviso {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          font-size: ${dispositivo === "mobile" ? "12px" : "10px"};
          text-align: center;
        }
        
        @media print {
          body {
            max-width: 300px;
            font-size: 12px;
          }
          .aviso {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${empresa.nome}</h2>
        <p>CNPJ: ${empresa.cnpj}</p>
        ${empresa.inscricaoEstadual ? `<p>IE: ${empresa.inscricaoEstadual}</p>` : ""}
        <p>${empresa.endereco}</p>
        ${empresa.telefone ? `<p>Tel: ${empresa.telefone}</p>` : ""}
        <p style="margin-top: 10px; font-weight: bold;">CUPOM FISCAL</p>
      </div>
      
      ${empresa.nome === "EMPRESA NÃO CONFIGURADA" ? `
        <div class="aviso">
          ⚠️ Configure os dados da empresa em Empresa > Configurações
        </div>
      ` : ""}
      
      <div class="info">
        <p><strong>Cupom:</strong> #${venda.numero.toString().padStart(6, "0")}</p>
        <p><strong>Data:</strong> ${format(venda.dataHora, "dd/MM/yyyy", { locale: ptBR })}</p>
        <p><strong>Hora:</strong> ${format(venda.dataHora, "HH:mm:ss", { locale: ptBR })}</p>
        <p><strong>Operador:</strong> ${venda.operadorNome}</p>
        ${venda.tipoPagamento ? `<p><strong>Pagamento:</strong> ${venda.tipoPagamento === "dinheiro" ? "Dinheiro" : venda.tipoPagamento === "credito" ? "Crédito" : venda.tipoPagamento === "debito" ? "Débito" : venda.tipoPagamento === "pix" ? "PIX" : "Outros"}</p>` : ""}
      </div>
      
      <div class="items">
        ${venda.itens
          .map(
            (item) => `
          <div class="item">
            <div class="item-nome">${item.nome}</div>
            <div class="item-detalhes">
              <span>${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)}</span>
              <span>R$ ${item.subtotal.toFixed(2)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="total">
        TOTAL: R$ ${venda.total.toFixed(2)}
      </div>
      
      <div class="footer">
        <p>${config.mensagemNota}</p>
        <p style="margin-top: 10px;">${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
        <p style="margin-top: 5px; font-size: ${dispositivo === "mobile" ? "10px" : "9px"};">
          Documento auxiliar - Não é documento fiscal
        </p>
      </div>
      
      <script>
        window.onload = function() {
          ${dispositivo === "desktop" ? "window.print();" : ""}
          ${dispositivo === "desktop" ? "setTimeout(() => window.close(), 500);" : ""}
        }
      </script>
    </body>
    </html>
  `;
  
  if (dispositivo === "mobile") {
    // Mobile: abrir em nova aba para usuário escolher como imprimir
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  } else {
    // Desktop: imprimir automaticamente
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  }
}

// Imprimir NFC-e Completa (Nota Fiscal do Consumidor Eletrônica)
export function imprimirNFCe(venda: Venda) {
  const dispositivo = detectarDispositivo();
  const empresa = obterDadosEmpresa();
  const config = obterConfigNFCe();
  const impostos = calcularImpostos(venda.total, config);
  const chaveAcesso = gerarChaveAcesso(venda, empresa, config);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NFC-e #${venda.numero}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          max-width: ${dispositivo === "mobile" ? "100%" : "300px"};
          margin: ${dispositivo === "mobile" ? "0" : "20px auto"};
          padding: 10px;
          font-size: ${dispositivo === "mobile" ? "13px" : "11px"};
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        
        .header h2 {
          font-size: ${dispositivo === "mobile" ? "16px" : "14px"};
          margin-bottom: 5px;
        }
        
        .nfce-title {
          font-weight: bold;
          font-size: ${dispositivo === "mobile" ? "14px" : "12px"};
          margin: 10px 0;
        }
        
        .info {
          margin: 8px 0;
          font-size: ${dispositivo === "mobile" ? "12px" : "10px"};
        }
        
        .info p {
          margin: 2px 0;
        }
        
        .section-title {
          font-weight: bold;
          margin-top: 10px;
          margin-bottom: 5px;
          border-bottom: 1px solid #000;
        }
        
        .items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 10px 0;
          margin: 10px 0;
        }
        
        .item {
          margin: 8px 0;
        }
        
        .item-nome {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .item-detalhes {
          display: flex;
          justify-content: space-between;
          font-size: ${dispositivo === "mobile" ? "11px" : "10px"};
        }
        
        .impostos {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 8px;
          margin: 10px 0;
          font-size: ${dispositivo === "mobile" ? "11px" : "10px"};
        }
        
        .impostos p {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        
        .total {
          font-size: ${dispositivo === "mobile" ? "18px" : "14px"};
          font-weight: bold;
          text-align: right;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        
        .chave-acesso {
          margin: 15px 0;
          padding: 10px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          word-break: break-all;
          font-size: ${dispositivo === "mobile" ? "10px" : "9px"};
          text-align: center;
        }
        
        .qrcode-placeholder {
          text-align: center;
          margin: 15px 0;
          padding: 20px;
          border: 2px dashed #000;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: ${dispositivo === "mobile" ? "11px" : "9px"};
          border-top: 2px dashed #000;
          padding-top: 10px;
        }
        
        .aviso {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          font-size: ${dispositivo === "mobile" ? "11px" : "9px"};
          text-align: center;
        }
        
        @media print {
          body {
            max-width: 300px;
            font-size: 11px;
          }
          .aviso {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${empresa.nome}</h2>
        <p>CNPJ: ${empresa.cnpj}</p>
        ${empresa.inscricaoEstadual ? `<p>IE: ${empresa.inscricaoEstadual}</p>` : ""}
        <p>${empresa.endereco}</p>
        ${empresa.telefone ? `<p>Tel: ${empresa.telefone}</p>` : ""}
        <div class="nfce-title">NFC-e - NOTA FISCAL DO CONSUMIDOR ELETRÔNICA</div>
        <p>Ambiente: ${config.ambiente === "producao" ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}</p>
      </div>
      
      ${empresa.nome === "EMPRESA NÃO CONFIGURADA" ? `
        <div class="aviso">
          ⚠️ ATENÇÃO: Configure os dados da empresa para emitir NFC-e válida<br>
          Acesse: Empresa > Configurações
        </div>
      ` : ""}
      
      <div class="info">
        <p class="section-title">DADOS DA NOTA</p>
        <p><strong>Número:</strong> ${venda.numero.toString().padStart(9, "0")}</p>
        <p><strong>Série:</strong> ${config.serieNFCe}</p>
        <p><strong>Data Emissão:</strong> ${format(venda.dataHora, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
        <p><strong>Operador:</strong> ${venda.operadorNome}</p>
        ${venda.tipoPagamento ? `<p><strong>Forma de Pagamento:</strong> ${venda.tipoPagamento === "dinheiro" ? "Dinheiro" : venda.tipoPagamento === "credito" ? "Crédito" : venda.tipoPagamento === "debito" ? "Débito" : venda.tipoPagamento === "pix" ? "PIX" : "Outros"}</p>` : ""}
        <p><strong>CFOP:</strong> ${config.cfopPadrao} - Venda de mercadoria</p>
      </div>
      
      <div class="items">
        <p class="section-title">PRODUTOS/SERVIÇOS</p>
        ${venda.itens
          .map(
            (item, index) => `
          <div class="item">
            <div class="item-nome">${index + 1}. ${item.nome}</div>
            <div class="item-detalhes">
              <span>Qtd: ${item.quantidade}</span>
              <span>Unit: R$ ${item.precoUnitario.toFixed(2)}</span>
              <span>Total: R$ ${item.subtotal.toFixed(2)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="impostos">
        <p class="section-title">TRIBUTOS</p>
        <p><span>ICMS (${config.aliquotaICMSPadrao}%):</span><span>R$ ${impostos.icms.toFixed(2)}</span></p>
        <p><span>PIS (${config.aliquotaPISPadrao}%):</span><span>R$ ${impostos.pis.toFixed(2)}</span></p>
        <p><span>COFINS (${config.aliquotaCOFINSPadrao}%):</span><span>R$ ${impostos.cofins.toFixed(2)}</span></p>
        <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 5px;">
          <span><strong>Total Tributos:</strong></span><span><strong>R$ ${impostos.total.toFixed(2)}</strong></span>
        </p>
        <p style="margin-top: 5px; font-size: ${dispositivo === "mobile" ? "10px" : "9px"};">
          Regime: ${config.regimeTributario === "simples" ? "Simples Nacional" : config.regimeTributario === "mei" ? "MEI" : "Lucro Real/Presumido"}
        </p>
      </div>
      
      <div class="total">
        VALOR TOTAL: R$ ${venda.total.toFixed(2)}
      </div>
      
      <div class="chave-acesso">
        <p style="font-weight: bold; margin-bottom: 5px;">CHAVE DE ACESSO</p>
        <p>${chaveAcesso}</p>
      </div>
      
      <div class="qrcode-placeholder">
        <p style="font-weight: bold; margin-bottom: 10px;">QR CODE</p>
        <p style="font-size: ${dispositivo === "mobile" ? "10px" : "9px"};">
          [QR Code seria gerado aqui]<br>
          Consulte pela Chave de Acesso
        </p>
      </div>
      
      <div class="info">
        <p class="section-title">INFORMAÇÕES COMPLEMENTARES</p>
        <p>${config.mensagemNota}</p>
        ${config.tokenCSC ? "" : `
          <p style="margin-top: 5px; color: #856404; font-size: ${dispositivo === "mobile" ? "10px" : "9px"};">
            ⚠️ Configure o Token CSC para validação da NFC-e
          </p>
        `}
      </div>
      
      <div class="footer">
        <p style="font-weight: bold;">CONSULTA VIA LEITOR DE QR CODE</p>
        <p style="margin-top: 5px;">Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
        <p style="margin-top: 10px; font-size: ${dispositivo === "mobile" ? "9px" : "8px"};">
          Documento auxiliar da Nota Fiscal de Consumidor Eletrônica<br>
          ${config.ambiente === "homologacao" ? "AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL" : ""}
        </p>
      </div>
      
      <script>
        window.onload = function() {
          ${dispositivo === "desktop" ? "window.print();" : ""}
          ${dispositivo === "desktop" ? "setTimeout(() => window.close(), 500);" : ""}
        }
      </script>
    </body>
    </html>
  `;
  
  if (dispositivo === "mobile") {
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  } else {
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  }
}

// Imprimir Nota Fiscal Completa (com mais detalhes)
export function imprimirNotaFiscalCompleta(venda: Venda) {
  const dispositivo = detectarDispositivo();
  const empresa = obterDadosEmpresa();
  const config = obterConfigNFCe();
  const impostos = calcularImpostos(venda.total, config);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nota Fiscal #${venda.numero}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          max-width: ${dispositivo === "mobile" ? "100%" : "800px"};
          margin: ${dispositivo === "mobile" ? "0" : "20px auto"};
          padding: 20px;
          font-size: ${dispositivo === "mobile" ? "14px" : "12px"};
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          border: 2px solid #000;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: ${dispositivo === "mobile" ? "22px" : "20px"};
          margin-bottom: 10px;
        }
        
        .header h2 {
          font-size: ${dispositivo === "mobile" ? "18px" : "16px"};
          margin-bottom: 5px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: ${dispositivo === "mobile" ? "1fr" : "1fr 1fr"};
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-box {
          border: 1px solid #000;
          padding: 15px;
        }
        
        .info-box h3 {
          font-size: ${dispositivo === "mobile" ? "14px" : "12px"};
          margin-bottom: 10px;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        
        .info-box p {
          margin: 5px 0;
          font-size: ${dispositivo === "mobile" ? "13px" : "11px"};
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .table th,
        .table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          font-size: ${dispositivo === "mobile" ? "12px" : "10px"};
        }
        
        .table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        
        .table td.right {
          text-align: right;
        }
        
        .totais {
          margin-top: 20px;
          border: 2px solid #000;
          padding: 15px;
        }
        
        .totais-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: ${dispositivo === "mobile" ? "14px" : "12px"};
        }
        
        .totais-row.destaque {
          font-size: ${dispositivo === "mobile" ? "18px" : "16px"};
          font-weight: bold;
          border-top: 2px solid #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #000;
          font-size: ${dispositivo === "mobile" ? "12px" : "10px"};
        }
        
        .aviso {
          background: #fff3cd;
          border: 2px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
          text-align: center;
          font-weight: bold;
        }
        
        @media print {
          body {
            max-width: 800px;
            font-size: 12px;
          }
          .aviso {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NOTA FISCAL DE VENDA</h1>
        <h2>${empresa.nome}</h2>
        <p>CNPJ: ${empresa.cnpj} | IE: ${empresa.inscricaoEstadual || "ISENTO"}</p>
        <p>${empresa.endereco}</p>
        <p>Tel: ${empresa.telefone} | Email: ${empresa.email}</p>
      </div>
      
      ${empresa.nome === "EMPRESA NÃO CONFIGURADA" ? `
        <div class="aviso">
          ⚠️ ATENÇÃO: Configure os dados da empresa em Empresa > Configurações<br>
          Esta nota não possui valor fiscal até a configuração completa
        </div>
      ` : ""}
      
      <div class="info-grid">
        <div class="info-box">
          <h3>DADOS DA NOTA</h3>
          <p><strong>Número:</strong> ${venda.numero.toString().padStart(6, "0")}</p>
          <p><strong>Série:</strong> ${config.serieNFCe}</p>
          <p><strong>Data/Hora:</strong> ${format(venda.dataHora, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
          <p><strong>Operador:</strong> ${venda.operadorNome}</p>
          ${venda.tipoPagamento ? `<p><strong>Forma de Pagamento:</strong> ${venda.tipoPagamento === "dinheiro" ? "Dinheiro" : venda.tipoPagamento === "credito" ? "Crédito" : venda.tipoPagamento === "debito" ? "Débito" : venda.tipoPagamento === "pix" ? "PIX" : "Outros"}</p>` : ""}
        </div>
        
        <div class="info-box">
          <h3>INFORMAÇÕES FISCAIS</h3>
          <p><strong>CFOP:</strong> ${config.cfopPadrao}</p>
          <p><strong>Regime:</strong> ${config.regimeTributario === "simples" ? "Simples Nacional" : config.regimeTributario === "mei" ? "MEI" : "Lucro Real/Presumido"}</p>
          <p><strong>Ambiente:</strong> ${config.ambiente === "producao" ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}</p>
        </div>
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th style="width: 10%;">Item</th>
            <th style="width: 40%;">Descrição</th>
            <th style="width: 10%;">Qtd</th>
            <th style="width: 15%;">Valor Unit.</th>
            <th style="width: 10%;">ICMS</th>
            <th style="width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${venda.itens
            .map(
              (item, index) => {
                const icmsItem = (item.subtotal * config.aliquotaICMSPadrao) / 100;
                return `
                <tr>
                  <td class="right">${index + 1}</td>
                  <td>${item.nome}</td>
                  <td class="right">${item.quantidade}</td>
                  <td class="right">R$ ${item.precoUnitario.toFixed(2)}</td>
                  <td class="right">R$ ${icmsItem.toFixed(2)}</td>
                  <td class="right">R$ ${item.subtotal.toFixed(2)}</td>
                </tr>
              `;
              }
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="totais">
        <div class="totais-row">
          <span>Subtotal dos Produtos:</span>
          <span>R$ ${venda.total.toFixed(2)}</span>
        </div>
        <div class="totais-row">
          <span>ICMS (${config.aliquotaICMSPadrao}%):</span>
          <span>R$ ${impostos.icms.toFixed(2)}</span>
        </div>
        <div class="totais-row">
          <span>PIS (${config.aliquotaPISPadrao}%):</span>
          <span>R$ ${impostos.pis.toFixed(2)}</span>
        </div>
        <div class="totais-row">
          <span>COFINS (${config.aliquotaCOFINSPadrao}%):</span>
          <span>R$ ${impostos.cofins.toFixed(2)}</span>
        </div>
        <div class="totais-row">
          <span>Total de Tributos:</span>
          <span>R$ ${impostos.total.toFixed(2)}</span>
        </div>
        <div class="totais-row destaque">
          <span>VALOR TOTAL DA NOTA:</span>
          <span>R$ ${venda.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="info-box" style="margin-top: 20px;">
        <h3>INFORMAÇÕES COMPLEMENTARES</h3>
        <p>${config.mensagemNota}</p>
        <p style="margin-top: 10px; font-size: ${dispositivo === "mobile" ? "11px" : "9px"};">
          Tributos aproximados conforme Lei 12.741/2012
        </p>
      </div>
      
      <div class="footer">
        <p style="font-weight: bold; margin-bottom: 10px;">
          ${empresa.nome}
        </p>
        <p>Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
        <p style="margin-top: 10px;">
          ${config.ambiente === "homologacao" ? "DOCUMENTO EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL" : ""}
        </p>
      </div>
      
      <script>
        window.onload = function() {
          ${dispositivo === "desktop" ? "window.print();" : ""}
          ${dispositivo === "desktop" ? "setTimeout(() => window.close(), 500);" : ""}
        }
      </script>
    </body>
    </html>
  `;
  
  if (dispositivo === "mobile") {
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  } else {
    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  }
}
