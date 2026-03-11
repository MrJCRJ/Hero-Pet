import { NextRequest, NextResponse } from "next/server";
import { gerarDespesasRecorrentesFuturas } from "@/server/api/cron/gerar-despesas";

/**
 * Endpoint para cron externo gerar despesas recorrentes futuras.
 * Protegido por CRON_SECRET (header Authorization: Bearer ou ?secret=).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const tokenFromQuery = request.nextUrl.searchParams.get("secret");
  const token = tokenFromHeader || tokenFromQuery;

  const secret = process.env.CRON_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await gerarDespesasRecorrentesFuturas();
    return NextResponse.json(result);
  } catch (e) {
    console.error("cron/gerar-despesas error", e);
    return NextResponse.json(
      { error: "Erro ao gerar despesas", geradas: 0, modelos: 0 },
      { status: 500 }
    );
  }
}
