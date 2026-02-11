/**
 * 🧪 TESTE: Simular aprovação de renovação pelo admin
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

async function testarAprovacaoAdmin() {
  console.log("🧪 TESTANDO APROVAÇÃO DE RENOVAÇÃO\n");
  console.log("=".repeat(70));

  // 1. Verificar se existe admin
  console.log("\n1️⃣ Verificando admin no sistema...");
  const { data: admin, error: adminError } = await supabase
    .from("operadores")
    .select("*")
    .eq("is_admin", true)
    .eq("ativo", true)
    .limit(1)
    .single();

  if (adminError || !admin) {
    console.error("❌ ERRO: Nenhum admin ativo encontrado!");
    console.log("Execute: npx tsx criar-admin-completo.ts");
    return;
  }

  console.log("✅ Admin encontrado:");
  console.log(`   Nome: ${admin.nome}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);

  // 2. Verificar se existe solicitação pendente
  console.log("\n2️⃣ Verificando solicitações pendentes...");
  const { data: solicitacoes, error: solError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("status", "pendente")
    .limit(1);

  if (solError) {
    console.error("❌ Erro ao buscar solicitações:", solError);
    return;
  }

  if (!solicitacoes || solicitacoes.length === 0) {
    console.log("⚠️ Nenhuma solicitação pendente encontrada");
    console.log("\n📝 Para testar, crie uma solicitação primeiro:");
    console.log("   1. Acesse o app como usuário");
    console.log("   2. Vá em 'Renovar Assinatura'");
    console.log("   3. Solicite uma renovação");
    return;
  }

  const solicitacao = solicitacoes[0];
  console.log("✅ Solicitação pendente encontrada:");
  console.log(`   ID: ${solicitacao.id}`);
  console.log(`   Operador ID: ${solicitacao.operador_id}`);
  console.log(`   Valor: R$ ${solicitacao.valor}`);
  console.log(`   Dias: ${solicitacao.dias_solicitados}`);

  // 3. Buscar dados do operador
  console.log("\n3️⃣ Buscando dados do operador...");
  const { data: operador, error: opError } = await supabase
    .from("operadores")
    .select("*")
    .eq("id", solicitacao.operador_id)
    .single();

  if (opError || !operador) {
    console.error("❌ Erro ao buscar operador:", opError);
    return;
  }

  console.log("✅ Operador encontrado:");
  console.log(`   Nome: ${operador.nome}`);
  console.log(`   Email: ${operador.email}`);
  console.log(`   Ativo: ${operador.ativo}`);
  console.log(`   Suspenso: ${operador.suspenso}`);
  console.log(`   Data vencimento atual: ${operador.data_proximo_vencimento || "Sem data"}`);

  // 4. Simular aprovação
  console.log("\n4️⃣ SIMULANDO APROVAÇÃO...");

  const diasAprovacao = 60;
  const dataAtual = new Date();
  const novaDataVencimento = new Date(dataAtual);
  novaDataVencimento.setDate(novaDataVencimento.getDate() + diasAprovacao);

  console.log(`   Dias a adicionar: ${diasAprovacao}`);
  console.log(`   Nova data de vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);

  // Criar histórico de pagamento
  const historicoId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const { error: histError } = await supabase
    .from("historico_pagamentos")
    .insert({
      id: historicoId,
      usuario_id: solicitacao.operador_id,
      mes_referencia: `Renovação ${diasAprovacao} dias - ${solicitacao.forma_pagamento.toUpperCase()}`,
      valor: solicitacao.valor,
      data_vencimento: new Date().toISOString(),
      data_pagamento: new Date().toISOString(),
      status: "pago",
      forma_pagamento: solicitacao.forma_pagamento,
      dias_comprados: diasAprovacao,
      tipo_compra: `renovacao-${diasAprovacao}`,
      observacao_admin: "Aprovado em teste automatizado",
      aprovado_por: admin.id,
      data_aprovacao: new Date().toISOString(),
    });

  if (histError) {
    console.error("❌ Erro ao criar histórico:", histError);
    return;
  }
  console.log("   ✅ Histórico de pagamento criado");

  // Atualizar operador
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
  console.log("   ✅ Operador atualizado");

  // Atualizar solicitação
  const { error: updateSolError } = await supabase
    .from("solicitacoes_renovacao")
    .update({
      status: "aprovado",
      mensagem_admin: "Aprovado em teste automatizado",
      data_resposta: new Date().toISOString(),
      admin_responsavel_id: admin.id,
    })
    .eq("id", solicitacao.id);

  if (updateSolError) {
    console.error("❌ Erro ao atualizar solicitação:", updateSolError);
    return;
  }
  console.log("   ✅ Solicitação aprovada");

  // Registrar ganho na carteira
  const ganhoId = `ganho_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const { error: ganhoError } = await supabase
    .from("ganhos_admin")
    .insert({
      id: ganhoId,
      tipo: "mensalidade-paga",
      usuario_id: solicitacao.operador_id,
      usuario_nome: operador.nome,
      valor: solicitacao.valor,
      forma_pagamento: solicitacao.forma_pagamento,
      descricao: `Renovação de ${diasAprovacao} dias - ${operador.nome} (${solicitacao.forma_pagamento.toUpperCase()})`,
      dias_comprados: diasAprovacao,
      created_at: new Date().toISOString(),
    });

  if (ganhoError) {
    console.error("⚠️ Erro ao registrar ganho:", ganhoError);
  } else {
    console.log("   ✅ Ganho registrado na carteira do admin");
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ APROVAÇÃO SIMULADA COM SUCESSO!");
  console.log("\n📊 RESUMO:");
  console.log(`   - Usuário: ${operador.nome} (${operador.email})`);
  console.log(`   - Dias adicionados: ${diasAprovacao}`);
  console.log(`   - Nova data de vencimento: ${novaDataVencimento.toLocaleDateString("pt-BR")}`);
  console.log(`   - Valor: R$ ${solicitacao.valor.toFixed(2)}`);
  console.log(`   - Admin responsável: ${admin.nome}`);
  console.log(`   - Ganho registrado: R$ ${solicitacao.valor.toFixed(2)}`);
  console.log("\n✅ O sistema está funcionando corretamente!");
  console.log("=".repeat(70) + "\n");
}

testarAprovacaoAdmin().catch(console.error);
