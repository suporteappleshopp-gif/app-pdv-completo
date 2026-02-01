import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint para verificar logs de webhooks do Mercado Pago
 * Útil para debug e rastreamento de pagamentos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payment_id = searchParams.get("payment_id");
    const usuario_id = searchParams.get("usuario_id");
    const tipo = searchParams.get("tipo");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir query baseada nos parâmetros
    let query = supabase
      .from("webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (payment_id) {
      query = query.eq("payment_id", payment_id);
    }

    if (usuario_id) {
      query = query.eq("usuario_id", usuario_id);
    }

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar logs", details: error.message },
        { status: 500 }
      );
    }

    // Estatísticas gerais
    const { data: stats } = await supabase
      .from("webhook_logs")
      .select("tipo, status", { count: "exact" });

    const estatisticas = {
      total: logs?.length || 0,
      por_tipo: stats?.reduce((acc: any, log: any) => {
        acc[log.tipo] = (acc[log.tipo] || 0) + 1;
        return acc;
      }, {}),
      por_status: stats?.reduce((acc: any, log: any) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      success: true,
      logs: logs || [],
      estatisticas,
      parametros: {
        payment_id: payment_id || null,
        usuario_id: usuario_id || null,
        tipo: tipo || null,
        limit,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao processar requisição", details: error.message },
      { status: 500 }
    );
  }
}
