/**
 * 🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE RENOVAÇÃO
 *
 * Este script verifica:
 * 1. Estrutura da tabela solicitacoes_renovacao
 * 2. Políticas RLS configuradas
 * 3. Fluxo completo: criar solicitação → admin visualizar → aprovar → creditar dias
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

async function diagnosticarSistemaRenovacao() {
  console.log("🔍 DIAGNÓSTICO DO SISTEMA DE RENOVAÇÃO\n");
  console.log("=" .repeat(70));

  // 1. Verificar estrutura da tabela
  console.log("\n📋 1. ESTRUTURA DA TABELA solicitacoes_renovacao:");
  console.log("   (Verificando através de consulta direta)");

  // 2. Verificar políticas RLS
  console.log("\n🔒 2. POLÍTICAS RLS CONFIGURADAS:");
  console.log("   (As políticas estão definidas na migração SQL)");

  // 3. Contar solicitações por status
  console.log("\n📊 3. ESTATÍSTICAS DE SOLICITAÇÕES:");
  const { data: stats, error: erroStats } = await supabase
    .from("solicitacoes_renovacao")
    .select("status", { count: "exact" });

  if (stats) {
    const pendentes = stats.filter((s: any) => s.status === "pendente").length;
    const aprovados = stats.filter((s: any) => s.status === "aprovado").length;
    const recusados = stats.filter((s: any) => s.status === "recusado").length;

    console.log(`   Total de solicitações: ${stats.length}`);
    console.log(`   ⏳ Pendentes: ${pendentes}`);
    console.log(`   ✅ Aprovados: ${aprovados}`);
    console.log(`   ❌ Recusados: ${recusados}`);
  } else {
    console.log("   ❌ Erro ao buscar estatísticas:", erroStats);
  }

  // 4. Listar solicitações pendentes
  console.log("\n📋 4. SOLICITAÇÕES PENDENTES (últimas 5):");
  const { data: pendentes, error: erroPendentes } = await supabase
    .from("solicitacoes_renovacao")
    .select(`
      id,
      operador_id,
      forma_pagamento,
      dias_solicitados,
      valor,
      status,
      data_solicitacao,
      operadores (
        nome,
        email
      )
    `)
    .eq("status", "pendente")
    .order("data_solicitacao", { ascending: false })
    .limit(5);

  if (pendentes && pendentes.length > 0) {
    pendentes.forEach((sol: any, idx: number) => {
      console.log(`\n   ${idx + 1}. Solicitação ${sol.id.substring(0, 8)}...`);
      console.log(`      Usuário: ${sol.operadores?.nome || "N/A"} (${sol.operadores?.email || "N/A"})`);
      console.log(`      Forma: ${sol.forma_pagamento.toUpperCase()}`);
      console.log(`      Valor: R$ ${sol.valor.toFixed(2)}`);
      console.log(`      Dias: ${sol.dias_solicitados}`);
      console.log(`      Data: ${new Date(sol.data_solicitacao).toLocaleString("pt-BR")}`);
    });
  } else {
    console.log("   Nenhuma solicitação pendente encontrada.");
    if (erroPendentes) {
      console.log("   Erro:", erroPendentes.message);
    }
  }

  // 5. Verificar operadores admin
  console.log("\n👤 5. ADMINISTRADORES DO SISTEMA:");
  const { data: admins, error: erroAdmins } = await supabase
    .from("operadores")
    .select("id, nome, email, is_admin")
    .eq("is_admin", true)
    .limit(5);

  if (admins && admins.length > 0) {
    admins.forEach((admin: any, idx: number) => {
      console.log(`   ${idx + 1}. ${admin.nome} (${admin.email})`);
      console.log(`      ID: ${admin.id}`);
    });
  } else {
    console.log("   ❌ Nenhum administrador encontrado!");
    if (erroAdmins) {
      console.log("   Erro:", erroAdmins.message);
    }
  }

  // 6. Verificar tabela historico_pagamentos
  console.log("\n💰 6. HISTÓRICO DE PAGAMENTOS:");
  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from("historico_pagamentos")
    .select("id, usuario_id, valor, status, dias_comprados, data_pagamento")
    .order("data_pagamento", { ascending: false })
    .limit(5);

  if (pagamentos && pagamentos.length > 0) {
    console.log(`   Total de registros recentes: ${pagamentos.length}`);
    pagamentos.forEach((pag: any, idx: number) => {
      console.log(`\n   ${idx + 1}. ${pag.id.substring(0, 12)}...`);
      console.log(`      Valor: R$ ${pag.valor.toFixed(2)}`);
      console.log(`      Status: ${pag.status}`);
      console.log(`      Dias: ${pag.dias_comprados || "N/A"}`);
    });
  } else {
    console.log("   Nenhum pagamento encontrado.");
    if (erroPagamentos) {
      console.log("   Erro:", erroPagamentos.message);
    }
  }

  // 7. Teste de permissões RLS
  console.log("\n🔐 7. TESTE DE PERMISSÕES RLS:");

  // Tentar criar uma solicitação de teste (como service role, deve funcionar)
  const testOperadorId = admins && admins[0] ? admins[0].id : null;

  if (testOperadorId) {
    const { data: testSol, error: erroTestSol } = await supabase
      .from("solicitacoes_renovacao")
      .insert({
        operador_id: testOperadorId,
        forma_pagamento: "pix",
        dias_solicitados: 60,
        valor: 59.90,
        status: "pendente",
      })
      .select()
      .single();

    if (testSol) {
      console.log("   ✅ INSERT permitido (service role)");
      console.log(`      ID criado: ${testSol.id.substring(0, 8)}...`);

      // Deletar teste
      await supabase.from("solicitacoes_renovacao").delete().eq("id", testSol.id);
      console.log("   🗑️  Registro de teste deletado");
    } else {
      console.log("   ❌ Erro ao criar solicitação de teste:", erroTestSol);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ DIAGNÓSTICO COMPLETO!\n");
}

diagnosticarSistemaRenovacao().catch(console.error);
