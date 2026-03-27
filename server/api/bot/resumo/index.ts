import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const result = await database.query({
      text: `SELECT
               COUNT(*) FILTER (WHERE p.data_emissao::date = CURRENT_DATE) AS pedidos_hoje,
               COALESCE(SUM(CASE WHEN p.data_emissao::date = CURRENT_DATE THEN p.total_liquido END), 0) AS total_hoje,
               COUNT(*) FILTER (WHERE p.status::text IN ('rascunho')) AS pedidos_em_andamento
             FROM pedidos p
             JOIN entities e ON e.id = p.partner_entity_id
             WHERE p.tipo = 'VENDA'
               AND e.entity_type = 'PF'
               AND COALESCE(e.tipo_cliente, 'pessoa_juridica') = 'pessoa_fisica'
               AND COALESCE(p.observacao::text, '') LIKE '%"origem":"BOT_WHATSAPP"%'`,
      values: [],
    });
    const row = result.rows[0] as Record<string, unknown>;
    res.status(200).json({
      pedidos_hoje: Number(row.pedidos_hoje ?? 0),
      total_hoje: Number(row.total_hoje ?? 0),
      pedidos_em_andamento: Number(row.pedidos_em_andamento ?? 0),
    });
  } catch (error) {
    console.error("[bot/resumo] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}

