import { supabase } from "../lib/supabase";
import { db } from "../lib/db";

async function addDiegoPayment() {
  try {
    console.log("Iniciando adição de pagamento para diego2@gmail.com...");

    // Buscar operador no Supabase
    const { data: operador, error } = await supabase
      .from("operadores")
      .select("*")
      .eq("email", "diego2@gmail.com")
      .single();

    if (error || !operador) {
      console.error("Operador não encontrado:", error);
      return;
    }

    console.log("Operador encontrado:", operador);

    // Atualizar dias restantes no Supabase (99 dias)
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 99);

    const { error: updateError } = await supabase
      .from("operadores")
      .update({
        data_proximo_vencimento: dataVencimento.toISOString(),
        ativo: true,
        suspenso: false,
        aguardando_pagamento: false,
      })
      .eq("email", "diego2@gmail.com");

    if (updateError) {
      console.error("Erro ao atualizar operador:", updateError);
      return;
    }

    console.log("Operador atualizado com 99 dias restantes");

    // Adicionar pagamento no IndexedDB
    await db.init();

    const novoPagamento = {
      id: `pag_diego_${Date.now()}`,
      usuarioId: operador.id,
      mesReferencia: "Renovação 100 dias - PIX",
      valor: 59.90,
      dataVencimento: new Date(),
      dataPagamento: new Date(),
      status: "pago" as const,
      formaPagamento: "pix" as const,
      diasComprados: 100,
      tipoCompra: "renovacao-100" as const,
    };

    await db.addPagamento(novoPagamento);

    console.log("Pagamento adicionado com sucesso!");
    console.log(novoPagamento);
  } catch (error) {
    console.error("Erro ao processar:", error);
  }
}

// Executar apenas se for chamado diretamente
if (typeof window !== "undefined") {
  addDiegoPayment();
}

export { addDiegoPayment };
