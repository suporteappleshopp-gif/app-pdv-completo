#!/usr/bin/env python3
import os
import re

# Obter variáveis
supabase_url = os.getenv('VITE_SUPABASE_URL', '')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

# Extrair project ref da URL
match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
if match:
    project_ref = match.group(1)
    print(f"✅ Project ref encontrado: {project_ref}")
    print(f"\n📋 Para aplicar a migration, execute:")
    print(f"\n1. Acesse o SQL Editor do Supabase:")
    print(f"   https://supabase.com/dashboard/project/{project_ref}/sql/new")
    print(f"\n2. Cole e execute o conteúdo do arquivo:")
    print(f"   supabase/migrations/20260203052422_corrigir_solicitacoes_renovacao.sql")
    print(f"\n3. Ou execute via CLI após fazer login:")
    print(f"   npx supabase login")
    print(f"   npx supabase link --project-ref {project_ref}")
    print(f"   npx supabase db push")
else:
    print("❌ Não foi possível extrair o project ref da URL")
