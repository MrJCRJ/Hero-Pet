import database from "infra/database.js";
import { gerarDREPDF } from "@/lib/relatorios/exportPDF";
import { gerarDREExcel } from "@/lib/relatorios/exportExcel";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

function monthBounds(mes: number, ano: number) {
  const firstDay = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  const lastDay = `${nextAno}-${String(nextMes).padStart(2, "0")}-01`;
  return { firstDay, lastDay };
}

export default async function dreHandler(
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

    const [vendasR, cogsR, despesasR] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
               FROM pedido_itens i
               JOIN pedidos p ON p.id = i.pedido_id
               WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
        values: [firstDay, lastDay],
      }),
    ]);

    const receitas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const custosVendas = Number((cogsR.rows[0] as Record<string, unknown>)?.cogs || 0);
    const despesas = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
    const impostos = 0; // não há campo de impostos no modelo atual
    const lucroBruto = Number((receitas - custosVendas).toFixed(2));
    const lucroOperacional = Number((lucroBruto - despesas - impostos).toFixed(2));
    const margemBruta = receitas > 0 ? Number(((lucroBruto / receitas) * 100).toFixed(2)) : 0;
    const margemOperacional = receitas > 0 ? Number(((lucroOperacional / receitas) * 100).toFixed(2)) : 0;

    const format = (req.query?.format as string) || "json";

    // Buscar dados do mês anterior (apenas para JSON)
    let dreAnterior: Record<string, number> | null = null;
    if (format === "json") {
      const mesAnt = mes === 1 ? 12 : mes - 1;
      const anoAnt = mes === 1 ? ano - 1 : ano;
      const { firstDay: fda, lastDay: lda } = monthBounds(mesAnt, anoAnt);
      const [va, ca, da] = await Promise.all([
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
                 FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2`,
          values: [fda, lda],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
                 FROM pedido_itens i
                 JOIN pedidos p ON p.id = i.pedido_id
                 WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
                 AND p.data_emissao >= $1 AND p.data_emissao < $2`,
          values: [fda, lda],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
                 FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
          values: [fda, lda],
        }),
      ]);
      const recA = Number((va.rows[0] as Record<string, unknown>)?.total || 0);
      const custA = Number((ca.rows[0] as Record<string, unknown>)?.cogs || 0);
      const despA = Number((da.rows[0] as Record<string, unknown>)?.total || 0);
      const lucroBA = Number((recA - custA).toFixed(2));
      const lucroOA = Number((lucroBA - despA - 0).toFixed(2));
      dreAnterior = {
        receitas: recA,
        custosVendas: custA,
        lucroBruto: lucroBA,
        despesas: despA,
        impostos: 0,
        lucroOperacional: lucroOA,
        margemBruta: recA > 0 ? Number(((lucroBA / recA) * 100).toFixed(2)) : 0,
        margemOperacional: recA > 0 ? Number(((lucroOA / recA) * 100).toFixed(2)) : 0,
      };
    }

    const payload = {
      periodo: { mes, ano, firstDay, lastDay },
      dre: {
        receitas,
        custosVendas,
        lucroBruto,
        despesas,
        impostos,
        lucroOperacional,
        margemBruta,
        margemOperacional,
      },
      ...(format === "json" && dreAnterior ? { dreAnterior } : {}),
    };

    if (format === "pdf") {
      gerarDREPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarDREExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="DRE-${ano}-${String(mes).padStart(2, "0")}.xlsx"`);
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/dre error", e);
    res.status(500).json({ error: "Erro ao gerar DRE" });
  }
}
