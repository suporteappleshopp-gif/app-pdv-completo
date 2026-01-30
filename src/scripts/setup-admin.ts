/**
 * Script para criar o usuário administrador no Supabase
 * Execute este script uma vez para configurar o admin do sistema
 */

import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "diegomarqueshm@icloud.com";
const ADMIN_PASSWORD = "Sedexdez@1";
const ADMIN_NAME = "Diego Marques";

async function setupAdmin() {
  console.log("🔧 Configurando administrador do sistema...");

  try {
    // Verificar se admin já existe
    const { data: existingOperador } = await supabase
      .from("operadores")
      .select("*")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (existingOperador) {
      console.log("✅ Administrador já existe no sistema");

      // Atualizar para garantir que é admin e está ativo
      const { error: updateError } = await supabase
        .from("operadores")
        .update({
          is_admin: true,
          ativo: true,
          suspenso: false,
          aguardando_pagamento: false,
        })
        .eq("email", ADMIN_EMAIL);

      if (updateError) {
        console.error("❌ Erro ao atualizar admin:", updateError);
      } else {
        console.log("✅ Permissões de admin atualizadas com sucesso");
      }
      return;
    }

    // Criar novo admin
    console.log("📝 Criando novo administrador...");

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          nome: ADMIN_NAME,
        },
      },
    });

    if (authError) {
      console.error("❌ Erro ao criar admin no Auth:", authError);
      return;
    }

    if (!authData.user) {
      console.error("❌ Erro: usuário não foi criado");
      return;
    }

    console.log("✅ Admin criado no Auth");

    // Aguardar trigger criar o operador
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Atualizar operador para ser admin
    const { error: updateError } = await supabase
      .from("operadores")
      .update({
        is_admin: true,
        ativo: true,
        suspenso: false,
        aguardando_pagamento: false,
      })
      .eq("auth_user_id", authData.user.id);

    if (updateError) {
      console.error("❌ Erro ao configurar admin:", updateError);
      return;
    }

    console.log("✅ Administrador configurado com sucesso!");
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Senha: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("❌ Erro ao configurar admin:", error);
  }
}

// Executar configuração
setupAdmin();
