/**
 * 🧪 TESTE: Criação de solicitação de renovação
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

async function testarCriacaoSolicitacao() {
  console.log("🧪 TESTE: Criação de Solicitação de Renovação\n");
  console.log("=".repeat(70));

  const joelmaId = "user-1770008567175-qgfr9e3ql";

  // 1. Verificar se Joelma pode criar solicitações
  console.log("\n1. VERIFICAR USUÁRIO:");
  const { data: joelma, error: joelmaError } = await supabase
    .from("operadores")
    .select("*")
    .eq("id", joelmaId)
    .single();

  if (!joelma || joelmaError) {
    console.error("❌ Erro ao buscar Joelma:", joelmaError);
    return;
  }

  console.log("✅ Usuário encontrado:");
  console.log(`   Nome: ${joelma.nome}`);
  console.log(`   Email: ${joelma.email}`);
  console.log(`   Ativo: ${joelma.ativo}`);

  // 2. Verificar solicitações existentes
  console.log("\n2. SOLICITAÇÕES EXISTENTES:");
  const { data: solicitacoes, error: solError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("operador_id", joelmaId)
    .order("data_solicitacao", { ascending: false });

  if (solError) {
    console.error("❌ Erro ao buscar solicitações:", solError);
  } else {
    console.log(`   Total: ${solicitacoes?.length || 0} solicitações`);
    if (solicitacoes && solicitacoes.length > 0) {
      solicitacoes.forEach((sol: any, idx: number) => {
        console.log(`   ${idx + 1}. Status: ${sol.status} | Dias: ${sol.dias_solicitados} | Data: ${new Date(sol.data_solicitacao).toLocaleString("pt-BR")}`);
      });
    }
  }

  // 3. Criar nova solicitação
  console.log("\n3. CRIAR NOVA SOLICITAÇÃO:");
  const novaSolicitacao = {
    operador_id: joelmaId,
    forma_pagamento: "pix",
    dias_solicitados: 60,
    valor: 59.90,
    status: "pendente",
  };

  console.log("   Dados:", JSON.stringify(novaSolicitacao, null, 2));

  const { data: novaSol, error: criarError } = await supabase
    .from("solicitacoes_renovacao")
    .insert(novaSolicitacao)
    .select()
    .single();

  if (criarError) {
    console.error("❌ Erro ao criar solicitação:", criarError);
    console.error("   Código:", criarError.code);
    console.error("   Detalhes:", criarError.details);
    console.error("   Mensagem:", criarError.message);
    return;
  }

  console.log("✅ Solicitação criada com sucesso!");
  console.log(`   ID: ${novaSol.id}`);
  console.log(`   Status: ${novaSol.status}`);
  console.log(`   Dias: ${novaSol.dias_solicitados}`);
  console.log(`   Valor: R$ ${novaSol.valor}`);

  // 4. Verificar se admin pode ver
  console.log("\n4. VERIFICAR SE ADMIN PODE VER:");
  const { data: todasSol, error: adminError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("status", "pendente");

  if (adminError) {
    console.error("❌ Erro ao buscar como admin:", adminError);
  } else {
    console.log(`✅ Admin pode ver ${todasSol?.length || 0} solicitação(ões) pendente(s)`);
  }

  // 5. Verificar se usuário pode ver sua própria solicitação
  console.log("\n5. VERIFICAR SE USUÁRIO VÊ SUA SOLICITAÇÃO:");
  const { data: minhasSol, error: userError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("operador_id", joelmaId)
    .eq("status", "pendente");

  if (userError) {
    console.error("❌ Erro ao buscar como usuário:", userError);
  } else {
    console.log(`✅ Usuário vê ${minhasSol?.length || 0} solicitação(ões) pendente(s)`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ TESTE CONCLUÍDO!\n");
}

testarCriacaoSolicitacao().catch(console.error);
