import pg from 'pg';
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

const { Client } = pg;
const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
console.log('Using DATABASE_URL:', connectionString.substring(0, 50) + '...');
const client = new Client({ connectionString });

await client.connect();

console.log('\n=== TABELAS PUBLIC ===');
const tables = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`);
console.table(tables.rows);

console.log('\n=== COLUNAS DA TABELA operadores ===');
try {
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operadores'
    ORDER BY ordinal_position
  `);
  console.table(cols.rows);
} catch (e) { console.log('Erro:', e.message); }

console.log('\n=== COLUNAS DA TABELA produtos ===');
try {
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos'
    ORDER BY ordinal_position
  `);
  console.table(cols.rows);
} catch (e) { console.log('Erro:', e.message); }

console.log('\n=== COLUNAS DA TABELA vendas ===');
try {
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendas'
    ORDER BY ordinal_position
  `);
  console.table(cols.rows);
} catch (e) { console.log('Erro:', e.message); }

console.log('\n=== DADOS OPERADORES ===');
try {
  const ops = await client.query(`
    SELECT id, nome, email, is_admin, ativo, suspenso, auth_user_id IS NOT NULL as tem_auth
    FROM public.operadores ORDER BY is_admin DESC, created_at
  `);
  console.table(ops.rows);
} catch (e) { console.log('Erro:', e.message); }

console.log('\n=== USUARIOS AUTH ===');
try {
  const auth = await client.query(`
    SELECT id, email, email_confirmed_at IS NOT NULL as confirmed FROM auth.users ORDER BY created_at
  `);
  console.table(auth.rows);
} catch (e) { console.log('Erro:', e.message); }

await client.end();
