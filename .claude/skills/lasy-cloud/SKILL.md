---
name: lasy-cloud
description: Lasy Cloud - Database e Storage via Lasy. SQL via API.
---

## Variáveis de ambiente (sempre disponíveis no .env)

A rota de create Lasy Cloud project injeta todas estas variáveis no `.env` da sandbox. No código do app use **sempre** o prefixo `VITE_` (o Vite só expõe essas ao cliente):

- `VITE_SUPABASE_URL` — URL do projeto (import.meta.env.VITE_SUPABASE_URL)
- `VITE_SUPABASE_ANON_KEY` — chave anon para cliente
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — chave service role (servidor; nunca expor no cliente)
- `VITE_LASY_PROJECT_ID` — ID do projeto para chamadas à API execute-sql

Também disponíveis no `.env` (Node/scripts): `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

## Banco de dados

- **Não use** Supabase CLI (supabase migration, db push). Não está disponível.
- **Crie as tabelas** em um arquivo `.sql` (ex.: `supabase/migrations/001_initial.sql` ou `scripts/schema.sql`).
- **Migrações**: **sempre** use um script Node.js para rodar as migrações (ex.: `scripts/run-migrations.js`). O script deve ler o(s) arquivo(s) `.sql` e executar o SQL usando `DATABASE_URL` (cliente `pg`). O pacote `pg` já está instalado no template — não é necessário rodar `npm install pg`. Mantenha o script simples: ler arquivo(s) `.sql`, conectar com `pg` e executar em ordem.

## 🔒 STORAGE E POLÍTICAS - REGRAS OBRIGATÓRIAS

Quando criar buckets de storage no Supabase:

1. **SEMPRE crie as políticas de storage JUNTO com a criação da tabela principal** — não espere dar erro de RLS para depois criar as políticas; storage precisa de políticas assim como tabelas.
2. **SEMPRE use DROP POLICY IF EXISTS antes de CREATE POLICY**:
   ```sql
   DROP POLICY IF EXISTS "nome_da_politica" ON storage.objects;
   CREATE POLICY "nome_da_politica" ON storage.objects ...
   ```

## Toast global para erros e acertos do Supabase

**SEMPRE** adicione um toast global no app do usuário para exibir erros e sucessos do Supabase. Por exemplo: capturar erros como `StorageApiError: new row violates row-level security policy` (ou falhas de upload, insert, etc.) e exibir no toast; em operações bem-sucedidas (upload, save), mostrar mensagem de sucesso no toast. Use a lib de toast do projeto (ex.: Sonner) e envolva as chamadas ao Supabase (storage, from(), etc.) em try/catch, exibindo o erro no toast.

## Edge Functions (Supabase)

When the user needs a backend function (webhook, API endpoint, server-side logic, CORS proxy, email sending, etc.), you can deploy a Supabase Edge Function directly from chat. Write the complete Deno/TypeScript function and include it in a deploy_button tag.

**CRITICAL RULES for Edge Functions:**
1. NEVER use remote imports like "https://deno.land/..." — the runtime runs with --no-remote and will fail to boot.
2. Use ONLY the built-in Deno.serve() API — no imports needed.
3. Use "npm:package-name" for npm packages (e.g. npm:nodemailer, npm:stripe).
4. Use Deno built-ins: Deno.env.get(), crypto, fetch (native), etc.
5. CORS: start EVERY function with the corsHeaders block + OPTIONS handler (supabase.functions.invoke() sends "apikey" — missing it causes a preflight CORS error). Always spread ...corsHeaders in every response.

Correct example:
```
<deploy_button name="function-slug" verify_jwt="false">
Deno.serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  // your logic here
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
</deploy_button>
```

The user clicks "Deploy" and the function is deployed automatically using the server-side access token. After deployment, the function URL follows the pattern: https://{project-ref}.supabase.co/functions/v1/{slug}. Use kebab-case for the slug (e.g. send-email, process-payment). Set verify_jwt="true" only when authentication is required.
