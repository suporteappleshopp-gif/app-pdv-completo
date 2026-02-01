import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Webhook do Mercado Pago para processar notificações de pagamento
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * IMPORTANTE: Este webhook processa TODOS os pagamentos automaticamente
 * - Adiciona dias à conta do usuário
 * - Registra no histórico de pagamentos
 * - Registra nos ganhos do admin
 * - Ativa a conta e remove flags de suspensão
 */
export async function POST(request: NextRequest) {
  const dataHoraRecebimento = new Date().toISOString();

  try {
    const body = await request.json();

    console.log("═══════════════════════════════════════════════════════");
    console.log("🔔 WEBHOOK MERCADO PAGO RECEBIDO");
    console.log("📅 Data/Hora:", dataHoraRecebimento);
    console.log("📦 Body completo:", JSON.stringify(body, null, 2));
    console.log("═══════════════════════════════════════════════════════");

    // Mercado Pago envia diferentes tipos de notificações
    // Tipo "payment" indica uma atualização de pagamento
    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("💳 PROCESSANDO PAGAMENTO");
      console.log("🆔 Payment ID:", paymentId);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        console.error("❌ ERRO CRÍTICO: MERCADOPAGO_ACCESS_TOKEN não configurado");
        console.error("⚠️ Verifique as variáveis de ambiente!");

        // ⚠️ FALLBACK: Marcar pagamento como "processando" para correção manual posterior
        console.log("🔄 Tentando marcar pagamento como processando para correção manual...");

        try {
          // Buscar pagamento pendente relacionado ao external_reference (se houver)
          const externalRef = body.external_reference || body.data?.external_reference;
          if (externalRef) {
            await supabase
              .from("historico_pagamentos")
              .update({ status: "processando" })
              .eq("usuario_id", externalRef)
              .eq("status", "pendente");
          }
        } catch (err) {
          console.error("Erro ao marcar como processando:", err);
        }

        return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
      }

      console.log("✅ Token de acesso encontrado");

      console.log("🌐 Fazendo requisição à API do Mercado Pago...");
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("📡 Status da resposta da API:", paymentResponse.status);

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error("❌ ERRO ao buscar pagamento no Mercado Pago");
        console.error("📛 Status code:", paymentResponse.status);
        console.error("📄 Resposta:", errorText);
        return NextResponse.json({ error: "Erro ao buscar pagamento" }, { status: 500 });
      }

      const payment = await paymentResponse.json();

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 DADOS DO PAGAMENTO OBTIDOS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🆔 ID:", payment.id);
      console.log("📊 Status:", payment.status);
      console.log("📝 Status Detail:", payment.status_detail);
      console.log("💰 Valor:", payment.transaction_amount);
      console.log("📧 Email Pagador:", payment.payer?.email);
      console.log("🔖 External Reference:", payment.external_reference);
      console.log("💳 Método de Pagamento:", payment.payment_method_id);
      console.log("🏦 Tipo de Pagamento:", payment.payment_type_id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Se o pagamento foi aprovado
      if (payment.status === "approved") {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ PAGAMENTO APROVADO!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // 🔥 CORREÇÃO: Buscar por external_reference (ID do usuário) em vez de email
        const usuarioId = payment.external_reference;
        const payerEmail = payment.payer?.email;

        console.log("🔍 Identificando usuário...");
        console.log("🆔 External Reference (Usuario ID):", usuarioId);
        console.log("📧 Email do pagador:", payerEmail);

        if (!usuarioId) {
          console.error("❌ ERRO: external_reference não encontrado no pagamento");
          console.error("📦 Dados completos:", JSON.stringify(payment, null, 2));
          return NextResponse.json({ error: "ID do usuário não encontrado no pagamento" }, { status: 400 });
        }

        console.log("👤 Buscando operador no banco com ID:", usuarioId);

        // Buscar operador no banco pelo ID (external_reference)
        const { data: operador, error: findError } = await supabase
          .from("operadores")
          .select("*")
          .eq("id", usuarioId)
          .maybeSingle();

        if (findError) {
          console.error("❌ ERRO ao buscar operador no banco:", findError.message);
          console.error("📦 Detalhes do erro:", JSON.stringify(findError, null, 2));
          return NextResponse.json({ error: "Erro ao buscar operador" }, { status: 500 });
        }

        if (!operador) {
          console.error("❌ OPERADOR NÃO ENCONTRADO");
          console.error("🆔 ID buscado:", usuarioId);
          console.error("⚠️ Verifique se o usuário existe no banco com este ID");
          return NextResponse.json({ error: "Operador não encontrado" }, { status: 404 });
        }

        console.log("✅ Operador encontrado:");
        console.log("🆔 ID:", operador.id);
        console.log("👤 Nome:", operador.nome);
        console.log("📧 Email:", operador.email);
        console.log("📅 Vencimento atual:", operador.data_proximo_vencimento || "Nenhum");

        // Verificar se este pagamento já foi processado (evitar duplicação)
        console.log("🔍 Verificando se pagamento já foi processado...");
        const { data: pagamentoDuplicado } = await supabase
          .from("historico_pagamentos")
          .select("id")
          .eq("mercadopago_payment_id", payment.id.toString())
          .maybeSingle();

        if (pagamentoDuplicado) {
          console.log("⚠️ PAGAMENTO JÁ PROCESSADO ANTERIORMENTE");
          console.log("🆔 ID do histórico existente:", pagamentoDuplicado.id);
          console.log("✅ Retornando sucesso (pagamento já foi creditado)");
          return NextResponse.json({
            success: true,
            message: "Pagamento já foi processado anteriormente",
            duplicate: true,
            historico_id: pagamentoDuplicado.id,
          });
        }

        console.log("✅ Pagamento ainda não foi processado. Continuando...");

        // Determinar dias e forma de pagamento baseado no valor
        const valorPago = payment.transaction_amount;
        let diasComprados = 60;
        let formaPagamento = "pix";

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💰 ANALISANDO VALOR DO PAGAMENTO");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💵 Valor pago:", valorPago);

        // Se valor é R$ 59,90 = PIX (60 dias)
        // Se valor é R$ 149,70 = Cartão (180 dias)
        if (valorPago >= 59 && valorPago <= 60) {
          diasComprados = 60;
          formaPagamento = "pix";
          console.log("✅ Identificado: PIX - R$ 59,90");
        } else if (valorPago >= 149 && valorPago <= 150) {
          diasComprados = 180;
          formaPagamento = "cartao";
          console.log("✅ Identificado: CARTÃO - R$ 149,70");
        } else {
          console.warn("⚠️ AVISO: Valor não corresponde aos planos padrão");
          console.warn("💰 Valor recebido:", valorPago);
          console.warn("📋 Será usado plano padrão: 60 dias PIX");
        }

        console.log("📊 Resumo do plano:");
        console.log("  - Forma de pagamento:", formaPagamento.toUpperCase());
        console.log("  - Dias comprados:", diasComprados);
        console.log("  - Valor:", `R$ ${valorPago.toFixed(2)}`);

        // IMPORTANTE: SOMAR dias à assinatura existente (não substituir)
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📅 CALCULANDO NOVA DATA DE VENCIMENTO");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const dataAtual = new Date();
        let novaDataVencimento: Date;

        console.log("📆 Data atual:", dataAtual.toISOString());
        console.log("📆 Vencimento no banco:", operador.data_proximo_vencimento || "Nenhum");

        // Se já tem data de vencimento E ainda não expirou, SOMAR os dias
        if (operador.data_proximo_vencimento) {
          const vencimentoAtual = new Date(operador.data_proximo_vencimento);

          console.log("🔍 Comparando datas:");
          console.log("  - Vencimento atual:", vencimentoAtual.toISOString());
          console.log("  - Data de hoje:", dataAtual.toISOString());

          // Se vencimento ainda está no futuro, somar a partir do vencimento atual
          if (vencimentoAtual > dataAtual) {
            novaDataVencimento = new Date(vencimentoAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
            console.log(`✅ ASSINATURA ATIVA - Somando ${diasComprados} dias ao vencimento atual`);
            console.log(`📅 De: ${vencimentoAtual.toLocaleDateString("pt-BR")}`);
            console.log(`📅 Para: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
          } else {
            // Se já expirou, começar de hoje
            novaDataVencimento = new Date(dataAtual);
            novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
            console.log(`⚠️ ASSINATURA EXPIRADA - Iniciando ${diasComprados} dias a partir de hoje`);
            console.log(`📅 Expirou em: ${vencimentoAtual.toLocaleDateString("pt-BR")}`);
            console.log(`📅 Novo vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
          }
        } else {
          // Primeira compra - começar de hoje
          novaDataVencimento = new Date(dataAtual);
          novaDataVencimento.setDate(novaDataVencimento.getDate() + diasComprados);
          console.log(`🆕 PRIMEIRA COMPRA - Iniciando ${diasComprados} dias a partir de hoje`);
          console.log(`📅 Vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
        }

        // Atualizar operador: ativar conta, remover flags de suspensão e SOMAR dias
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💾 ATUALIZANDO CONTA DO OPERADOR");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const dadosAtualizacao = {
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
          forma_pagamento: formaPagamento,
          data_pagamento: dataAtual.toISOString(),
          data_proximo_vencimento: novaDataVencimento.toISOString(),
          dias_assinatura: diasComprados,
          valor_mensal: valorPago,
          updated_at: new Date().toISOString(),
        };

        console.log("📝 Dados que serão atualizados:", JSON.stringify(dadosAtualizacao, null, 2));

        const { error: updateError } = await supabase
          .from("operadores")
          .update(dadosAtualizacao)
          .eq("id", operador.id);

        if (updateError) {
          console.error("❌ ERRO ao atualizar operador:", updateError.message);
          console.error("📦 Detalhes:", JSON.stringify(updateError, null, 2));
          return NextResponse.json({ error: "Erro ao ativar conta" }, { status: 500 });
        }

        console.log("✅ CONTA ATIVADA COM SUCESSO!");
        console.log("🆔 Usuario ID:", operador.id);
        console.log("👤 Nome:", operador.nome);
        console.log("📧 Email:", operador.email);
        console.log("📅 Novo vencimento:", novaDataVencimento.toLocaleDateString("pt-BR"));
        console.log(`📊 Dias adicionados: ${diasComprados}`);

        // 🔥 NOVO: Atualizar ou registrar no histórico de pagamentos
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📝 ATUALIZANDO HISTÓRICO DE PAGAMENTOS");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Primeiro, verificar se existe um pagamento pendente para atualizar
        const { data: pagamentosPendentes } = await supabase
          .from("historico_pagamentos")
          .select("*")
          .eq("usuario_id", operador.id)
          .eq("status", "pendente")
          .eq("dias_comprados", diasComprados)
          .order("created_at", { ascending: false })
          .limit(1);

        let historyError = null;

        if (pagamentosPendentes && pagamentosPendentes.length > 0) {
          // Atualizar o pagamento pendente para pago
          const pagamentoPendente = pagamentosPendentes[0];
          console.log("✅ Encontrado pagamento pendente:", pagamentoPendente.id);
          console.log("🔄 Atualizando status para PAGO...");

          const { error: updateError } = await supabase
            .from("historico_pagamentos")
            .update({
              status: "pago",
              data_pagamento: dataAtual.toISOString(),
              mercadopago_payment_id: payment.id.toString(),
              updated_at: dataAtual.toISOString(),
            })
            .eq("id", pagamentoPendente.id);

          historyError = updateError;

          if (!updateError) {
            console.log("✅ PAGAMENTO PENDENTE ATUALIZADO PARA PAGO!");
            console.log("🆔 ID do registro:", pagamentoPendente.id);
          }
        } else {
          // Criar novo registro se não houver pendente
          console.log("ℹ️ Nenhum pagamento pendente encontrado. Criando novo registro...");

          const pagamentoId = `mp_${payment.id}_${Date.now()}`;
          const dadosHistorico = {
            id: pagamentoId,
            usuario_id: operador.id,
            mes_referencia: `Renovação ${diasComprados} dias - ${formaPagamento.toUpperCase()}`,
            valor: valorPago,
            data_vencimento: novaDataVencimento.toISOString(),
            data_pagamento: dataAtual.toISOString(),
            status: "pago",
            forma_pagamento: formaPagamento,
            dias_comprados: diasComprados,
            tipo_compra: `renovacao-${diasComprados}`,
            mercadopago_payment_id: payment.id.toString(),
            created_at: dataAtual.toISOString(),
            updated_at: dataAtual.toISOString(),
          };

          console.log("📋 Dados do histórico:", JSON.stringify(dadosHistorico, null, 2));

          const { error: insertError } = await supabase
            .from("historico_pagamentos")
            .insert(dadosHistorico);

          historyError = insertError;

          if (!insertError) {
            console.log("✅ NOVO HISTÓRICO REGISTRADO!");
            console.log("🆔 ID do registro:", pagamentoId);
          }
        }

        if (historyError) {
          console.error("⚠️ ERRO ao processar histórico:", historyError.message);
          console.error("📦 Detalhes:", JSON.stringify(historyError, null, 2));
          // Não falhar o webhook por isso - conta já foi ativada
        }

        // 🔥 NOVO: Registrar nos ganhos do admin
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💰 REGISTRANDO GANHO DO ADMIN");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const ganhoId = `ganho_${payment.id}_${Date.now()}`;
        const dadosGanho = {
          id: ganhoId,
          tipo: "mensalidade-paga",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          valor: valorPago,
          forma_pagamento: formaPagamento,
          descricao: `Pagamento de ${diasComprados} dias via ${formaPagamento.toUpperCase()} - MP ID: ${payment.id}`,
          created_at: dataAtual.toISOString(),
        };

        console.log("📋 Dados do ganho:", JSON.stringify(dadosGanho, null, 2));

        const { error: ganhoError } = await supabase
          .from("ganhos_admin")
          .insert(dadosGanho);

        if (ganhoError) {
          console.error("⚠️ ERRO ao registrar ganho do admin:", ganhoError.message);
          console.error("📦 Detalhes:", JSON.stringify(ganhoError, null, 2));
          // Não falhar o webhook por isso
        } else {
          console.log("✅ GANHO REGISTRADO!");
          console.log("🆔 ID do ganho:", ganhoId);
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎉 PROCESSAMENTO CONCLUÍDO COM SUCESSO!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 RESUMO:");
        console.log("  ✅ Conta ativada:", operador.email);
        console.log("  ✅ Usuário:", operador.nome);
        console.log("  ✅ Dias adicionados:", diasComprados);
        console.log("  ✅ Novo vencimento:", novaDataVencimento.toLocaleDateString("pt-BR"));
        console.log("  ✅ Histórico registrado:", !historyError ? "SIM" : "NÃO");
        console.log("  ✅ Ganho registrado:", !ganhoError ? "SIM" : "NÃO");
        console.log("═══════════════════════════════════════════════════════");

        return NextResponse.json({
          success: true,
          message: "Pagamento processado e conta ativada automaticamente",
          usuario_id: operador.id,
          usuario_nome: operador.nome,
          email: operador.email,
          diasAdicionados: diasComprados,
          vencimento: novaDataVencimento.toISOString(),
          historico_registrado: !historyError,
          ganho_registrado: !ganhoError,
          payment_id: payment.id,
        });
      } else {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`⚠️ PAGAMENTO NÃO APROVADO`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Status:", payment.status);
        console.log("📝 Detalhes:", payment.status_detail);
        console.log("═══════════════════════════════════════════════════════");

        return NextResponse.json({
          success: false,
          message: `Pagamento com status: ${payment.status}`,
          status: payment.status,
          status_detail: payment.status_detail,
        });
      }
    }

    // Para outros tipos de notificação, apenas retornar sucesso
    console.log("ℹ️ Notificação de outro tipo recebida:", body.type);
    return NextResponse.json({ received: true, type: body.type });
  } catch (error: any) {
    console.error("═══════════════════════════════════════════════════════");
    console.error("❌ ERRO CRÍTICO NO WEBHOOK");
    console.error("═══════════════════════════════════════════════════════");
    console.error("🚨 Mensagem:", error.message);
    console.error("📦 Stack:", error.stack);
    console.error("═══════════════════════════════════════════════════════");

    return NextResponse.json(
      { error: "Erro ao processar webhook", details: error.message },
      { status: 500 }
    );
  }
}

// Permitir GET para teste
export async function GET() {
  return NextResponse.json({
    status: "Webhook Mercado Pago ativo",
    message: "Use POST para enviar notificações",
  });
}
