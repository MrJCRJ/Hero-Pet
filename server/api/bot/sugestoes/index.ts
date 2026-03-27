import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { isSimplifiedStockEnabled } from "lib/stock/simplified";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  try {
    const simplified = isSimplifiedStockEnabled();
    const custosCte = simplified
      ? `WITH custos AS (
           SELECT id AS produto_id, COALESCE(custo_medio_kg, 0) AS custo_medio_kg
           FROM produtos
         )`
      : `WITH custos AS (
           SELECT
             produto_id,
             COALESCE(
               CASE
                 WHEN SUM(quantidade_disponivel) > 0
                   THEN SUM(quantidade_disponivel * custo_unitario) / SUM(quantidade_disponivel)
                 ELSE 0
               END,
               0
             ) AS custo_medio_kg
           FROM estoque_lote
           GROUP BY produto_id
         )`;
    const topVendas = await database.query({
      text: `SELECT
               p.id,
               p.nome,
               COALESCE(p.preco_kg_granel, p.preco_tabela, 0) AS preco_kg,
               COALESCE(SUM(pi.quantidade), 0) AS vendas_kg
             FROM pedido_itens pi
             JOIN pedidos ped ON ped.id = pi.pedido_id
             JOIN produtos p ON p.id = pi.produto_id
             WHERE ped.tipo = 'VENDA'
               AND ped.status = 'confirmado'
               AND ped.data_emissao >= NOW() - INTERVAL '30 days'
               AND p.ativo = true
               AND COALESCE(p.venda_granel, false) = true
             GROUP BY p.id, p.nome, COALESCE(p.preco_kg_granel, p.preco_tabela, 0)
             ORDER BY vendas_kg DESC
             LIMIT 5`,
      values: [],
    });

    const topMargem = await database.query({
      text: `${custosCte}
             SELECT
               p.id,
               p.nome,
               COALESCE(p.preco_kg_granel, p.preco_tabela, 0) AS preco_kg,
               COALESCE(
                 CASE
                   WHEN COALESCE(p.preco_kg_granel, p.preco_tabela, 0) > 0
                     THEN ((COALESCE(p.preco_kg_granel, p.preco_tabela, 0) - COALESCE(c.custo_medio_kg, 0))
                         / COALESCE(p.preco_kg_granel, p.preco_tabela, 0)) * 100
                   ELSE 0
                 END,
                 0
               ) AS margem_percentual
             FROM produtos p
             LEFT JOIN custos c ON c.produto_id = p.id
             WHERE p.ativo = true
               AND COALESCE(p.venda_granel, false) = true
               AND COALESCE(p.preco_kg_granel, p.preco_tabela, 0) > 0
             ORDER BY margem_percentual DESC
             LIMIT 5`,
      values: [],
    });

    res.status(200).json({
      top_vendas: (topVendas.rows as Array<Record<string, unknown>>).map((r) => ({
        id: Number(r.id),
        nome: String(r.nome ?? ""),
        preco_kg: Number(r.preco_kg ?? 0),
        vendas_kg: Number(r.vendas_kg ?? 0),
      })),
      top_margem: (topMargem.rows as Array<Record<string, unknown>>).map((r) => ({
        id: Number(r.id),
        nome: String(r.nome ?? ""),
        preco_kg: Number(r.preco_kg ?? 0),
        margem_percentual: Number(Number(r.margem_percentual ?? 0).toFixed(2)),
      })),
    });
  } catch (error) {
    console.error("[bot/sugestoes] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}

