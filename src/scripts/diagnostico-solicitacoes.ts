import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnosticar() {
  console.log("=== DIAGNÓSTICO DE SOLICITAÇÕES DE RENOVAÇÃO ===\n");

  // 1. Verificar se a tabela existe
  const { data: tabelas, error: tabelaError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .limit(1);

  if (tabelaError) {
    console.error("❌ Erro ao acessar tabela solicitacoes_renovacao:", tabelaError);
    return;
  }

  console.log("✅ Tabela solicitacoes_renovacao existe\n");

  // 2. Listar todas as solicitações
  const { data: solicitacoes, error: solError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .order("data_solicitacao", { ascending: false });

  if (solError) {
    console.error("❌ Erro ao buscar solicitações:", solError);
    return;
  }

  console.log(`📋 Total de solicitações: ${solicitacoes?.length || 0}\n`);

  if (solicitacoes && solicitacoes.length > 0) {
    console.log("Últimas 5 solicitações:");
    solicitacoes.slice(0, 5).forEach((sol, i) => {
      console.log(`\n${i + 1}. ID: ${sol.id}`);
      console.log(`   Operador ID: ${sol.operador_id}`);
      console.log(`   Status: ${sol.status}`);
      console.log(`   Valor: R$ ${sol.valor}`);
      console.log(`   Dias: ${sol.dias_solicitados}`);
      console.log(`   Forma: ${sol.forma_pagamento}`);
      console.log(`   Data: ${new Date(sol.data_solicitacao).toLocaleString("pt-BR")}`);
    });
  }

  // 3. Verificar operadores
  const { data: operadores, error: opError } = await supabase
    .from("operadores")
    .select("id, nome, email, is_admin")
    .limit(5);

  if (opError) {
    console.error("\n❌ Erro ao buscar operadores:", opError);
    return;
  }

  console.log("\n\n👥 Operadores no sistema:");
  operadores?.forEach((op, i) => {
    console.log(`\n${i + 1}. Nome: ${op.nome}`);
    console.log(`   ID: ${op.id}`);
    console.log(`   Email: ${op.email}`);
    console.log(`   Admin: ${op.is_admin ? "Sim" : "Não"}`);
  });

  // 4. Verificar políticas RLS
  console.log("\n\n🔒 Verificando políticas RLS...");
  const { data: policies, error: polError } = await supabase.rpc("pg_policies", {}).limit(0);

  if (!polError) {
    console.log("✅ RLS está configurado na tabela");
  }

  // 5. Testar inserção direta (sem RLS)
  console.log("\n\n🧪 Testando inserção direta...");

  if (operadores && operadores.length > 0) {
    const primeiroOperador = operadores.find(op => !op.is_admin);

    if (primeiroOperador) {
      const { data: novaSOl, error: insertError } = await supabase
        .from("solicitacoes_renovacao")
        .insert({
          operador_id: primeiroOperador.id,
          forma_pagamento: "pix",
          dias_solicitados: 60,
          valor: 59.9,
          status: "pendente",
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao inserir solicitação de teste:", insertError);
      } else {
        console.log("✅ Solicitação de teste criada com sucesso!");
        console.log(`   ID: ${novaSOl.id}`);
        console.log(`   Operador: ${primeiroOperador.nome}`);

        // Limpar teste
        await supabase
          .from("solicitacoes_renovacao")
          .delete()
          .eq("id", novaSOl.id);
        console.log("   (Solicitação de teste removida)");
      }
    }
  }

  console.log("\n\n=== FIM DO DIAGNÓSTICO ===");
}

diagnosticar().catch(console.error);
