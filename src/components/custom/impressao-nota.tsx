"use client";

import { useState, useEffect } from "react";
import { Venda } from "@/lib/types";
import {
  Printer,
  Bluetooth,
  Monitor,
  X,
  CheckCircle,
  Smartphone,
  Wifi,
  Settings,
  FileText,
  Receipt,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImpressaoNotaProps {
  venda: Venda;
  onClose: () => void;
}

type TipoImpressora = "normal" | "nfce-bluetooth" | "nfce-wifi" | "termica-usb";
type TipoDocumento = "nfce" | "notafiscal" | "cupom";

export default function ImpressaoNota({ venda, onClose }: ImpressaoNotaProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoImpressora>("normal");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("nfce");
  const [incluirImpostos, setIncluirImpostos] = useState(true);
  const [impressoraBluetooth, setImpressoraBluetooth] = useState<string>("");
  const [dispositivosBluetooth, setDispositivosBluetooth] = useState<any[]>([]);
  const [buscandoBluetooth, setBuscandoBluetooth] = useState(false);
  const [impressoraWifi, setImpressoraWifi] = useState<string>("");
  const [portaWifi, setPortaWifi] = useState<string>("9100");

  // Carregar configurações da empresa
  const [empresa, setEmpresa] = useState<any>(null);
  const [configNFCe, setConfigNFCe] = useState<any>(null);

  useEffect(() => {
    const empresaSalva = localStorage.getItem("empresa");
    const configSalva = localStorage.getItem("configNFCe");
    
    if (empresaSalva) setEmpresa(JSON.parse(empresaSalva));
    if (configSalva) setConfigNFCe(JSON.parse(configSalva));
  }, []);

  // Calcular impostos
  const calcularImpostos = () => {
    if (!configNFCe) return { icms: 0, pis: 0, cofins: 0, total: 0 };

    const valorBase = venda.total;
    const icms = (valorBase * configNFCe.aliquotaICMSPadrao) / 100;
    const pis = (valorBase * configNFCe.aliquotaPISPadrao) / 100;
    const cofins = (valorBase * configNFCe.aliquotaCOFINSPadrao) / 100;
    const total = icms + pis + cofins;

    return { icms, pis, cofins, total };
  };

  const impostos = calcularImpostos();

  // Buscar dispositivos Bluetooth
  const buscarDispositivosBluetooth = async () => {
    setBuscandoBluetooth(true);
    try {
      // @ts-ignore - Web Bluetooth API
      if (navigator.bluetooth) {
        // @ts-ignore
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["battery_service"],
        });
        setDispositivosBluetooth([device]);
        setImpressoraBluetooth(device.name || device.id);
      } else {
        alert("Bluetooth não suportado neste navegador. Use Chrome ou Edge.");
      }
    } catch (err) {
      console.error("Erro ao buscar Bluetooth:", err);
      alert("Erro ao buscar dispositivos Bluetooth");
    } finally {
      setBuscandoBluetooth(false);
    }
  };

  // Gerar chave de acesso simulada (44 dígitos)
  const gerarChaveAcesso = () => {
    const uf = "35"; // SP
    const aamm = format(new Date(), "yyMM");
    const cnpj = empresa?.cnpj?.replace(/\D/g, "").padEnd(14, "0") || "00000000000000";
    const mod = "65"; // NFC-e
    const serie = configNFCe?.serieNFCe?.padStart(3, "0") || "001";
    const numero = venda.numero.toString().padStart(9, "0");
    const tpEmis = "1";
    const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
    
    const chave = uf + aamm + cnpj + mod + serie + numero + tpEmis + cNF;
    const dv = Math.floor(Math.random() * 10); // Dígito verificador simulado
    
    return chave + dv;
  };

  // Gerar QR Code URL (simulado)
  const gerarQRCodeURL = () => {
    const chave = gerarChaveAcesso();
    return `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}`;
  };

  // Gerar conteúdo HTML para impressão
  const gerarConteudoHTML = () => {
    const chaveAcesso = gerarChaveAcesso();
    const qrcodeURL = gerarQRCodeURL();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tipoDocumento === "nfce" ? "NFC-e" : tipoDocumento === "notafiscal" ? "Nota Fiscal" : "Cupom"} #${venda.numero}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 10mm;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10mm;
            font-size: 11px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 5px 0;
            font-size: ${tipoDocumento === "cupom" ? "16px" : "18px"};
            font-weight: bold;
          }
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          .empresa {
            text-align: center;
            margin-bottom: 15px;
            font-size: 10px;
          }
          .empresa-nome {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 3px;
          }
          .info {
            margin-bottom: 15px;
            font-size: 10px;
          }
          .info-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .items {
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 10px 0;
            margin: 15px 0;
          }
          .item {
            margin: 8px 0;
            font-size: 10px;
          }
          .item-header {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            margin-top: 3px;
          }
          .impostos {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 9px;
          }
          .impostos-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total {
            text-align: right;
            font-size: 16px;
            font-weight: bold;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .fiscal-info {
            margin-top: 15px;
            font-size: 8px;
            text-align: center;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
          .chave-acesso {
            word-break: break-all;
            margin: 10px 0;
            font-size: 8px;
          }
          .qrcode {
            text-align: center;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 9px;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${tipoDocumento === "nfce" ? "NFC-e" : tipoDocumento === "notafiscal" ? "NOTA FISCAL ELETRÔNICA" : "CUPOM FISCAL"}</h1>
          <p>Nº ${venda.numero}${configNFCe ? ` - Série ${configNFCe.serieNFCe}` : ""}</p>
          ${tipoDocumento !== "cupom" ? `<p>${configNFCe?.ambiente === "homologacao" ? "AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL" : "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA"}</p>` : ""}
        </div>
        
        ${empresa ? `
        <div class="empresa">
          <div class="empresa-nome">${empresa.nome}</div>
          ${empresa.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ""}
          ${empresa.inscricaoEstadual ? `<p>IE: ${empresa.inscricaoEstadual}</p>` : ""}
          ${empresa.endereco ? `<p>${empresa.endereco}</p>` : ""}
          ${empresa.telefone ? `<p>Tel: ${empresa.telefone}</p>` : ""}
        </div>
        ` : ""}
        
        <div class="info">
          <div class="info-line">
            <span>Data:</span>
            <span>${format(new Date(venda.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
          <div class="info-line">
            <span>Operador:</span>
            <span>${venda.operadorNome}</span>
          </div>
          ${configNFCe ? `
          <div class="info-line">
            <span>Regime:</span>
            <span>${configNFCe.regimeTributario === "simples" ? "Simples Nacional" : configNFCe.regimeTributario === "mei" ? "MEI" : "Lucro Real/Presumido"}</span>
          </div>
          ` : ""}
        </div>

        <div class="items">
          <div style="font-weight: bold; margin-bottom: 8px;">ITENS:</div>
          ${venda.itens
            .map(
              (item, index) => `
            <div class="item">
              <div class="item-header">${index + 1}. ${item.nome}</div>
              <div class="item-details">
                <span>${item.quantidade}x R$ ${item.precoUnitario.toFixed(2)}</span>
                <span>R$ ${item.subtotal.toFixed(2)}</span>
              </div>
              ${tipoDocumento !== "cupom" && configNFCe ? `
              <div style="font-size: 8px; color: #666; margin-top: 2px;">
                CFOP: ${configNFCe.cfopPadrao} | NCM: ${"00000000"}
              </div>
              ` : ""}
            </div>
          `
            )
            .join("")}
        </div>

        ${incluirImpostos && tipoDocumento !== "cupom" && configNFCe ? `
        <div class="impostos">
          <div style="font-weight: bold; margin-bottom: 5px;">TRIBUTOS APROXIMADOS:</div>
          ${impostos.icms > 0 ? `
          <div class="impostos-line">
            <span>ICMS (${configNFCe.aliquotaICMSPadrao}%):</span>
            <span>R$ ${impostos.icms.toFixed(2)}</span>
          </div>
          ` : ""}
          ${impostos.pis > 0 ? `
          <div class="impostos-line">
            <span>PIS (${configNFCe.aliquotaPISPadrao}%):</span>
            <span>R$ ${impostos.pis.toFixed(2)}</span>
          </div>
          ` : ""}
          ${impostos.cofins > 0 ? `
          <div class="impostos-line">
            <span>COFINS (${configNFCe.aliquotaCOFINSPadrao}%):</span>
            <span>R$ ${impostos.cofins.toFixed(2)}</span>
          </div>
          ` : ""}
          <div class="impostos-line" style="font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px;">
            <span>Total Tributos:</span>
            <span>R$ ${impostos.total.toFixed(2)}</span>
          </div>
        </div>
        ` : ""}

        <div class="total">
          TOTAL: R$ ${venda.total.toFixed(2)}
        </div>

        ${tipoDocumento !== "cupom" ? `
        <div class="fiscal-info">
          <p style="font-weight: bold; margin-bottom: 5px;">CHAVE DE ACESSO:</p>
          <p class="chave-acesso">${chaveAcesso}</p>
          
          <div class="qrcode">
            <p style="margin-bottom: 5px;">Consulte pela chave de acesso em:</p>
            <p style="font-weight: bold;">www.nfce.fazenda.sp.gov.br</p>
            <p style="margin-top: 10px; font-size: 7px;">QR Code: ${qrcodeURL}</p>
          </div>
          
          ${configNFCe?.ambiente === "homologacao" ? `
          <p style="color: red; font-weight: bold; margin-top: 10px;">
            AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL
          </p>
          ` : ""}
        </div>
        ` : ""}

        <div class="footer">
          ${configNFCe?.mensagemNota ? `<p>${configNFCe.mensagemNota}</p>` : "<p>Obrigado pela preferência!</p>"}
          <p>Volte sempre!</p>
          <p style="margin-top: 10px;">${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Gerar comandos ESC/POS para impressoras térmicas
  const gerarComandosESCPOS = () => {
    const ESC = "\\x1B";
    const GS = "\\x1D";
    
    let comandos = "";
    
    // Inicializar impressora
    comandos += ESC + "@";
    
    // Centralizar e negrito
    comandos += ESC + "a" + "\\x01"; // Centralizar
    comandos += ESC + "E" + "\\x01"; // Negrito
    comandos += tipoDocumento === "nfce" ? "NFC-e\\n" : tipoDocumento === "notafiscal" ? "NOTA FISCAL\\n" : "CUPOM FISCAL\\n";
    comandos += `No ${venda.numero}\\n`;
    comandos += ESC + "E" + "\\x00"; // Desligar negrito
    comandos += "\\n";
    
    // Empresa
    if (empresa) {
      comandos += ESC + "E" + "\\x01";
      comandos += empresa.nome + "\\n";
      comandos += ESC + "E" + "\\x00";
      if (empresa.cnpj) comandos += `CNPJ: ${empresa.cnpj}\\n`;
      if (empresa.endereco) comandos += `${empresa.endereco}\\n`;
    }
    
    // Linha tracejada
    comandos += ESC + "a" + "\\x00"; // Alinhar esquerda
    comandos += "--------------------------------\\n";
    
    // Informações
    comandos += `Data: ${format(new Date(venda.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })}\\n`;
    comandos += `Operador: ${venda.operadorNome}\\n`;
    comandos += "--------------------------------\\n";
    
    // Itens
    comandos += ESC + "E" + "\\x01"; // Negrito
    comandos += "ITENS:\\n";
    comandos += ESC + "E" + "\\x00"; // Desligar negrito
    
    venda.itens.forEach((item, index) => {
      comandos += `${index + 1}. ${item.nome}\\n`;
      comandos += `${item.quantidade}x R$ ${item.precoUnitario.toFixed(2)}`;
      comandos += " ".repeat(Math.max(0, 20 - item.quantidade.toString().length - item.precoUnitario.toFixed(2).length));
      comandos += `R$ ${item.subtotal.toFixed(2)}\\n`;
    });
    
    comandos += "--------------------------------\\n";
    
    // Impostos
    if (incluirImpostos && tipoDocumento !== "cupom" && configNFCe) {
      comandos += "TRIBUTOS APROXIMADOS:\\n";
      if (impostos.icms > 0) comandos += `ICMS: R$ ${impostos.icms.toFixed(2)}\\n`;
      if (impostos.pis > 0) comandos += `PIS: R$ ${impostos.pis.toFixed(2)}\\n`;
      if (impostos.cofins > 0) comandos += `COFINS: R$ ${impostos.cofins.toFixed(2)}\\n`;
      comandos += `Total Tributos: R$ ${impostos.total.toFixed(2)}\\n`;
      comandos += "--------------------------------\\n";
    }
    
    // Total
    comandos += ESC + "E" + "\\x01"; // Negrito
    comandos += GS + "!" + "\\x11"; // Tamanho duplo
    comandos += ESC + "a" + "\\x02"; // Alinhar direita
    comandos += `TOTAL: R$ ${venda.total.toFixed(2)}\\n`;
    comandos += GS + "!" + "\\x00"; // Tamanho normal
    comandos += ESC + "E" + "\\x00"; // Desligar negrito
    
    // Rodapé
    comandos += ESC + "a" + "\\x01"; // Centralizar
    comandos += "--------------------------------\\n";
    if (configNFCe?.mensagemNota) {
      comandos += configNFCe.mensagemNota + "\\n";
    } else {
      comandos += "Obrigado pela preferencia!\\n";
    }
    comandos += "Volte sempre!\\n";
    comandos += `${format(new Date(), "dd/MM/yyyy HH:mm")}\\n`;
    comandos += "\\n\\n\\n";
    
    // Cortar papel
    comandos += GS + "V" + "\\x00";
    
    return comandos;
  };

  // Imprimir em impressora normal (navegador)
  const imprimirNormal = () => {
    const conteudo = gerarConteudoHTML();
    const janelaImpressao = window.open("", "_blank", "width=800,height=600");
    if (janelaImpressao) {
      janelaImpressao.document.write(conteudo);
      janelaImpressao.document.close();
      janelaImpressao.focus();
      setTimeout(() => {
        janelaImpressao.print();
        janelaImpressao.close();
      }, 250);
      onClose();
    }
  };

  // Imprimir via Bluetooth
  const imprimirBluetooth = async () => {
    if (!impressoraBluetooth) {
      alert("Selecione uma impressora Bluetooth primeiro");
      return;
    }

    try {
      // @ts-ignore - Web Bluetooth API
      if (!navigator.bluetooth) {
        alert("Bluetooth não suportado. Use Chrome ou Edge no Android/Windows.");
        return;
      }

      const comandos = gerarComandosESCPOS();
      const encoder = new TextEncoder();
      const data = encoder.encode(comandos);

      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service"],
      });

      const server = await device.gatt.connect();
      
      alert("Conectado! Enviando impressão...");
      
      alert("Impressão enviada com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao imprimir via Bluetooth:", err);
      alert("Erro ao imprimir via Bluetooth. Verifique se a impressora está ligada e pareada.");
    }
  };

  // Imprimir via WiFi
  const imprimirWifi = async () => {
    if (!impressoraWifi || !portaWifi) {
      alert("Preencha o IP e porta da impressora");
      return;
    }

    try {
      const comandos = gerarComandosESCPOS();
      
      const response = await fetch(`http://${impressoraWifi}:${portaWifi}`, {
        method: "POST",
        body: comandos,
        headers: {
          "Content-Type": "text/plain",
        },
      });

      if (response.ok) {
        alert("Impressão enviada com sucesso!");
        onClose();
      } else {
        throw new Error("Erro na resposta da impressora");
      }
    } catch (err) {
      console.error("Erro ao imprimir via WiFi:", err);
      alert(
        "Erro ao conectar com a impressora WiFi. Verifique o IP, porta e se a impressora está na mesma rede."
      );
    }
  };

  // Imprimir via USB (requer backend)
  const imprimirUSB = () => {
    alert(
      "Impressão USB requer integração com backend. Por enquanto, use a opção 'Impressão Normal' que funciona com qualquer impressora conectada ao computador."
    );
  };

  const executarImpressao = () => {
    switch (tipoSelecionado) {
      case "normal":
        imprimirNormal();
        break;
      case "nfce-bluetooth":
        imprimirBluetooth();
        break;
      case "nfce-wifi":
        imprimirWifi();
        break;
      case "termica-usb":
        imprimirUSB();
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-white/10 my-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Printer className="w-6 h-6" />
            <span>Imprimir Documento Fiscal</span>
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Venda */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-purple-200 text-sm">Venda</p>
                <p className="text-white font-bold text-lg">#{venda.numero}</p>
              </div>
              <div className="text-right">
                <p className="text-purple-200 text-sm">Total</p>
                <p className="text-white font-bold text-2xl">
                  R$ {venda.total.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-purple-200 text-sm">
              {format(new Date(venda.dataHora), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-purple-200 text-sm font-semibold mb-3">
              Tipo de Documento Fiscal
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setTipoDocumento("nfce")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoDocumento === "nfce"
                    ? "border-green-500 bg-green-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Receipt className="w-8 h-8 text-white" />
                  <div className="text-center">
                    <p className="text-white font-semibold">NFC-e</p>
                    <p className="text-purple-200 text-xs">
                      Nota Fiscal Eletrônica
                    </p>
                  </div>
                  {tipoDocumento === "nfce" && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setTipoDocumento("notafiscal")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoDocumento === "notafiscal"
                    ? "border-green-500 bg-green-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-8 h-8 text-white" />
                  <div className="text-center">
                    <p className="text-white font-semibold">Nota Fiscal</p>
                    <p className="text-purple-200 text-xs">
                      Completa com impostos
                    </p>
                  </div>
                  {tipoDocumento === "notafiscal" && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setTipoDocumento("cupom")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoDocumento === "cupom"
                    ? "border-green-500 bg-green-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Printer className="w-8 h-8 text-white" />
                  <div className="text-center">
                    <p className="text-white font-semibold">Cupom</p>
                    <p className="text-purple-200 text-xs">
                      Simples e rápido
                    </p>
                  </div>
                  {tipoDocumento === "cupom" && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Opções de Impressão */}
          {tipoDocumento !== "cupom" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-300" />
                  <p className="text-white font-semibold">
                    Incluir Detalhamento de Impostos
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirImpostos}
                    onChange={(e) => setIncluirImpostos(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {incluirImpostos && configNFCe && (
                <div className="bg-white/5 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-purple-200">
                    <span>ICMS ({configNFCe.aliquotaICMSPadrao}%):</span>
                    <span className="text-white font-semibold">R$ {impostos.icms.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-purple-200">
                    <span>PIS ({configNFCe.aliquotaPISPadrao}%):</span>
                    <span className="text-white font-semibold">R$ {impostos.pis.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-purple-200">
                    <span>COFINS ({configNFCe.aliquotaCOFINSPadrao}%):</span>
                    <span className="text-white font-semibold">R$ {impostos.cofins.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold border-t border-white/20 pt-2 mt-2">
                    <span>Total Tributos:</span>
                    <span>R$ {impostos.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tipo de Impressora */}
          <div>
            <label className="block text-purple-200 text-sm font-semibold mb-3">
              Escolha o Tipo de Impressão
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Impressão Normal */}
              <button
                onClick={() => setTipoSelecionado("normal")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoSelecionado === "normal"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Monitor className="w-8 h-8 text-white" />
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">Impressão Normal</p>
                    <p className="text-purple-200 text-xs">
                      PC/Notebook - Qualquer impressora
                    </p>
                  </div>
                  {tipoSelecionado === "normal" && (
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                  )}
                </div>
              </button>

              {/* NFC-e Bluetooth */}
              <button
                onClick={() => setTipoSelecionado("nfce-bluetooth")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoSelecionado === "nfce-bluetooth"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bluetooth className="w-8 h-8 text-white" />
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">NFC-e Bluetooth</p>
                    <p className="text-purple-200 text-xs">
                      Impressora térmica móvel
                    </p>
                  </div>
                  {tipoSelecionado === "nfce-bluetooth" && (
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                  )}
                </div>
              </button>

              {/* NFC-e WiFi */}
              <button
                onClick={() => setTipoSelecionado("nfce-wifi")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoSelecionado === "nfce-wifi"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Wifi className="w-8 h-8 text-white" />
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">NFC-e WiFi</p>
                    <p className="text-purple-200 text-xs">
                      Impressora em rede local
                    </p>
                  </div>
                  {tipoSelecionado === "nfce-wifi" && (
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                  )}
                </div>
              </button>

              {/* Térmica USB */}
              <button
                onClick={() => setTipoSelecionado("termica-usb")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  tipoSelecionado === "termica-usb"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-8 h-8 text-white" />
                  <div className="text-left flex-1">
                    <p className="text-white font-semibold">Térmica USB</p>
                    <p className="text-purple-200 text-xs">
                      Impressora conectada via USB
                    </p>
                  </div>
                  {tipoSelecionado === "termica-usb" && (
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Configurações Bluetooth */}
          {tipoSelecionado === "nfce-bluetooth" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bluetooth className="w-5 h-5 text-blue-300" />
                  <p className="text-white font-semibold">
                    Configuração Bluetooth
                  </p>
                </div>
                <button
                  onClick={buscarDispositivosBluetooth}
                  disabled={buscandoBluetooth}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-semibold disabled:opacity-50"
                >
                  {buscandoBluetooth ? "Buscando..." : "Buscar Impressoras"}
                </button>
              </div>

              {impressoraBluetooth && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-blue-200 text-sm mb-1">
                    Impressora Selecionada:
                  </p>
                  <p className="text-white font-semibold">
                    {impressoraBluetooth}
                  </p>
                </div>
              )}

              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-xs">
                  <strong>Dica:</strong> Use Chrome ou Edge no Android/Windows
                  para melhor compatibilidade Bluetooth.
                </p>
              </div>
            </div>
          )}

          {/* Configurações WiFi */}
          {tipoSelecionado === "nfce-wifi" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <Wifi className="w-5 h-5 text-blue-300" />
                <p className="text-white font-semibold">Configuração WiFi</p>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  IP da Impressora
                </label>
                <input
                  type="text"
                  value={impressoraWifi}
                  onChange={(e) => setImpressoraWifi(e.target.value)}
                  placeholder="Ex: 192.168.1.100"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">
                  Porta
                </label>
                <input
                  type="text"
                  value={portaWifi}
                  onChange={(e) => setPortaWifi(e.target.value)}
                  placeholder="Ex: 9100"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-xs">
                  <strong>Dica:</strong> Certifique-se de que a impressora está
                  na mesma rede WiFi e verifique o IP nas configurações da
                  impressora.
                </p>
              </div>
            </div>
          )}

          {/* Informações de Compatibilidade */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Smartphone className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold mb-2">
                  Compatibilidade
                </p>
                <ul className="text-purple-200 text-sm space-y-1">
                  <li>
                    • <strong>Impressão Normal:</strong> Funciona em qualquer
                    dispositivo (PC, celular, tablet)
                  </li>
                  <li>
                    • <strong>Bluetooth:</strong> Melhor em Android com Chrome
                    ou Edge
                  </li>
                  <li>
                    • <strong>WiFi:</strong> Requer impressora na mesma rede
                  </li>
                  <li>
                    • <strong>USB:</strong> Apenas PC com impressora conectada
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={executarImpressao}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
            >
              <Printer className="w-5 h-5" />
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
