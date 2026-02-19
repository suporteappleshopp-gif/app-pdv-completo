// Configuração de ambiente para produção
// Este arquivo é servido estaticamente e injeta as variáveis no window
window.__env__ = {
  SUPABASE_URL: 'https://yzjrkcampafzfjwtatfa.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6anJrY2FtcGFmemZqd3RhdGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTg4MzIsImV4cCI6MjA4NjE5NDgzMn0.VybuY1x3xhFt7Ip4rSCHRPs9wApdto32MgXn_UtlkD4'
};

console.log('✅ [ENV-CONFIG] Variáveis Supabase injetadas via window.__env__');
