import { NextResponse } from "next/server";

/**
 * API de teste para verificar se as configurações estão corretas
 */
export async function GET() {
  const hasToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
  const hasUrl = !!process.env.NEXT_PUBLIC_URL;
  const hasSupabase = !!process.env.SUPABASE_URL;

  return NextResponse.json({
    success: true,
    config: {
      mercadopago_token_exists: hasToken,
      mercadopago_token_length: process.env.MERCADOPAGO_ACCESS_TOKEN?.length || 0,
      next_public_url: process.env.NEXT_PUBLIC_URL || "não configurado",
      supabase_url_exists: hasSupabase,
    },
    message: "Configurações verificadas",
  });
}
