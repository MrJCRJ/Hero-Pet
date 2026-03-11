import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export async function listPedidos(
  req: ApiReqLike,
  res: ApiResLike,
): Promise<void> {
  try {
    const q = (req.query || {}) as Record<string, string | string[] | undefined>;
    const status = q.status;
    const tipo = q.tipo;
    const searchQ = q.q;
    const partnerEntityId = q.partner;
    const from = q.from;
    const to = q.to;
    const limit = q.limit;
    const offset = q.offset;
    const meta = q.meta;

    const clauses: string[] = [];
    const values: unknown[] = [];

    if (tipo) {
      const tipoStr = typeof tipo === "string" ? tipo : String(tipo);
      if (!["VENDA", "COMPRA"].includes(tipoStr)) {
        res.status(400).json({ error: "tipo inválido" });
        return;
      }
      values.push(tipoStr);
      clauses.push(`tipo = $${values.length}`);
    }
    if (status) {
      const statusStr = typeof status === "string" ? status : String(status);
      if (!["confirmado", "cancelado"].includes(statusStr)) {
        res.status(400).json({ error: "status inválido" });
        return;
      }
      values.push(statusStr);
      clauses.push(`status = $${values.length}`);
    }
    if (partnerEntityId) {
      const pid = parseInt(String(partnerEntityId), 10);
      if (Number.isFinite(pid)) {
        values.push(pid);
        clauses.push(`p.partner_entity_id = $${values.length}`);
      }
    }
    if (searchQ) {
      const searchStr = String(searchQ).trim();
      const m = searchStr.match(/^#?(\d+)$/);
      if (m) {
        const idNum = parseInt(m[1], 10);
        if (Number.isFinite(idNum)) {
          values.push(idNum);
          clauses.push(`p.id = $${values.length}`);
        }
      } else {
        values.push(`%${searchStr}%`);
        const idx = values.length;
        clauses.push(
          `(p.partner_name ILIKE $${idx} OR p.partner_document ILIKE $${idx})`,
        );
      }
    }
    if (from) {
      values.push(typeof from === "string" ? from : String(from));
      clauses.push(`data_emissao >= $${values.length}`);
    }
    if (to) {
      values.push(typeof to === "string" ? to : String(to));
      clauses.push(`data_emissao <= $${values.length}`);
    }

    const effectiveLimit = Math.min(
      parseInt(String(limit || "50"), 10) || 50,
      200,
    );
    const effectiveOffset = Math.max(
      parseInt(String(offset || "0"), 10) || 0,
      0,
    );
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const listQuery = {
      text: `SELECT p.id, p.tipo, p.status, p.partner_entity_id, p.partner_document,
                    COALESCE(p.partner_name, e.name) AS partner_name,
                    to_char(p.data_emissao, 'YYYY-MM-DD') AS data_emissao,
                    to_char(p.data_entrega, 'YYYY-MM-DD') AS data_entrega,
                    p.total_liquido, p.tem_nota_fiscal, p.parcelado,
                    p.numero_promissorias, to_char(p.data_primeira_promissoria, 'YYYY-MM-DD') AS data_primeira_promissoria, p.valor_por_promissoria, p.created_at,
                    COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL THEN pp.amount ELSE 0 END), 0)::numeric(14,2) AS total_pago,
                    p.frete_total,
                    CASE
                      WHEN p.tipo = 'COMPRA' THEN true
                      WHEN EXISTS (
                        SELECT 1 FROM movimento_estoque m
                         WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA'
                      )
                      AND NOT EXISTS (
                        SELECT 1 FROM movimento_estoque m
                         WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
                      )
                      AND NOT EXISTS (
                        SELECT 1 FROM movimento_estoque m
                        LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                         WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL
                      )
                      THEN true
                      ELSE false
                    END AS fifo_aplicado,
                    CASE
                      WHEN p.tipo = 'COMPRA' THEN 'fifo'
                      WHEN (
                        EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA')
                        AND NOT EXISTS (
                          SELECT 1 FROM movimento_estoque m
                          WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
                        )
                        AND NOT EXISTS (
                          SELECT 1 FROM movimento_estoque m
                          LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                          WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL
                        )
                      ) THEN 'fifo'
                      WHEN p.tipo='VENDA'
                        AND EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA')
                        AND EXISTS (
                          SELECT 1 FROM movimento_estoque m
                          LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                          WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL
                        )
                        AND NOT EXISTS (
                          SELECT 1 FROM pedido_itens i
                          LEFT JOIN LATERAL (
                            SELECT COALESCE(SUM(l.quantidade_disponivel),0) AS disponivel
                            FROM estoque_lote l WHERE l.produto_id = i.produto_id
                          ) ld ON true
                          WHERE i.pedido_id = p.id AND ld.disponivel < i.quantidade
                        )
                      THEN 'eligible'
                      ELSE 'legacy'
                    END AS fifo_state
        FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             LEFT JOIN pedido_promissorias pp ON pp.pedido_id = p.id
             ${where.replace(/\bFROM pedidos\b/, "FROM pedidos p")}
             GROUP BY p.id, e.name
             ORDER BY p.data_emissao DESC, p.id DESC
             LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`,
      values,
    };

    const result = await database.query(listQuery);
    if (String(meta) === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM pedidos p ${where}`,
        values,
      };
      const count = await database.query(countQuery);
      res.status(200).json({
        data: result.rows,
        meta: { total: (count.rows[0] as Record<string, unknown>).total },
      });
      return;
    }
    res.status(200).json(result.rows);
  } catch (e) {
    console.error("GET /pedidos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (pedidos missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
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
