import { NextResponse } from "next/server";

/**
 * API para testar se o token do Mercado Pago está funcionando
 */
export async function GET() {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "Token do Mercado Pago não configurado",
      });
    }

    // Testar token fazendo uma requisição simples
    const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "Token inválido ou expirado",
        details: data,
        status: response.status,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Token do Mercado Pago está válido!",
      payment_methods_available: data.length,
      token_length: accessToken.length,
      token_prefix: accessToken.substring(0, 15) + "...",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
