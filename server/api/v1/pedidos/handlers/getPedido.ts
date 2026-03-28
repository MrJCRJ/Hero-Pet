import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

const HEAD_QUERY = `SELECT pedidos.*,
  CASE
    WHEN tipo = 'COMPRA' THEN true
    WHEN EXISTS (
      SELECT 1 FROM movimento_estoque m
       WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA'
    )
    AND NOT EXISTS (
      SELECT 1 FROM movimento_estoque m
       WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
    )
    AND NOT EXISTS (
      SELECT 1 FROM movimento_estoque m
      LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
       WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
    )
    THEN true
    ELSE false
  END AS fifo_aplicado,
  CASE
    WHEN tipo='COMPRA' THEN 'fifo'
    WHEN (
      EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA')
      AND NOT EXISTS (
        SELECT 1 FROM movimento_estoque m
        WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM movimento_estoque m
        LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
        WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
      )
    ) THEN 'fifo'
    WHEN tipo='VENDA'
      AND EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA')
      AND EXISTS (
        SELECT 1 FROM movimento_estoque m
        LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
        WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM pedido_itens i
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(l.quantidade_disponivel),0) AS disponivel
          FROM estoque_lote l WHERE l.produto_id = i.produto_id
        ) ld ON true
        WHERE i.pedido_id = pedidos.id AND ld.disponivel < i.quantidade
      )
    THEN 'eligible'
    ELSE 'legacy'
  END AS fifo_state
  FROM pedidos WHERE id = $1`;

export async function getPedido(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const head = await database.query({
      text: HEAD_QUERY,
      values: [id],
    });
    if (!head.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const itens = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome FROM pedido_itens i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = $1 ORDER BY i.id`,
      values: [id],
    });
    const promissorias = await database.query({
      text: `SELECT id, pedido_id, seq, to_char(due_date, 'YYYY-MM-DD') AS due_date, amount, paid_at,
        CASE WHEN paid_at IS NOT NULL THEN 'PAGO' WHEN due_date < CURRENT_DATE THEN 'ATRASADO' ELSE 'PENDENTE' END AS status
        FROM pedido_promissorias WHERE pedido_id = $1 ORDER BY seq`,
      values: [id],
    });
    res.status(200).json({
      ...head.rows[0],
      itens: itens.rows,
      promissorias: promissorias.rows,
    });
  } catch (e) {
    console.error("GET /pedidos/:id error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (pedidos/pedido_itens missing)",
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
