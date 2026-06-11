Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const EMAIL = "joelmamoura2@icloud.com";
  const SENHA = "123456";

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Variaveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes na Edge Function" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const log: string[] = [];

  // 1) Procurar usuario no Auth via Admin REST API
  let authUserId: string | null = null;
  try {
    let page = 1;
    while (page < 30) {
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      const listJson = await listRes.json();
      const users = listJson.users || listJson;
      if (!Array.isArray(users)) break;
      const found = users.find((u: any) => (u.email || "").toLowerCase() === EMAIL);
      if (found) {
        authUserId = found.id;
        break;
      }
      if (users.length < 200) break;
      page++;
    }
  } catch (e) {
    log.push(`Erro listando users: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2) Criar ou atualizar usuario no Auth
  if (authUserId) {
    log.push(`Auth user encontrado: ${authUserId}`);
    const updRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: SENHA, email_confirm: true }),
    });
    log.push(`Update password status: ${updRes.status}`);
  } else {
    log.push("Auth user nao existe - criando");
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: EMAIL, password: SENHA, email_confirm: true }),
    });
    const createJson = await createRes.json();
    authUserId = createJson?.id || createJson?.user?.id || null;
    log.push(`Create status: ${createRes.status}, id: ${authUserId}`);
  }

  // 3) Buscar/atualizar registro de operador via PostgREST (suspenso aguardando aprovacao)
  const opRes = await fetch(
    `${supabaseUrl}/rest/v1/operadores?email=eq.${encodeURIComponent(EMAIL)}&select=id,auth_user_id`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }
  );
  const opList = await opRes.json();

  let operadorId: string | null = null;
  if (Array.isArray(opList) && opList.length > 0) {
    operadorId = opList[0].id;
    log.push(`Operador existente: ${operadorId}`);

    const patchBody: Record<string, unknown> = {
      ativo: true,
      suspenso: true,
      aguardando_pagamento: true,
      forma_pagamento: "pix",
      valor_mensal: 59.9,
      dias_assinatura: 60,
    };
    if (authUserId && opList[0].auth_user_id !== authUserId) {
      patchBody.auth_user_id = authUserId;
    }

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/operadores?id=eq.${operadorId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patchBody),
      }
    );
    log.push(`Patch operador status: ${patchRes.status}`);
  } else if (authUserId) {
    log.push("Operador nao existe - criando como suspenso aguardando aprovacao");
    const insRes = await fetch(`${supabaseUrl}/rest/v1/operadores`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        auth_user_id: authUserId,
        nome: "Joelma",
        email: EMAIL,
        ativo: true,
        suspenso: true,
        aguardando_pagamento: true,
        is_admin: false,
        forma_pagamento: "pix",
        valor_mensal: 59.9,
        dias_assinatura: 60,
      }),
    });
    const insJson = await insRes.json();
    operadorId = Array.isArray(insJson) ? insJson[0]?.id : insJson?.id;
    log.push(`Insert operador status: ${insRes.status}, id: ${operadorId}`);
  }

  // 4) Contar produtos e vendas vinculados (so para informacao)
  let produtos = 0;
  let vendas = 0;
  if (operadorId) {
    const pRes = await fetch(
      `${supabaseUrl}/rest/v1/produtos?user_id=eq.${operadorId}&select=id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" } }
    );
    const pData = await pRes.json();
    produtos = Array.isArray(pData) ? pData.length : 0;

    const vRes = await fetch(
      `${supabaseUrl}/rest/v1/vendas?operador_id=eq.${operadorId}&select=id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" } }
    );
    const vData = await vRes.json();
    vendas = Array.isArray(vData) ? vData.length : 0;
  }

  return new Response(
    JSON.stringify({
      success: true,
      email: EMAIL,
      senha: SENHA,
      authUserId,
      operadorId,
      produtosVinculados: produtos,
      vendasVinculadas: vendas,
      modo: "suspenso aguardando aprovacao do admin",
      log,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
