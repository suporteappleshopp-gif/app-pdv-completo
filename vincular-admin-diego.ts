/**
 * 🔧 VINCULAR DIEGO AO SUPABASE AUTH
 * Para o admin ser reconhecido ao aprovar renovações
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

async function vincularAdminDiego() {
  console.log("🔧 VINCULANDO DIEGO AO SUPABASE AUTH\n");
  console.log("=".repeat(70));

  const email = "diegomarqueshm@icloud.com";
  const senha = "Sedexdez@1";

  // 1. Verificar se Diego existe na tabela operadores
  const { data: diego, error: erroDiego } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", email)
    .single();

  if (!diego) {
    console.error("❌ Diego não encontrado na tabela operadores!");
    return;
  }

  console.log("✅ Diego encontrado na tabela operadores:");
  console.log(`   ID: ${diego.id}`);
  console.log(`   Nome: ${diego.nome}`);
  console.log(`   Email: ${diego.email}`);
  console.log(`   is_admin: ${diego.is_admin}`);
  console.log(`   auth_user_id: ${diego.auth_user_id || "NULL (não vinculado)"}`);

  // 2. Verificar se já existe usuário Auth com este email
  console.log("\n🔍 Verificando se existe usuário Auth...");

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Erro ao listar usuários Auth:", listError.message);
  }

  const authUserExistente = users?.find(u => u.email === email);

  let authUserId: string;

  if (authUserExistente) {
    console.log("✅ Usuário Auth já existe!");
    console.log(`   Auth User ID: ${authUserExistente.id}`);
    authUserId = authUserExistente.id;

    // Se o auth_user_id já está correto, não precisa fazer nada
    if (diego.auth_user_id === authUserId) {
      console.log("\n✅ Diego já está vinculado corretamente!");
      return;
    }
  } else {
    // 3. Criar usuário no Supabase Auth
    console.log("\n📝 Criando usuário Auth para Diego...");

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: senha,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        nome: diego.nome,
      },
    });

    if (authError || !authData.user) {
      console.error("❌ Erro ao criar usuário Auth:", authError?.message);
      return;
    }

    console.log("✅ Usuário Auth criado com sucesso!");
    console.log(`   Auth User ID: ${authData.user.id}`);
    authUserId = authData.user.id;
  }

  // 4. Vincular Diego ao Auth User
  console.log("\n🔗 Vinculando Diego ao usuário Auth...");

  const { error: updateError } = await supabase
    .from("operadores")
    .update({
      auth_user_id: authUserId,
      senha: senha, // Garantir que a senha está atualizada
    })
    .eq("id", diego.id);

  if (updateError) {
    console.error("❌ Erro ao vincular Diego:", updateError.message);
    return;
  }

  console.log("✅ Diego vinculado com sucesso!");

  // 5. Verificar se está tudo certo
  console.log("\n🧪 VERIFICANDO VINCULAÇÃO...");

  const { data: diegoAtualizado, error: verifyError } = await supabase
    .from("operadores")
    .select("*")
    .eq("email", email)
    .single();

  if (diegoAtualizado) {
    console.log("✅ Vinculação confirmada!");
    console.log(`   ID: ${diegoAtualizado.id}`);
    console.log(`   auth_user_id: ${diegoAtualizado.auth_user_id}`);
    console.log(`   is_admin: ${diegoAtualizado.is_admin}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ DIEGO VINCULADO E PRONTO PARA APROVAR RENOVAÇÕES!\n");
  console.log("📋 Próximos passos:");
  console.log("   1. Faça login com: diegomarqueshm@icloud.com");
  console.log("   2. Senha: Sedexdez@1");
  console.log("   3. Acesse o painel admin");
  console.log("   4. Aprove as solicitações de renovação");
  console.log("   5. Os dias serão creditados automaticamente!\n");
}

vincularAdminDiego().catch(console.error);
