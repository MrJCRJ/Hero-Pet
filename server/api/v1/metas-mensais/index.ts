import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function parseIntOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function parseNumOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

export default async function metasMensaisHandler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method === "GET") {
    try {
      const ano = parseIntOrNull(req.query?.ano);
      const mes = parseIntOrNull(req.query?.mes);

      if (ano != null && mes != null) {
        const r = await database.query({
          text: `SELECT ano, mes,
                       meta_receita, meta_lucro_operacional, meta_margem_operacional
                  FROM metas_mensais
                 WHERE ano = $1 AND mes = $2
                 LIMIT 1`,
          values: [ano, mes],
        });
        res.status(200).json({ item: r.rows?.[0] ?? null });
        return;
      }

      const where = ano != null ? "WHERE ano = $1" : "";
      const values = ano != null ? [ano] : [];
      const list = await database.query({
        text: `SELECT ano, mes,
                      meta_receita, meta_lucro_operacional, meta_margem_operacional
                 FROM metas_mensais
                 ${where}
                 ORDER BY ano DESC, mes DESC
                 LIMIT 240`,
        values,
      });
      res.status(200).json({ itens: list.rows ?? [] });
      return;
    } catch (e) {
      console.error("GET /metas-mensais error", e);
      res.status(500).json({ error: "Erro ao buscar metas mensais" });
      return;
    }
  }

  if (req.method === "PUT") {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const ano = parseIntOrNull(body.ano);
      const mes = parseIntOrNull(body.mes);
      const meta_receita = parseNumOrNull(body.meta_receita);
      const meta_lucro_operacional = parseNumOrNull(body.meta_lucro_operacional);
      const meta_margem_operacional = body.meta_margem_operacional == null ? null : parseNumOrNull(body.meta_margem_operacional);

      if (ano == null || mes == null || mes < 1 || mes > 12) {
        res.status(400).json({ error: "Parâmetros inválidos (ano/mes)" });
        return;
      }
      if (meta_receita == null || meta_lucro_operacional == null) {
        res.status(400).json({ error: "Campos obrigatórios: meta_receita, meta_lucro_operacional" });
        return;
      }

      const r = await database.query({
        text: `INSERT INTO metas_mensais
                 (ano, mes, meta_receita, meta_lucro_operacional, meta_margem_operacional, updated_at)
               VALUES
                 ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (ano, mes) DO UPDATE SET
                 meta_receita = EXCLUDED.meta_receita,
                 meta_lucro_operacional = EXCLUDED.meta_lucro_operacional,
                 meta_margem_operacional = EXCLUDED.meta_margem_operacional,
                 updated_at = NOW()
               RETURNING ano, mes, meta_receita, meta_lucro_operacional, meta_margem_operacional`,
        values: [ano, mes, meta_receita, meta_lucro_operacional, meta_margem_operacional],
      });

      res.status(200).json({ item: r.rows?.[0] ?? null });
      return;
    } catch (e) {
      console.error("PUT /metas-mensais error", e);
      res.status(500).json({ error: "Erro ao salvar metas mensais" });
      return;
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}

