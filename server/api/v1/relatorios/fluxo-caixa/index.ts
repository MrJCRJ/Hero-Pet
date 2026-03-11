import database from "infra/database.js";
import { gerarFluxoCaixaPDF } from "@/lib/relatorios/exportPDF";
import { gerarFluxoCaixaExcel } from "@/lib/relatorios/exportExcel";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

function monthBounds(mes: number, ano: number) {
  const firstDay = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  const lastDay = `${nextAno}-${String(nextMes).padStart(2, "0")}-01`;
  return { firstDay, lastDay };
}

export default async function fluxoCaixaHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const now = new Date();
    const mes = Number(req.query?.mes) || now.getMonth() + 1;
    const ano = Number(req.query?.ano) || now.getFullYear();
    const { firstDay, lastDay } = monthBounds(mes, ano);

    const [vendasR, promPagosR, comprasR, despesasR] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos
               WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2
                 AND (parcelado = false OR parcelado IS NULL)`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(CASE WHEN paid_at IS NOT NULL AND paid_at >= $1::date AND paid_at < $2::date THEN amount ELSE 0 END),0)::numeric(14,2) AS total
               FROM pedido_promissorias`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
        values: [firstDay, lastDay],
      }),
    ]);

    const vendas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const promissoriasRecebidas = Number((promPagosR.rows[0] as Record<string, unknown>)?.total || 0);
    const compras = Number((comprasR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesas = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
    const entradas = Number((vendas + promissoriasRecebidas).toFixed(2));
    const saidas = Number((compras + despesas).toFixed(2));
    const saldo = Number((entradas - saidas).toFixed(2));

    const format = (req.query?.format as string) || "json";
    const payload = {
      periodo: { mes, ano, firstDay, lastDay },
      fluxo: {
        entradas: { vendas, promissoriasRecebidas, total: entradas },
        saidas: { compras, despesas, total: saidas },
        saldo,
      },
    };

    if (format === "pdf") {
      gerarFluxoCaixaPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarFluxoCaixaExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Fluxo-Caixa-${ano}-${String(mes).padStart(2, "0")}.xlsx"`);
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/fluxo-caixa error", e);
    res.status(500).json({ error: "Erro ao gerar fluxo de caixa" });
  }
}
