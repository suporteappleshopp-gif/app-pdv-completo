/**
 * 🔍 DIAGNÓSTICO: Por que usuários não conseguem acessar o app
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

async function diagnosticarAcessoUsuarios() {
  console.log("🔍 DIAGNÓSTICO: Acesso de Usuários ao App\n");
  console.log("=" .repeat(70));

  // Buscar todos os usuários não-admin
  const { data: usuarios, error } = await supabase
    .from("operadores")
    .select("*")
    .eq("is_admin", false)
    .order("created_at", { ascending: false });

  if (!usuarios || error) {
    console.error("❌ Erro ao buscar usuários:", error);
    return;
  }

  console.log(`\n📊 Total de usuários: ${usuarios.length}\n`);

  usuarios.forEach((user: any, idx: number) => {
    console.log(`${idx + 1}. ${user.nome} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   🔓 Ativo: ${user.ativo}`);
    console.log(`   ⏸️  Suspenso: ${user.suspenso}`);
    console.log(`   💳 Aguardando Pagamento: ${user.aguardando_pagamento}`);

    if (user.data_proximo_vencimento) {
      const hoje = new Date();
      const vencimento = new Date(user.data_proximo_vencimento);
      const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`   📅 Vencimento: ${vencimento.toLocaleDateString("pt-BR")}`);
      console.log(`   ⏱️  Dias Restantes: ${diasRestantes} dias`);

      // Verificar se deveria ter acesso
      const deveAcessar = user.ativo && !user.suspenso && diasRestantes > 0;
      console.log(`   ✅ Deve acessar o app? ${deveAcessar ? "SIM" : "NÃO"}`);

      if (!deveAcessar) {
        console.log(`   ⚠️  PROBLEMA DETECTADO:`);
        if (!user.ativo) console.log(`      - Usuário INATIVO (precisa ativar)`);
        if (user.suspenso) console.log(`      - Usuário SUSPENSO (precisa remover suspensão)`);
        if (diasRestantes <= 0) console.log(`      - Vencimento EXPIRADO (precisa renovar)`);
      }
    } else {
      console.log(`   📅 Vencimento: SEM DATA (aguardando pagamento)`);
      console.log(`   ✅ Deve acessar o app? NÃO (sem data de vencimento)`);
    }

    console.log("");
  });

  // Buscar solicitações pendentes
  console.log("\n📋 SOLICITAÇÕES DE RENOVAÇÃO PENDENTES:");
  const { data: pendentes } = await supabase
    .from("solicitacoes_renovacao")
    .select("*")
    .eq("status", "pendente");

  if (pendentes && pendentes.length > 0) {
    console.log(`   ${pendentes.length} solicitação(ões) aguardando aprovação do admin\n`);
    for (const sol of pendentes) {
      const usuario = usuarios.find((u: any) => u.id === sol.operador_id);
      console.log(`   - ${usuario?.nome || "Usuário"}: ${sol.dias_solicitados} dias (R$ ${sol.valor.toFixed(2)})`);
    }
  } else {
    console.log("   Nenhuma solicitação pendente");
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ DIAGNÓSTICO COMPLETO!\n");
}

diagnosticarAcessoUsuarios().catch(console.error);
