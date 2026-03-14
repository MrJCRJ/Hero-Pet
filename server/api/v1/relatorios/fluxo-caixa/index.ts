import database from "infra/database.js";
import { gerarFluxoCaixaPDF } from "@/lib/relatorios/exportPDF";
import { gerarFluxoCaixaExcel } from "@/lib/relatorios/exportExcel";
import { getReportBounds, periodoFilename } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

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
    const mes = Number(req.query?.mes) ?? now.getMonth() + 1;
    const ano = Number(req.query?.ano) ?? now.getFullYear();
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    const [vendasR, promPagosR, aportesR, comprasR, despesasR, estoqueCustoR, estoqueVendaR] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos
               WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2
                 AND (parcelado = false OR parcelado IS NULL)`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL AND pp.paid_at >= $1::date AND pp.paid_at < $2::date THEN pp.amount ELSE 0 END),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp
               JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM aportes_capital
               WHERE data >= $1::date AND data < $2::date`,
        values: [firstDay, lastDay],
      }).catch(() => ({ rows: [{ total: 0 }] })),
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
      database.query({
        text: `SELECT COALESCE(SUM(saldo * COALESCE(custo_medio, 0)), 0)::numeric(14,2) AS total
               FROM (
                 SELECT p.id,
                   COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                   (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque WHERE produto_id = p.id AND tipo = 'ENTRADA')::numeric(14,2) AS custo_medio
                 FROM produtos p
                 LEFT JOIN movimento_estoque m ON m.produto_id = p.id
                 WHERE p.ativo = true
                 GROUP BY p.id
               ) sub`,
      }).catch(() => ({ rows: [{ total: 0 }] })),
      database.query({
        text: `SELECT COALESCE(SUM(saldo * preco_venda), 0)::numeric(14,2) AS total
               FROM (
                 SELECT p.id,
                   COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                   COALESCE(
                     NULLIF(p.preco_tabela, 0),
                     (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque me WHERE me.produto_id = p.id AND me.tipo = 'ENTRADA')::numeric(14,2)
                       * (1 + COALESCE(NULLIF(p.markup_percent_default, 0), 0)::numeric / 100),
                     0
                   )::numeric(14,2) AS preco_venda
                 FROM produtos p
                 LEFT JOIN movimento_estoque m ON m.produto_id = p.id
                 WHERE p.ativo = true
                 GROUP BY p.id, p.preco_tabela, p.markup_percent_default
               ) sub
               WHERE saldo > 0`,
      }).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    const vendas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const promissoriasRecebidas = Number((promPagosR.rows[0] as Record<string, unknown>)?.total || 0);
    const aportesCapital = Number((aportesR.rows[0] as Record<string, unknown>)?.total || 0);
    const compras = Number((comprasR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesas = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
    const entradas = Number((vendas + promissoriasRecebidas + aportesCapital).toFixed(2));
    const saidas = Number((compras + despesas).toFixed(2));
    const saldo = Number((entradas - saidas).toFixed(2));
    const valorEstoque = Number((estoqueCustoR.rows[0] as Record<string, unknown>)?.total || 0);
    const valorPresumidoVendaEstoque = Number((estoqueVendaR.rows[0] as Record<string, unknown>)?.total || 0);

    const format = (req.query?.format as string) || "json";
    const payload = {
      periodo: { mes, ano, firstDay, lastDay },
      fluxo: {
        entradas: { vendas, promissoriasRecebidas, aportesCapital, total: entradas },
        saidas: { compras, despesas, total: saidas },
        saldo,
        valorEstoque,
        valorPresumidoVendaEstoque,
      },
    };

    if (format === "pdf") {
      gerarFluxoCaixaPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarFluxoCaixaExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Fluxo-Caixa-${periodoFilename(mes, ano)}.xlsx"`);
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
