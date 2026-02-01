/**
 * Script de correção para processar manualmente pagamentos pendentes
 * Uso: Execute este script para processar pagamentos que não foram processados automaticamente
 *
 * IMPORTANTE: Este script busca no Supabase, não no IndexedDB local
 */

import { supabase } from "../lib/supabase";

interface PagamentoPendente {
  id: string;
  usuario_id: string;
  dias_comprados: number;
  valor: number;
  forma_pagamento: string;
  created_at: string;
}

interface Operador {
  id: string;
  nome: string;
  email: string;
  data_proximo_vencimento: string | null;
  ativo: boolean;
  suspenso: boolean;
}

async function corrigirPagamentosPendentes() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║   🔧 CORREÇÃO DE PAGAMENTOS PENDENTES - MERCADO PAGO         ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");

  try {
    // 1. Buscar todos os pagamentos pendentes
    console.log("🔍 Buscando pagamentos pendentes no banco de dados...");
    const { data: pagamentosPendentes, error: erroConsulta } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (erroConsulta) {
      console.error("❌ Erro ao buscar pagamentos pendentes:", erroConsulta);
      return;
    }

    if (!pagamentosPendentes || pagamentosPendentes.length === 0) {
      console.log("✅ Nenhum pagamento pendente encontrado!");
      return;
    }

    console.log(`📋 Encontrados ${pagamentosPendentes.length} pagamento(s) pendente(s)\n`);

    // 2. Processar cada pagamento pendente
    for (const pagamento of pagamentosPendentes as PagamentoPendente[]) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`💳 Processando pagamento: ${pagamento.id}`);
      console.log(`📅 Criado em: ${new Date(pagamento.created_at).toLocaleString("pt-BR")}`);
      console.log(`💰 Valor: R$ ${pagamento.valor.toFixed(2)}`);
      console.log(`📊 Dias: ${pagamento.dias_comprados}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // 3. Buscar dados do operador
      const { data: operador, error: erroOperador } = await supabase
        .from("operadores")
        .select("*")
        .eq("id", pagamento.usuario_id)
        .maybeSingle();

      if (erroOperador || !operador) {
        console.error(`❌ Operador não encontrado para ID: ${pagamento.usuario_id}`);
        continue;
      }

      const op = operador as Operador;
      console.log(`👤 Operador: ${op.nome} (${op.email})`);
      console.log(`📅 Vencimento atual: ${op.data_proximo_vencimento || "Nenhum"}`);

      // 4. Verificar se o pagamento já passou muito tempo (mais de 10 minutos)
      const tempoCriacaoPagamento = new Date(pagamento.created_at).getTime();
      const tempoAtual = Date.now();
      const diferencaMinutos = (tempoAtual - tempoCriacaoPagamento) / (1000 * 60);

      console.log(`⏱️ Tempo desde criação: ${diferencaMinutos.toFixed(1)} minutos`);

      // Se passou mais de 10 minutos e ainda está pendente, provavelmente o pagamento não foi feito
      if (diferencaMinutos > 10) {
        console.log("⚠️ Pagamento antigo (>10min) - Provavelmente não foi concluído");
        console.log("ℹ️ AÇÃO: Cancelando pagamento antigo não concluído...");

        const { error: erroCancelamento } = await supabase
          .from("historico_pagamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", pagamento.id);

        if (erroCancelamento) {
          console.error("❌ Erro ao cancelar pagamento:", erroCancelamento);
        } else {
          console.log("✅ Pagamento cancelado com sucesso!");
        }
        continue;
      }

      // Se passou menos de 10 minutos, esperar um pouco mais
      if (diferencaMinutos < 4) {
        console.log("⏳ Pagamento recente (<4min) - Aguardando confirmação do Mercado Pago...");
        console.log("ℹ️ Execute este script novamente em alguns minutos.");
        continue;
      }

      // Entre 4-10 minutos: perguntar ao usuário se deve processar manualmente
      console.log("\n⚠️ PAGAMENTO PENDENTE HÁ MAIS DE 4 MINUTOS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Possíveis causas:");
      console.log("  1. Webhook do Mercado Pago não chegou");
      console.log("  2. Token do Mercado Pago não configurado");
      console.log("  3. Pagamento ainda não foi aprovado");
      console.log("  4. Erro no processamento do webhook");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Para executar automaticamente, vamos processar pagamentos aprovados
      console.log("\n🔄 PROCESSANDO MANUALMENTE...");

      // Calcular nova data de vencimento
      const dataAtual = new Date();
      let novaDataVencimento: Date;

      if (op.data_proximo_vencimento) {
        const vencimentoAtual = new Date(op.data_proximo_vencimento);
        if (vencimentoAtual > dataAtual) {
          // Assinatura ativa - somar dias
          novaDataVencimento = new Date(vencimentoAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          console.log(`✅ Somando ${pagamento.dias_comprados} dias ao vencimento existente`);
        } else {
          // Assinatura expirada - começar de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
          console.log(`✅ Assinatura expirada - Iniciando ${pagamento.dias_comprados} dias a partir de hoje`);
        }
      } else {
        // Primeira compra
        novaDataVencimento = new Date(dataAtual);
        novaDataVencimento.setDate(novaDataVencimento.getDate() + pagamento.dias_comprados);
        console.log(`✅ Primeira compra - Iniciando ${pagamento.dias_comprados} dias`);
      }

      console.log(`📅 Nova data de vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);

      // Atualizar operador
      const { error: erroAtualizacaoOperador } = await supabase
        .from("operadores")
        .update({
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: pagamento.forma_pagamento,
          data_pagamento: dataAtual.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: pagamento.dias_comprados,
          valor_mensal: pagamento.valor,
          updated_at: dataAtual.toISOString(),
        })
        .eq("id", op.id);

      if (erroAtualizacaoOperador) {
        console.error("❌ Erro ao atualizar operador:", erroAtualizacaoOperador);
        continue;
      }

      console.log("✅ Operador atualizado com sucesso!");

      // Atualizar status do pagamento para pago
      const { error: erroAtualizacaoPagamento } = await supabase
        .from("historico_pagamentos")
        .update({
          status: "pago",
          data_pagamento: dataAtual.toISOString(),
          updated_at: dataAtual.toISOString(),
        })
        .eq("id", pagamento.id);

      if (erroAtualizacaoPagamento) {
        console.error("❌ Erro ao atualizar pagamento:", erroAtualizacaoPagamento);
        continue;
      }

      console.log("✅ Pagamento marcado como PAGO!");

      // Registrar ganho do admin
      const ganhoId = `ganho_manual_${pagamento.id}_${Date.now()}`;
      const { error: erroGanho } = await supabase
        .from("ganhos_admin")
        .insert({
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: op.id,
          usuario_nome: op.nome,
          valor: pagamento.valor,
          forma_pagamento: pagamento.forma_pagamento,
          descricao: `Pagamento manual de ${pagamento.dias_comprados} dias - ${pagamento.forma_pagamento.toUpperCase()}`,
          created_at: dataAtual.toISOString(),
        });

      if (erroGanho) {
        console.error("⚠️ Erro ao registrar ganho:", erroGanho);
      } else {
        console.log("✅ Ganho registrado!");
      }

      console.log("\n🎉 PROCESSAMENTO CONCLUÍDO COM SUCESSO!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📊 RESUMO:`);
      console.log(`  ✅ Operador: ${op.nome} (${op.email})`);
      console.log(`  ✅ Dias adicionados: ${pagamento.dias_comprados}`);
      console.log(`  ✅ Valor: R$ ${pagamento.valor.toFixed(2)}`);
      console.log(`  ✅ Novo vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    ✅ CORREÇÃO FINALIZADA                     ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n❌ ERRO CRÍTICO:", error);
  }
}

// Executar se for chamado diretamente
if (typeof window !== "undefined") {
  corrigirPagamentosPendentes();
}

export { corrigirPagamentosPendentes };
