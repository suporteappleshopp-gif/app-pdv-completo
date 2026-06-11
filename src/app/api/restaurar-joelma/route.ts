import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase nao configurado");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EMAIL_ALVO = "joelmamoura2@icloud.com";
const SENHA_NOVA = "123456";

async function executar() {
  const admin = getSupabaseAdmin();
  const log: string[] = [];

  log.push(`Procurando usuario ${EMAIL_ALVO} no Auth...`);

  let authUserId: string | null = null;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      log.push(`Erro ao listar users: ${error.message}`);
      break;
    }
    const found = data.users.find(
      (u) => (u.email || "").toLowerCase() === EMAIL_ALVO.toLowerCase()
    );
    if (found) {
      authUserId = found.id;
      break;
    }
    if (data.users.length < 200) break;
    page++;
  }

  if (authUserId) {
    log.push(`Usuario encontrado no Auth: ${authUserId}`);

    const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, {
      password: SENHA_NOVA,
      email_confirm: true,
    });
    if (updErr) {
      log.push(`Erro ao atualizar senha: ${updErr.message}`);
    } else {
      log.push(`Senha atualizada com sucesso para "${SENHA_NOVA}"`);
    }
  } else {
    log.push(`Usuario nao existe no Auth. Criando agora...`);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: EMAIL_ALVO,
      password: SENHA_NOVA,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      log.push(`Erro ao criar no Auth: ${createErr?.message || "desconhecido"}`);
    } else {
      authUserId = created.user.id;
      log.push(`Usuario criado no Auth: ${authUserId}`);
    }
  }

  log.push("Verificando registro na tabela operadores...");

  const { data: opExistente } = await admin
    .from("operadores")
    .select("*")
    .eq("email", EMAIL_ALVO)
    .maybeSingle();

  if (opExistente) {
    log.push(`Operador encontrado (id: ${opExistente.id})`);

    const updatesOperador: Record<string, unknown> = {
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
    };
    if (authUserId && opExistente.auth_user_id !== authUserId) {
      updatesOperador.auth_user_id = authUserId;
    }

    const { error: opUpdErr } = await admin
      .from("operadores")
      .update(updatesOperador)
      .eq("id", opExistente.id);

    if (opUpdErr) {
      log.push(`Erro ao atualizar operador: ${opUpdErr.message}`);
    } else {
      log.push("Operador ativado, vinculado e desbloqueado");
    }
  } else {
    log.push("Operador nao existe na tabela. Criando registro...");
    const { error: insErr } = await admin.from("operadores").insert({
      auth_user_id: authUserId,
      nome: "Joelma",
      email: EMAIL_ALVO,
      ativo: true,
      suspenso: false,
      aguardando_pagamento: false,
      is_admin: false,
    });
    if (insErr) {
      log.push(`Erro ao inserir operador: ${insErr.message}`);
    } else {
      log.push("Operador criado e ativado");
    }
  }

  const { data: produtos } = await admin
    .from("produtos")
    .select("id", { count: "exact" });
  const totalProdutos = (produtos || []).length;
  log.push(`Total de produtos na tabela (todos os usuarios): ${totalProdutos}`);

  const { data: produtosDoUsuario } = await admin
    .from("produtos")
    .select("id", { count: "exact" });

  const opIdParaContagem = opExistente?.id;
  if (opIdParaContagem) {
    const { data: prodUser } = await admin
      .from("produtos")
      .select("id")
      .eq("user_id", opIdParaContagem);
    log.push(`Produtos vinculados ao operador ${opIdParaContagem}: ${(prodUser || []).length}`);

    const { data: vendasUser } = await admin
      .from("vendas")
      .select("id")
      .eq("operador_id", opIdParaContagem);
    log.push(`Vendas vinculadas ao operador ${opIdParaContagem}: ${(vendasUser || []).length}`);
  }

  return log;
}

export async function GET() {
  try {
    const log = await executar();
    return NextResponse.json({ success: true, log });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
