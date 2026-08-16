import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Buscar ID do usuario no Supabase Auth pelo email (paginando listUsers)
async function buscarAuthUserPorEmail(admin: ReturnType<typeof getSupabaseAdmin>, email: string): Promise<string | null> {
  const emailNormalizado = (email || "").toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === emailNormalizado);
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page++;
    if (page > 20) return null;
  }
}

// Garantir que exista um usuario no Auth com a senha informada e retornar seu ID.
// Se existir (por auth_user_id ou por email), atualiza a senha. Se nao existir, cria.
async function garantirAuthUserComSenha(
  admin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  senha: string
): Promise<{ authUserId: string | null; erro?: string }> {
  try {
    // 1) Tentar localizar pelo auth_user_id vinculado (passado pelo chamador via opAtual)
    //    O chamador resolve isso; aqui tratamos apenas email + senha.
    let authUserId = await buscarAuthUserPorEmail(admin, email);

    if (authUserId) {
      // Usuario ja existe no Auth: apenas atualizar a senha
      const { error: updError } = await admin.auth.admin.updateUserById(authUserId, {
        password: senha,
        email_confirm: true,
      });
      if (updError) {
        return { authUserId: null, erro: "Erro ao atualizar senha no Auth: " + updError.message };
      }
      return { authUserId };
    }

    // 2) Nao existe no Auth: criar com a nova senha
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return { authUserId: null, erro: "Erro ao criar credenciais no Auth: " + (createError?.message || "desconhecido") };
    }
    return { authUserId: created.user.id };
  } catch (e: any) {
    return { authUserId: null, erro: "Falha ao sincronizar Auth: " + (e?.message || "erro desconhecido") };
  }
}

