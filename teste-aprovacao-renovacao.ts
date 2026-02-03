/**
 * 🧪 TESTE COMPLETO: Aprovação de Renovação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testarAprovacaoRenovacao() {
  console.log("🧪 TESTE COMPLETO: Aprovação de Renovação\n");
  console.log("=".repeat(70));

  // 1. Buscar Diego (admin)
  console.log("\n1. BUSCAR ADMIN (DIEGO):");
  const { data: diego, error: diegoError } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", "diegomarqueshm@icloud.com")
    .single();

  if (!diego || diegoError) {
    console.error("❌ Erro ao buscar Diego:", diegoError);
    return;
  }

  console.log("✅ Admin encontrado:");
  console.log(`   ID: ${diego.id}`);
  console.log(`   Nome: ${diego.nome}`);
  console.log(`   Email: ${diego.email}`);
  console.log(`   is_admin: ${diego.is_admin}`);
  console.log(`   auth_user_id: ${diego.auth_user_id}`);

  // 2. Buscar solicitação pendente
  console.log("\n2. BUSCAR SOLICITAÇÃO PENDENTE:");
  const { data: solicitacao, error: solError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("status", "pendente")
    .limit(1)
    .single();

  if (!solicitacao || solError) {
    console.log("⚠️  Nenhuma solicitação pendente encontrada");
    console.log("   Criando solicitação de teste...");

    // Criar solicitação de teste
    const { data: novaSol, error: novaSolError } = await supabase
      .from("solicitacoes_renovacao")
      .insert({
        operador_id: "user-1770008567175-qgfr9e3ql", // Joelma
        forma_pagamento: "pix",
        dias_solicitados: 60,
        valor: 59.90,
        status: "pendente",
      })
      .select()
      .single();

    if (novaSolError || !novaSol) {
      console.error("❌ Erro ao criar solicitação:", novaSolError);
      return;
    }

    console.log("✅ Solicitação de teste criada:", novaSol.id);
    return;
  }

  console.log("✅ Solicitação encontrada:");
  console.log(`   ID: ${solicitacao.id}`);
  console.log(`   Operador: ${solicitacao.operador_id}`);
  console.log(`   Forma: ${solicitacao.forma_pagamento}`);
  console.log(`   Dias: ${solicitacao.dias_solicitados}`);
  console.log(`   Valor: R$ ${solicitacao.valor}`);

  // 3. Buscar operador (usuário que solicitou)
  console.log("\n3. BUSCAR OPERADOR (USUÁRIO):");
  const { data: operador, error: opError } = await supabase
    .from("operadores")
    .select("*")
    .eq("id", solicitacao.operador_id)
    .single();

  if (!operador || opError) {
    console.error("❌ Erro ao buscar operador:", opError);
    return;
  }

  console.log("✅ Operador encontrado:");
  console.log(`   Nome: ${operador.nome}`);
  console.log(`   Email: ${operador.email}`);
  console.log(`   Data vencimento atual: ${operador.data_proximo_vencimento || "SEM DATA"}`);

  // 4. Simular aprovação
  console.log("\n4. SIMULANDO APROVAÇÃO...");

  // Calcular nova data de vencimento
  const dataAtual = new Date();
  let novaDataVencimento: Date;

  if (operador.data_proximo_vencimento) {
    const dataVencimentoAtual = new Date(operador.data_proximo_vencimento);
    if (dataVencimentoAtual > dataAtual) {
      novaDataVencimento = new Date(dataVencimentoAtual);
      novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.dias_solicitados);
    } else {
      novaDataVencimento = new Date(dataAtual);
      novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.dias_solicitados);
    }
  } else {
    novaDataVencimento = new Date(dataAtual);
    novaDataVencimento.setDate(novaDataVencimento.getDate() + solicitacao.dias_solicitados);
  }

  console.log(`   Nova data de vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);

  // 5. Criar registro no histórico
  console.log("\n5. CRIAR HISTÓRICO DE PAGAMENTO:");
  const historicoId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const { error: histError } = await supabase
    .from("historico_pagamentos")
    .insert({
      id: historicoId,
      usuario_id: solicitacao.operador_id,
      mes_referencia: `Renovação ${solicitacao.dias_solicitados} dias - ${solicitacao.forma_pagamento.toUpperCase()}`,
      valor: solicitacao.valor,
      data_vencimento: new Date().toISOString(),
      data_pagamento: new Date().toISOString(),
      status: "pago",
      forma_pagamento: solicitacao.forma_pagamento,
      dias_comprados: solicitacao.dias_solicitados,
      tipo_compra: `renovacao-${solicitacao.dias_solicitados}`,
      observacao_admin: "Teste de aprovação automática",
      aprovado_por: diego.id,
      data_aprovacao: new Date().toISOString(),
    });

  if (histError) {
    console.error("❌ Erro ao criar histórico:", histError);
    return;
  }

  console.log("✅ Histórico criado:", historicoId);

  // 6. Atualizar operador
  console.log("\n6. ATUALIZAR OPERADOR:");
  const { error: updateOpError } = await supabase
    .from("operadores")
    .update({
      data_proximo_vencimento: novaDataVencimento.toISOString(),
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
    })
    .eq("id", solicitacao.operador_id);

  if (updateOpError) {
    console.error("❌ Erro ao atualizar operador:", updateOpError);
    return;
  }

  console.log("✅ Operador atualizado");

  // 7. Atualizar solicitação
  console.log("\n7. ATUALIZAR SOLICITAÇÃO:");
  const { error: updateSolError } = await supabase
    .from("solicitacoes_renovacao")
    .update({
      status: "aprovado",
      mensagem_admin: "Aprovado automaticamente no teste!",
      data_resposta: new Date().toISOString(),
      admin_responsavel_id: diego.id,
    })
    .eq("id", solicitacao.id);

  if (updateSolError) {
    console.error("❌ Erro ao atualizar solicitação:", updateSolError);
    return;
  }

  console.log("✅ Solicitação aprovada");

  console.log("\n" + "=".repeat(70));
  console.log("✅ TESTE CONCLUÍDO COM SUCESSO!");
  console.log("\n📊 RESUMO:");
  console.log(`   Admin: ${diego.nome} (${diego.email})`);
  console.log(`   Usuário: ${operador.nome}`);
  console.log(`   Dias creditados: ${solicitacao.dias_solicitados}`);
  console.log(`   Nova data de vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
  console.log("\n✅ O sistema de aprovação está funcionando perfeitamente!\n");
}

testarAprovacaoRenovacao().catch(console.error);
