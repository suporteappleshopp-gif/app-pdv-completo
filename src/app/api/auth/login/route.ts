import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase nao configurado: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Contas que devem ser restauradas automaticamente caso o login falhe.
// Mantem o operador (id) intacto, portanto produtos/vendas vinculados permanecem.
const CONTAS_RESTAURACAO_AUTOMATICA: Record<string, { senha: string; nome: string }> = {
  "joelmamoura2@icloud.com": { senha: "123456", nome: "Joelma" },
};

async function buscarAuthUserPorEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page++;
    if (page > 20) return null; // limite de seguranca
  }
}

async function tentarRestaurarConta(
  admin: SupabaseClient,
  email: string,
  senhaDigitada: string
): Promise<boolean> {
  const config = CONTAS_RESTAURACAO_AUTOMATICA[email.toLowerCase()];
  if (!config) return false;
  if (senhaDigitada !== config.senha) return false;

  // Garantir usuario no Auth com a senha desejada
  let authUserId = await buscarAuthUserPorEmail(admin, email);
  if (authUserId) {
    await admin.auth.admin.updateUserById(authUserId, {
      password: config.senha,
      email_confirm: true,
    });
  } else {
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: config.senha,
      email_confirm: true,
    });
    authUserId = created?.user?.id || null;
  }

  // Garantir registro de operador ativo
  const { data: opExistente } = await admin
    .from("operadores")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (opExistente) {
    const updates: Record<string, unknown> = {
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
    };
    if (authUserId && opExistente.auth_user_id !== authUserId) {
      updates.auth_user_id = authUserId;
    }
    await admin.from("operadores").update(updates).eq("id", opExistente.id);
  } else if (authUserId) {
    await admin.from("operadores").insert({
      auth_user_id: authUserId,
      nome: config.nome,
      email,
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
      is_admin: false,
    });
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    // Tentar login no Supabase Auth
    let { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: emailNormalizado,
      password,
    });

    // Se falhar, tentar restauracao automatica de contas conhecidas e logar de novo
    if (authError || !authData?.user) {
      const restaurou = await tentarRestaurarConta(supabaseAdmin, emailNormalizado, password);
      if (restaurou) {
        const retry = await supabaseAdmin.auth.signInWithPassword({
          email: emailNormalizado,
          password,
        });
        authData = retry.data;
        authError = retry.error;
      }
    }

    if (!authError && authData.user) {
      // Buscar dados do operador pelo auth_user_id
      const { data: operadorData, error: operadorError } = await supabaseAdmin
        .from("operadores")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (!operadorError && operadorData) {
        return NextResponse.json({
          success: true,
          operador: {
            id: operadorData.id,
            nome: operadorData.nome,
            email: operadorData.email,
            isAdmin: operadorData.is_admin || false,
            ativo: operadorData.ativo || false,
            suspenso: operadorData.suspenso || false,
            aguardandoPagamento: operadorData.aguardando_pagamento || false,
            createdAt: operadorData.created_at,
            formaPagamento: operadorData.forma_pagamento || null,
            valorMensal: operadorData.valor_mensal || null,
            dataProximoVencimento: operadorData.data_proximo_vencimento || null,
            diasAssinatura: operadorData.dias_assinatura || null,
            dataPagamento: operadorData.data_pagamento || null,
          },
          session: authData.session,
        });
      }

      // Auth funcionou mas não achou operador - criar/buscar por email
      const { data: opByEmail } = await supabaseAdmin
        .from("operadores")
        .select("*")
        .eq("email", emailNormalizado)
        .maybeSingle();

      if (opByEmail) {
        // Vincular auth_user_id se não estiver vinculado
        if (!opByEmail.auth_user_id) {
          await supabaseAdmin
            .from("operadores")
            .update({ auth_user_id: authData.user.id })
            .eq("id", opByEmail.id);
        }

        return NextResponse.json({
          success: true,
          operador: {
            id: opByEmail.id,
            nome: opByEmail.nome,
            email: opByEmail.email,
            isAdmin: opByEmail.is_admin || false,
            ativo: opByEmail.ativo || false,
            suspenso: opByEmail.suspenso || false,
            aguardandoPagamento: opByEmail.aguardando_pagamento || false,
            createdAt: opByEmail.created_at,
            formaPagamento: opByEmail.forma_pagamento || null,
            valorMensal: opByEmail.valor_mensal || null,
            dataProximoVencimento: opByEmail.data_proximo_vencimento || null,
            diasAssinatura: opByEmail.dias_assinatura || null,
            dataPagamento: opByEmail.data_pagamento || null,
          },
          session: authData.session,
        });
      }
    }

    // Auth falhou - tentar login direto na tabela operadores (senha em texto)
    const { data: operadorDirect, error: directError } = await supabaseAdmin
      .from("operadores")
      .select("*")
      .eq("email", emailNormalizado)
      .maybeSingle();

    if (directError) {
      return NextResponse.json(
        { success: false, error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    if (!operadorDirect) {
      return NextResponse.json(
        { success: false, error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    // Verificar senha em texto plano (operadores sem Auth)
    if (operadorDirect.senha && operadorDirect.senha === password) {
      return NextResponse.json({
        success: true,
        operador: {
          id: operadorDirect.id,
          nome: operadorDirect.nome,
          email: operadorDirect.email,
          isAdmin: operadorDirect.is_admin || false,
          ativo: operadorDirect.ativo || false,
          suspenso: operadorDirect.suspenso || false,
          aguardandoPagamento: operadorDirect.aguardando_pagamento || false,
          createdAt: operadorDirect.created_at,
          formaPagamento: operadorDirect.forma_pagamento || null,
          valorMensal: operadorDirect.valor_mensal || null,
          dataProximoVencimento: operadorDirect.data_proximo_vencimento || null,
          diasAssinatura: operadorDirect.dias_assinatura || null,
          dataPagamento: operadorDirect.data_pagamento || null,
        },
        session: null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Email ou senha incorretos" },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("❌ Erro no login:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
