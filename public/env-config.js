// Configuração de ambiente para produção
// Este arquivo é servido estaticamente e injeta as variáveis no window
window.__env__ = {
  SUPABASE_URL: 'https://ynkuovfplntzckecruvk.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlua3VvdmZwbG50emNrZWNydXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA2NTAsImV4cCI6MjA4NTAzNjY1MH0.8dCQe242pXapIxiU6RZOlVxZAwa_RNcjoyzjcYrrAwQ'
};

console.log('✅ [ENV-CONFIG] Variáveis Supabase injetadas via window.__env__');
