import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envText = readFileSync('/workspace/.env', 'utf8');
const env = {};
envText.split('\n').forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// O motivo do RLS bloquear pode ser que a politica RLS tem `auth.uid() = (...)` com uuid comparison.
// Mas o `user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())` deveria funcionar.
// Vou criar um produto via service_role para a Joelma, e tentar UPDATE via anon dela
async function main() {
  const operadorId = 'db28e1cf-202f-476e-925d-26230983b5bd';

  // criar via service role
  const id = 'prod-' + Date.now();
  await admin.from('produtos').insert({ id, user_id: operadorId, nome: 'TESTE rls v2', codigo_barras: 'x' + Date.now(), preco: 1, estoque: 1, estoque_minimo: 0 });

  // Login como Joelma
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: login } = await anon.auth.signInWithPassword({ email: 'joelmamoura2@icloud.com', password: '123456' });
  console.log('Auth uid:', login.user.id);

  // SELECT
  const { data: prods, error: e1 } = await anon.from('produtos').select('*');
  console.log('SELECT como Joelma:', prods?.length || 0, 'err:', e1);

  // UPDATE
  const { data: upd, error: e2 } = await anon.from('produtos').update({ nome: 'TESTE rls v2 upd' }).eq('id', id).select();
  console.log('UPDATE:', upd, 'err:', e2);

  // INSERT via anon
  const id2 = 'prod-anon-' + Date.now();
  const { data: ins, error: e3 } = await anon.from('produtos').insert({ id: id2, user_id: operadorId, nome: 'ins', codigo_barras: 'y' + Date.now(), preco: 1, estoque: 1, estoque_minimo: 0 }).select();
  console.log('INSERT como Joelma:', ins, 'err:', e3);

  // Cleanup
  await admin.from('produtos').delete().eq('id', id);
  if (ins?.[0]) await admin.from('produtos').delete().eq('id', ins[0].id);
}
main();
