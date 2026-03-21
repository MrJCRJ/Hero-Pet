import database from "infra/database.js";
import { getReportBounds } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function indicadoresHandler(
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

    const firstDate = new Date(firstDay);
    const lastDate = new Date(lastDay);
    const diasPeriodo = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)));

    const [
      vendasR,
      comprasR,
      cogsR,
      estoqueR,
      crInicialR,
      crFinalR,
      cpInicialR,
      cpFinalR,
    ] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
               FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
               WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2`,
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
        text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
               WHERE pp.paid_at IS NULL OR pp.paid_at >= $1::date`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
               FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
               WHERE pp.paid_at IS NULL OR pp.paid_at >= $1::date`,
        values: [lastDay],
      }),
      database.query({
        text: `SELECT (
                 COALESCE((SELECT SUM(pp.amount) FROM pedido_promissorias pp
                   JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'COMPRA'
                   WHERE p.data_emissao < $1::date AND (pp.paid_at IS NULL OR pp.paid_at >= $1::date)), 0) +
                 COALESCE((SELECT SUM(valor) FROM despesas
                   WHERE status != 'cancelado' AND (data_pagamento IS NULL OR data_pagamento >= $1::date)), 0)
               )::numeric(14,2) AS total`,
        values: [firstDay],
      }),
      database.query({
        text: `SELECT (
                 COALESCE((SELECT SUM(pp.amount) FROM pedido_promissorias pp
                   JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'COMPRA'
                   WHERE p.data_emissao < $1::date AND (pp.paid_at IS NULL OR pp.paid_at >= $1::date)), 0) +
                 COALESCE((SELECT SUM(valor) FROM despesas
                   WHERE status != 'cancelado' AND (data_pagamento IS NULL OR data_pagamento >= $1::date)), 0)
               )::numeric(14,2) AS total`,
        values: [lastDay],
      }),
    ]);

    const vendas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
    const compras = Number((comprasR.rows[0] as Record<string, unknown>)?.total || 0);
    const cogs = Number((cogsR.rows[0] as Record<string, unknown>)?.cogs || 0);
    const estoque = Number((estoqueR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasReceberInicial = Number((crInicialR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasReceberFinal = Number((crFinalR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasPagarInicial = Number((cpInicialR.rows[0] as Record<string, unknown>)?.total || 0);
    const contasPagarFinal = Number((cpFinalR.rows[0] as Record<string, unknown>)?.total || 0);

    const crMedia = (contasReceberInicial + contasReceberFinal) / 2;
    const cpMedia = (contasPagarInicial + contasPagarFinal) / 2;

    const pmr = vendas > 0 && crMedia >= 0
      ? Number(((crMedia / vendas) * diasPeriodo).toFixed(1))
      : null;
    const pmp = compras > 0 && cpMedia >= 0
      ? Number(((cpMedia / compras) * diasPeriodo).toFixed(1))
      : null;
    const giroEstoque = estoque > 0 && cogs > 0
      ? Number((cogs / estoque).toFixed(2))
      : null;
    const dve = giroEstoque != null && giroEstoque > 0
      ? Number((365 / giroEstoque).toFixed(1))
      : (estoque > 0 && cogs > 0 ? Number(((estoque / cogs) * diasPeriodo).toFixed(1)) : null);

    res.status(200).json({
      periodo: { mes, ano, firstDay, lastDay, diasPeriodo },
      indicadores: {
        pmr: { valor: pmr, label: "Prazo médio de recebimento (dias)", unidade: "dias" },
        pmp: { valor: pmp, label: "Prazo médio de pagamento (dias)", unidade: "dias" },
        giroEstoque: { valor: giroEstoque, label: "Giro de estoque", unidade: "vezes/ano" },
        dve: { valor: dve, label: "Dias de venda em estoque", unidade: "dias" },
      },
      base: {
        vendas,
        compras,
        cogs,
        estoque,
        contasReceberInicial,
        contasReceberFinal,
        contasPagarInicial,
        contasPagarFinal,
      },
    });
  } catch (e) {
    console.error("GET /relatorios/indicadores error", e);
    res.status(500).json({ error: "Erro ao calcular indicadores" });
  }
}
