import type { PoolClient } from "pg";
import { aplicarConsumosFIFO } from "lib/fifo";

type ItemPedidoMovimento = Record<string, unknown>;

type ConsumoPorItem = {
  produto_id: number;
  legacy?: boolean;
  consumo?: {
    custo_unitario_medio: number;
    custo_total: number;
    consumos: Array<{
      lote_id: number;
      quantidade: number;
      custo_unitario: number;
      custo_total: number;
    }>;
  };
};

type RegistrarMovimentosVendaParams = {
  client: PoolClient;
  pedidoId: number;
  itens: ItemPedidoMovimento[];
  consumosPorItem: ConsumoPorItem[];
  dataMovimento?: string | null;
};

export async function registrarMovimentosVenda({
  client,
  pedidoId,
  itens,
  consumosPorItem,
  dataMovimento = null,
}: RegistrarMovimentosVendaParams): Promise<void> {
  const docTag = `PEDIDO:${pedidoId}`;

  for (const it of itens) {
    const produtoId = Number(it.produto_id);
    const quantidade = Number(it.quantidade);
    const custoUnitVenda = Number(it.custo_unit_venda);
    const custoTotalItem = Number(it.custo_total_item);

    const registroConsumo = consumosPorItem.find((c) => c.produto_id === produtoId);
    if (!registroConsumo) continue;

    if (registroConsumo.legacy) {
      await client.query({
        text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, data_movimento, custo_unitario_rec, custo_total_rec)
               VALUES ($1,'SAIDA',$2,$3,$4,$5, COALESCE($6::timestamptz, NOW()), $7, $8)`,
        values: [
          produtoId,
          quantidade,
          docTag,
          `SAIDA (LEGACY AVG COST) por criacao de pedido ${pedidoId}`,
          "PEDIDO",
          dataMovimento,
          custoUnitVenda,
          custoTotalItem,
        ],
      });
      continue;
    }

    const consumo = registroConsumo.consumo;
    if (!consumo) continue;

    const mov = await client.query({
      text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec, data_movimento)
             VALUES ($1,'SAIDA',$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, NOW()))
             RETURNING id`,
      values: [
        produtoId,
        quantidade,
        docTag,
        `SAIDA por criacao de pedido ${pedidoId}`,
        "PEDIDO",
        consumo.custo_unitario_medio,
        consumo.custo_total,
        dataMovimento,
      ],
    });
    const movRows = mov.rows as Array<{ id: number }>;
    await aplicarConsumosFIFO({
      client,
      movimentoId: movRows[0].id,
      consumos: consumo.consumos.map((c) => ({
        lote_id: c.lote_id,
        quantidade: c.quantidade,
        custo_unitario: c.custo_unitario,
        custo_total: c.custo_total,
      })),
    });
  }
}
