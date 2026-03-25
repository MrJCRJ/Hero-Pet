import database from "infra/database.js";
import { getReportBounds } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function dreHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const format = (req.query?.format as string) || "json";
  if (format === "pdf" || format === "xlsx") {
    if (res.setHeader) res.setHeader("Deprecation", "true");
    res.status(400).json({ erro: "Use o relatório consolidado em JSON" });
    return;
  }

  try {
    const now = new Date();
    const mes = Number(req.query?.mes) ?? now.getMonth() + 1;
    const ano = Number(req.query?.ano) ?? now.getFullYear();
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    const [vendasR, cogsR, despesasR, freteR] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
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
               FROM despesas
               WHERE data_vencimento >= $1 AND data_vencimento < $2
               AND (categoria IS NULL OR categoria::text != 'devolucao_capital')`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
    ]);

    const receitas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const receitaBruta = receitas;
    const receitaLiquida = receitas;
    const custosVendas = Number((cogsR.rows[0] as Record<string, unknown>)?.cogs || 0);
    const despesas = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
    const freteCusto = Number((freteR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesasComFrete = Number((despesas + freteCusto).toFixed(2));
    const impostos = 0; // não há campo de impostos no modelo atual
    const lucroBruto = Number((receitas - custosVendas).toFixed(2));
    const lucroOperacional = Number((lucroBruto - despesasComFrete - impostos).toFixed(2));
    const ebitda = lucroOperacional; // sem depreciação/amortização no modelo
    const margemBruta = receitas > 0 ? Number(((lucroBruto / receitas) * 100).toFixed(2)) : 0;
    const margemOperacional = receitas > 0 ? Number(((lucroOperacional / receitas) * 100).toFixed(2)) : 0;
    const margemEbitda = receitas > 0 ? Number(((ebitda / receitas) * 100).toFixed(2)) : 0;
    const despesasSobreReceita = receitas > 0 ? Number(((despesasComFrete / receitas) * 100).toFixed(2)) : 0;
    const custosSobreReceita = receitas > 0 ? Number(((custosVendas / receitas) * 100).toFixed(2)) : 0;

    const incluirComparacao = mes > 0 && ano > 0;

    // Buscar dados do mês anterior
    let dreAnterior: Record<string, number> | null = null;
    if (incluirComparacao) {
      const mesAnt = mes === 1 ? 12 : mes - 1;
      const anoAnt = mes === 1 ? ano - 1 : ano;
      const { firstDay: fda, lastDay: lda } = getReportBounds(mesAnt, anoAnt);
      const [va, ca, da, freteAntR] = await Promise.all([
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
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
                 FROM despesas
                 WHERE data_vencimento >= $1 AND data_vencimento < $2
                 AND (categoria IS NULL OR categoria::text != 'devolucao_capital')`,
          values: [fda, lda],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(COALESCE(frete_total,0)),0)::numeric(14,2) AS total
                 FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
                   AND data_emissao >= $1 AND data_emissao < $2`,
          values: [fda, lda],
        }),
      ]);
      const recA = Number((va.rows[0] as Record<string, unknown>)?.total || 0);
      const custA = Number((ca.rows[0] as Record<string, unknown>)?.cogs || 0);
      const despA = Number((da.rows[0] as Record<string, unknown>)?.total || 0);
      const freteCustoAnt = Number((freteAntR.rows[0] as Record<string, unknown>)?.total || 0);
      const despesasComFreteAnt = Number((despA + freteCustoAnt).toFixed(2));
      const lucroBA = Number((recA - custA).toFixed(2));
      const lucroOA = Number((lucroBA - despesasComFreteAnt - 0).toFixed(2));
      dreAnterior = {
        receitas: recA,
        custosVendas: custA,
        lucroBruto: lucroBA,
        despesas: despesasComFreteAnt,
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
        receitaBruta,
        receitaLiquida,
        custosVendas,
        lucroBruto,
        despesas,
        impostos,
        lucroOperacional,
        ebitda,
        margemBruta,
        margemOperacional,
        margemEbitda,
        despesasSobreReceita,
        custosSobreReceita,
      },
      ...(dreAnterior ? { dreAnterior } : {}),
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/dre error", e);
    res.status(500).json({ error: "Erro ao gerar DRE" });
  }
}
