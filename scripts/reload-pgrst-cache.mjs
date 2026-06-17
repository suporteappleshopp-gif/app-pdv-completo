import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('Recarregando schema cache do PostgREST...');
await client.query(`NOTIFY pgrst, 'reload schema'`);
console.log('✅ Notificação enviada! O PostgREST vai recarregar o schema.');
await client.end();
