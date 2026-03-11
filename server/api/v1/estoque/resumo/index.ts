// Lista saldos agregados de todos os produtos (para tela de estoque).
// GET /api/v1/estoque/resumo
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const q = (req.query || {}) as Record<string, string | string[] | undefined>;
    const limit = Math.min(
      parseInt(String(q.limit ?? "100"), 10) || 100,
      500
    );
    const offset = Math.max(parseInt(String(q.offset ?? "0"), 10) || 0, 0);
    const search = typeof q.q === "string" ? q.q.trim() : "";
    const alerta =
      typeof q.alerta === "string" && q.alerta === "1";
    const categoria = typeof q.categoria === "string" ? q.categoria.trim() : "";

    const searchClause = search
      ? `AND (p.nome ILIKE $${1} OR p.codigo_barras ILIKE $${1})`
      : "";
    const searchParam = search ? `%${search}%` : null;
    const categoriaClause = categoria ? `AND p.categoria = $${(searchParam ? 2 : 1)}` : "";
    const values: unknown[] = searchParam ? [searchParam] : [];
    if (categoria) values.push(categoria);

    const havingAlerta = alerta
      ? `HAVING p.estoque_minimo IS NOT NULL AND COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0) < p.estoque_minimo`
      : "";

    const query = {
      text: `SELECT p.id AS produto_id, p.nome, p.codigo_barras, p.categoria, p.estoque_minimo,
             COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
             (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque WHERE produto_id = p.id AND tipo = 'ENTRADA')::numeric(14,2) AS custo_medio
             FROM produtos p
             LEFT JOIN movimento_estoque m ON m.produto_id = p.id
             WHERE p.ativo = true ${searchClause} ${categoriaClause}
             GROUP BY p.id, p.nome, p.codigo_barras, p.categoria, p.estoque_minimo
             ${havingAlerta}
             ORDER BY p.nome
             LIMIT ${limit} OFFSET ${offset}`,
      values,
    };

    const result = await database.query(query);
    const rows = (result.rows as Array<Record<string, unknown>>).map((r) => ({
      produto_id: r.produto_id,
      nome: r.nome,
      codigo_barras: r.codigo_barras,
      categoria: r.categoria,
      estoque_minimo: r.estoque_minimo != null ? Number(r.estoque_minimo) : null,
      saldo: Number(r.saldo ?? 0),
      custo_medio:
        r.custo_medio != null ? Number(r.custo_medio) : null,
    }));

    res.status(200).json(rows);
  } catch (e) {
    console.error("GET /estoque/resumo error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (produtos or movimento_estoque missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations endpoint",
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}