// GET - Listar todos os operadores
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("operadores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erro ao listar operadores:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const operadores = (data || []).map((op: any) => ({
      id: op.id,
      nome: op.nome,
      email: op.email,
      isAdmin: op.is_admin || false,
      ativo: op.ativo || false,
      suspenso: op.suspenso || false,
      aguardandoPagamento: op.aguardando_pagamento || false,
      createdAt: op.created_at,
      formaPagamento: op.forma_pagamento || null,
      valorMensal: op.valor_mensal || null,
      dataProximoVencimento: op.data_proximo_vencimento || null,
      diasAssinatura: op.dias_assinatura || null,
      dataPagamento: op.data_pagamento || null,
      auth_user_id: op.auth_user_id || null,
    }));

    return NextResponse.json({ success: true, operadores });
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST - Criar novo operador
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { email, password, nome, formaPagamento, diasAssinatura, valorMensal } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const nomeFinal = nome || email.split("@")[0];

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Se usuário já existe no auth, tentar apenas criar na tabela operadores
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        // Buscar usuário existente no auth pelo email
        const { data: existingOp } = await supabaseAdmin
          .from("operadores")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingOp) {
          return NextResponse.json(
            { success: false, error: "Email já cadastrado no sistema" },
            { status: 409 }
          );
        }
      }
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: "Erro ao criar usuário" },
        { status: 500 }
      );
    }

    // Calcular data de vencimento se tiver dias
    let dataVencimento = null;
    if (diasAssinatura && diasAssinatura > 0) {
      const venc = new Date();
      venc.setDate(venc.getDate() + diasAssinatura);
      dataVencimento = venc.toISOString().split("T")[0];
    }

    // Criar operador na tabela
    const { data: operadorData, error: insertError } = await supabaseAdmin
      .from("operadores")
      .insert({
        auth_user_id: authData.user.id,
        nome: nomeFinal,
        email,
        senha: null,
        ativo: diasAssinatura && diasAssinatura > 0,
        suspenso: !diasAssinatura || diasAssinatura <= 0,
        aguardando_pagamento: !diasAssinatura || diasAssinatura <= 0,
        is_admin: false,
        dias_assinatura: diasAssinatura || 0,
        forma_pagamento: formaPagamento || null,
        valor_mensal: valorMensal || null,
        data_proximo_vencimento: dataVencimento,
        data_pagamento: diasAssinatura && diasAssinatura > 0 ? new Date().toISOString().split("T")[0] : null,
      })
      .select()
      .single();

    if (insertError) {
      // Remover usuário do Auth se falhou ao criar operador
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: "Erro ao criar perfil: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      operador: {
        id: operadorData.id,
        nome: operadorData.nome,
        email: operadorData.email,
        isAdmin: false,
        ativo: operadorData.ativo,
        suspenso: operadorData.suspenso,
        aguardandoPagamento: operadorData.aguardando_pagamento,
        createdAt: operadorData.created_at,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar operador:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar operador
export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do operador é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar auth_user_id do operador para atualizar no Auth
    const { data: opAtual } = await supabaseAdmin
      .from("operadores")
      .select("auth_user_id, email")
      .eq("id", id)
      .single();

    const emailFinal = updates.email || opAtual?.email;

    // Se a senha foi enviada, garantir que o Auth tenha uma conta com a senha nova.
    // Isso cobre 3 casos: operador com auth_user_id vinculado, operador sem
    // auth_user_id mas com conta no Auth, e operador sem conta no Auth algum.
    // Sem isso, usuarios sem auth_user_id ficavam travados ao trocar senha
    // (a senha em texto era apagada e nenhuma conta Auth era criada/atualizada).
    let authUserIdVinculado: string | null = opAtual?.auth_user_id || null;

    if (updates.senha && emailFinal) {
      // Se ja temos auth_user_id, atualizar a senha direto por ele
      if (authUserIdVinculado) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          authUserIdVinculado,
          { password: updates.senha, email_confirm: true }
        );

        // Se falhar (ex.: usuario foi removido do Auth), cair no fluxo de garantia
        if (authError) {
          console.warn("⚠️ updateUserById falhou, tentando garantir conta no Auth:", authError.message);
          const res = await garantirAuthUserComSenha(supabaseAdmin, emailFinal, updates.senha);
          if (res.erro) {
            return NextResponse.json(
              { success: false, error: res.erro },
              { status: 500 }
            );
          }
          if (res.authUserId && res.authUserId !== authUserIdVinculado) {
            authUserIdVinculado = res.authUserId;
          }
        } else {
          console.log("✅ Senha atualizada no Auth para operador:", id);
        }
      } else {
        // Sem auth_user_id: garantir conta no Auth e vincular
        const res = await garantirAuthUserComSenha(supabaseAdmin, emailFinal, updates.senha);
        if (res.erro) {
          return NextResponse.json(
            { success: false, error: res.erro },
            { status: 500 }
          );
        }
        authUserIdVinculado = res.authUserId;
        console.log("✅ Conta Auth garantida/vinculada para operador:", id, "->", authUserIdVinculado);
      }
    } else if (opAtual?.auth_user_id && updates.email && !updates.senha) {
      // Apenas troca de email (sem senha): atualizar no Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        opAtual.auth_user_id,
        { email: updates.email }
      );
      if (authError) {
        console.error("❌ Erro ao atualizar email no Auth:", authError);
        return NextResponse.json(
          { success: false, error: "Erro ao atualizar email no Auth: " + authError.message },
          { status: 500 }
        );
      }
    }

    // Mapear campos do frontend para o banco
    const dbUpdates: any = {};
    if (updates.ativo !== undefined) dbUpdates.ativo = updates.ativo;
    if (updates.suspenso !== undefined) dbUpdates.suspenso = updates.suspenso;
    if (updates.aguardandoPagamento !== undefined) dbUpdates.aguardando_pagamento = updates.aguardandoPagamento;
    if (updates.formaPagamento !== undefined) dbUpdates.forma_pagamento = updates.formaPagamento;
    if (updates.valorMensal !== undefined) dbUpdates.valor_mensal = updates.valorMensal;
    if (updates.diasAssinatura !== undefined) dbUpdates.dias_assinatura = updates.diasAssinatura;
    if (updates.dataProximoVencimento !== undefined) dbUpdates.data_proximo_vencimento = updates.dataProximoVencimento;
    if (updates.dataPagamento !== undefined) dbUpdates.data_pagamento = updates.dataPagamento;
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    // Atualizar email na tabela e limpar senha em texto plano ao trocar credenciais
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.senha !== undefined) dbUpdates.senha = null; // Apagar senha texto plano ao usar Auth

    // Se garantimos/vinculamos uma conta Auth agora (operador estava sem auth_user_id),
    // persistir o vinculo na tabela para que futuras trocas e o login funcionem pelo Auth.
    if (authUserIdVinculado && opAtual?.auth_user_id !== authUserIdVinculado) {
      dbUpdates.auth_user_id = authUserIdVinculado;
    }

    const { data, error } = await supabaseAdmin
      .from("operadores")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, operador: data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Remover operador
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar auth_user_id antes de deletar
    const { data: op } = await supabaseAdmin
      .from("operadores")
      .select("auth_user_id")
      .eq("id", id)
      .single();

    // Deletar da tabela
    const { error } = await supabaseAdmin
      .from("operadores")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Deletar do Auth se tiver auth_user_id
    if (op?.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(op.auth_user_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
