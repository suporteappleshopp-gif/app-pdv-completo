// Roda migrações SQL contra o projeto Supabase ATIVO.
// O DATABASE_URL do ambiente pode apontar para um projeto antigo/inválido,
// então derivamos a conexão a partir da URL pública (NEXT_PUBLIC_SUPABASE_URL)
// e da senha do banco (SUPABASE_DB_PASSWORD).
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getRef() {
  // Lê do .env (fonte de verdade, atualizada para o projeto ativo).
  // A variável de ambiente do processo pode estar desatualizada.
  const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const get = (k) => {
    const line = envFile.split('\n').find((l) => l.startsWith(k + '='));
    return line ? line.slice(k.length + 1).trim().replace(/^"|"$/g, '') : '';
  };
  if (get('SUPABASE_PROJECT_REF')) return get('SUPABASE_PROJECT_REF');
  const url = get('NEXT_PUBLIC_SUPABASE_URL') || get('VITE_SUPABASE_URL');
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (m) return m[1];
  throw new Error('Não foi possível determinar o project ref do Supabase.');
}

async function main() {
  const ref = getRef();
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) throw new Error('SUPABASE_DB_PASSWORD não definido no ambiente.');

  const connStr = `postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`;
  console.log('Conectando ao projeto ativo:', ref);

  const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 15000 });

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const f of files) {
    const full = path.isAbsolute(f) ? f : path.join(migrationsDir, f);
    const sql = fs.readFileSync(full, 'utf8');
    console.log('\n▶ Aplicando', path.basename(full), `(${sql.length} bytes)`);
    try {
      await pool.query(sql);
      console.log('  OK');
    } catch (e) {
      console.error('  ERRO:', e.message);
      throw e;
    }
  }

  await pool.end();
  console.log('\nMigrações concluídas.');
}

main().catch((e) => {
  console.error('\nFALHA:', e.message);
  process.exit(1);
});
