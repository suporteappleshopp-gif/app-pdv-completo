/**
 * Script para corrigir identificação do admin nas aprovações
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

async function corrigirIdentificacaoAdmin() {
  console.log("🔧 Corrigindo identificação do admin...\n");

  // 1. Verificar se existe admin no banco
  console.log("1️⃣ Verificando admin no banco de dados...");
  const { data: admins, error: adminError } = await supabase
    .from("operadores")
    .select("id, nome, email, is_admin, ativo, suspenso, auth_user_id")
    .eq("is_admin", true);

  if (adminError) {
    console.error("❌ Erro ao buscar admins:", adminError);
    return;
  }

  if (!admins || admins.length === 0) {
    console.error("❌ NENHUM ADMIN ENCONTRADO NO BANCO!");
    console.log("\n📝 Você precisa criar um admin primeiro.");
    console.log("Execute: npx tsx vincular-admin-diego.ts");
    return;
  }

  console.log(`✅ ${admins.length} admin(s) encontrado(s):`);
  admins.forEach((admin) => {
    console.log(`   - ${admin.nome} (${admin.email})`);
    console.log(`     ID: ${admin.id}`);
    console.log(`     Auth User ID: ${admin.auth_user_id || "Não vinculado"}`);
    console.log(`     Ativo: ${admin.ativo}, Suspenso: ${admin.suspenso}\n`);
  });

  // 2. Garantir que o admin está ativo
  const adminPrincipal = admins[0];
  if (!adminPrincipal.ativo || adminPrincipal.suspenso) {
    console.log("2️⃣ Ativando admin principal...");
    const { error: updateError } = await supabase
      .from("operadores")
      .update({
        ativo: true,
        suspenso: false,
      })
      .eq("id", adminPrincipal.id);

    if (updateError) {
      console.error("❌ Erro ao ativar admin:", updateError);
      return;
    }
    console.log("✅ Admin ativado com sucesso!\n");
  } else {
    console.log("✅ Admin já está ativo\n");
  }

  // 3. Verificar solicitações pendentes
  console.log("3️⃣ Verificando solicitações de renovação pendentes...");
  const { data: solicitacoes, error: solError } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("status", "pendente");

  if (solError) {
    console.error("❌ Erro ao buscar solicitações:", solError);
    return;
  }

  console.log(`✅ ${solicitacoes?.length || 0} solicitação(ões) pendente(s)\n`);

  if (solicitacoes && solicitacoes.length > 0) {
    console.log("📋 Detalhes das solicitações pendentes:");
    for (const sol of solicitacoes) {
      // Buscar dados do operador
      const { data: operador } = await supabase
        .from("operadores")
        .select("nome, email")
        .eq("id", sol.operador_id)
        .single();

      console.log(`   - ${operador?.nome || "Usuário"} (${operador?.email})`);
      console.log(`     Valor: R$ ${sol.valor}`);
      console.log(`     Forma: ${sol.forma_pagamento}`);
      console.log(`     Dias: ${sol.dias_solicitados}`);
      console.log(`     Data: ${new Date(sol.data_solicitacao).toLocaleString("pt-BR")}\n`);
    }
  }

  console.log("\n✅ DIAGNÓSTICO COMPLETO!");
  console.log("\n📊 RESUMO:");
  console.log(`   - Admin disponível: ${adminPrincipal.nome}`);
  console.log(`   - ID do admin: ${adminPrincipal.id}`);
  console.log(`   - Solicitações pendentes: ${solicitacoes?.length || 0}`);
  console.log("\n🔄 PRÓXIMOS PASSOS:");
  console.log("   1. Faça login como admin no sistema");
  console.log("   2. Acesse a página de Solicitações de Renovação");
  console.log("   3. Aprove as solicitações pendentes");
  console.log("\n💡 Se o erro persistir, verifique:");
  console.log("   - Se você está logado como admin");
  console.log("   - Se o localStorage está limpo (abra DevTools > Application > Local Storage)");
  console.log("   - Se o email do login corresponde ao email do admin no banco");
}

corrigirIdentificacaoAdmin().catch(console.error);
