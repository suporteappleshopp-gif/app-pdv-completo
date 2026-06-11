import fs from 'fs';

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf-8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
loadEnv('.env');
loadEnv('.env.local');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', URL);
console.log('KEY definida:', !!KEY);

async function query(table, params = '') {
  const res = await fetch(`${URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });
  return { status: res.status, data: await res.json() };
}

console.log('\n=== operadores ===');
const ops = await query('operadores', 'select=id,nome,email,is_admin,ativo,suspenso,auth_user_id&order=is_admin.desc');
console.log('Status:', ops.status);
console.log(JSON.stringify(ops.data, null, 2));

console.log('\n=== produtos (primeiros 10) ===');
const prods = await query('produtos', 'select=id,user_id,nome,codigo_barras,preco,estoque&limit=10');
console.log('Status:', prods.status);
console.log(JSON.stringify(prods.data, null, 2));

console.log('\n=== vendas (primeiras 5) ===');
const vendas = await query('vendas', 'select=id,numero,operador_id,total,status&order=created_at.desc&limit=5');
console.log('Status:', vendas.status);
console.log(JSON.stringify(vendas.data, null, 2));
