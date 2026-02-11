/**
 * 🔧 CRIAR ADMIN COMPLETO NO SISTEMA
 * Este script cria o admin Diego com todos os campos corretos
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

async function criarAdminCompleto() {
  console.log("🔧 CRIANDO ADMIN COMPLETO NO SISTEMA\n");
  console.log("=".repeat(70));

  const email = "diegomarqueshm@icloud.com";
  const senha = "Sedexdez@1";
  const nome = "Diego Marques";

  // 1. Verificar se Diego já existe
  console.log("1️⃣ Verificando se admin já existe...");
  const { data: adminExistente, error: checkError } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (adminExistente) {
    console.log("⚠️ Admin já existe no banco!");
    console.log(`   ID: ${adminExistente.id}`);
    console.log(`   Nome: ${adminExistente.nome}`);
    console.log(`   is_admin: ${adminExistente.is_admin}`);
    console.log(`   auth_user_id: ${adminExistente.auth_user_id || "NULL"}`);

    // Atualizar para garantir que está como admin
    console.log("\n2️⃣ Atualizando admin para garantir configuração correta...");
    const { error: updateError } = await supabase
      .from("operadores")
      .update({
        is_admin: true,
        ativo: true,
        suspenso: false,
        aguardando_pagamento: false,
        senha: senha,
      })
      .eq("id", adminExistente.id);

    if (updateError) {
      console.error("❌ Erro ao atualizar admin:", updateError);
      return;
    }

    console.log("✅ Admin atualizado com sucesso!");

    // Se não tem auth_user_id, criar
    if (!adminExistente.auth_user_id) {
      console.log("\n3️⃣ Criando usuário Auth para o admin...");

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome: nome,
        },
      });

      if (authError) {
        console.error("❌ Erro ao criar Auth:", authError.message);
      } else if (authData.user) {
        console.log("✅ Auth criado:", authData.user.id);

        // Vincular auth_user_id
        const { error: linkError } = await supabase
          .from("operadores")
          .update({ auth_user_id: authData.user.id })
          .eq("id", adminExistente.id);

        if (linkError) {
          console.error("❌ Erro ao vincular auth:", linkError);
        } else {
          console.log("✅ Auth vinculado ao admin!");
        }
      }
    } else {
      console.log("✅ Admin já tem Auth vinculado");
    }
  } else {
    // Criar novo admin
    console.log("2️⃣ Criando novo admin...");

    // Primeiro criar no Auth
    console.log("   a) Criando usuário Auth...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome: nome,
      },
    });

    if (authError || !authData.user) {
      console.error("❌ Erro ao criar Auth:", authError?.message);
      return;
    }

    console.log("   ✅ Auth criado:", authData.user.id);

    // Criar na tabela operadores
    console.log("   b) Criando operador admin...");
    const { data: operadorData, error: operadorError } = await supabase
      .from("operadores")
      .insert({
        auth_user_id: authData.user.id,
        nome: nome,
        email: email,
        senha: senha,
        is_admin: true,
        ativo: true,
        suspenso: false,
        aguardando_pagamento: false,
      })
      .select()
      .single();

    if (operadorError) {
      console.error("❌ Erro ao criar operador:", operadorError);
      return;
    }

    console.log("   ✅ Operador admin criado:", operadorData.id);
  }

  // Verificação final
  console.log("\n4️⃣ VERIFICAÇÃO FINAL...");
  const { data: adminFinal, error: finalError } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", email)
    .single();

  if (finalError || !adminFinal) {
    console.error("❌ Erro na verificação final:", finalError);
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ ADMIN CRIADO E CONFIGURADO COM SUCESSO!");
  console.log("\n📋 DETALHES DO ADMIN:");
  console.log(`   ID: ${adminFinal.id}`);
  console.log(`   Nome: ${adminFinal.nome}`);
  console.log(`   Email: ${adminFinal.email}`);
  console.log(`   is_admin: ${adminFinal.is_admin}`);
  console.log(`   ativo: ${adminFinal.ativo}`);
  console.log(`   suspenso: ${adminFinal.suspenso}`);
  console.log(`   auth_user_id: ${adminFinal.auth_user_id || "NULL"}`);

  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("   1. Faça login no sistema com:");
  console.log(`      Email: ${email}`);
  console.log(`      Senha: ${senha}`);
  console.log("   2. Acesse o painel de Admin");
  console.log("   3. Clique em 'Solicitações de Renovação'");
  console.log("   4. Aprove as renovações pendentes");
  console.log("   5. Os dias serão creditados automaticamente!");
  console.log("\n" + "=".repeat(70) + "\n");
}

criarAdminCompleto().catch(console.error);
