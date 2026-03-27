// lib/domain/pedidos/processarItens - Processamento de itens (VENDA) com FIFO e fallback legacy.
import type { PoolClient } from "pg";
import { consumirFIFO } from "./fifo";
import { lockProdutoEstoque, isSimplifiedStockEnabled } from "lib/stock/simplified";

interface ItemPayload {
  produto_id: number;
  quantidade: number;
  preco_unitario?: number | null;
  desconto_unitario?: number | null;
}

interface ProcessarItensVendaParams {
  client: PoolClient;
  itens: ItemPayload[];
  dataEmissao?: string | null;
}

export async function processarItensVenda({
  client,
  itens,
  dataEmissao,
}: ProcessarItensVendaParams): Promise<{
  itens: Array<Record<string, unknown>>;
  consumosPorItem: Array<Record<string, unknown>>;
  totais: { totalBruto: number; descontoTotal: number; totalLiquido: number };
}> {
  const result: Array<Record<string, unknown>> = [];
  const consumosPorItem: Array<Record<string, unknown>> = [];
  let totalBruto = 0,
    descontoTotal = 0,
    totalLiquido = 0;

  for (const it of itens) {
    if (isSimplifiedStockEnabled()) {
      const produto = await lockProdutoEstoque(client, Number(it.produto_id));
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error("quantidade inválida");
      if (produto.estoqueKg < qtd) throw new Error(`Saldo insuficiente para o produto "${it.produto_id}"`);
      const rProd = await client.query({
        text: `SELECT id, preco_tabela FROM produtos WHERE id = $1`,
        values: [it.produto_id],
      });
      if (!rProd.rows.length) throw new Error(`produto_id inválido: ${it.produto_id}`);
      const preco =
        it.preco_unitario != null
          ? Number(it.preco_unitario)
          : Number(rProd.rows[0].preco_tabela ?? 0);
      const desconto = it.desconto_unitario != null ? Number(it.desconto_unitario) : 0;
      const totalItem = (preco - desconto) * qtd;
      totalBruto += preco * qtd;
      descontoTotal += desconto * qtd;
      totalLiquido += totalItem;

      const novoEstoque = produto.estoqueKg - qtd;
      await client.query({
        text: `UPDATE produtos SET estoque_kg = $1, updated_at = NOW() WHERE id = $2`,
        values: [novoEstoque, it.produto_id],
      });
      const custoUnitVenda = Number(produto.custoMedioKg.toFixed(2));
      const custoTotalItem = Number((custoUnitVenda * qtd).toFixed(2));
      consumosPorItem.push({ produto_id: it.produto_id, simplified: true, custo_unitario_medio: custoUnitVenda });
      result.push({
        produto_id: it.produto_id,
        quantidade: qtd,
        preco,
        desconto,
        total_item: totalItem,
        custo_unit_venda: custoUnitVenda,
        custo_total_item: custoTotalItem,
        legacy: false,
        simplified: true,
      });
      continue;
    }

    const rProd = await client.query({
      text: `SELECT id, preco_tabela FROM produtos WHERE id = $1`,
      values: [it.produto_id],
    });
    if (!rProd.rows.length)
      throw new Error(`produto_id inválido: ${it.produto_id}`);
    const qtd = Number(it.quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0)
      throw new Error(`quantidade inválida`);
    const preco =
      it.preco_unitario != null
        ? Number(it.preco_unitario)
        : Number(rProd.rows[0].preco_tabela ?? 0);
    const desconto =
      it.desconto_unitario != null ? Number(it.desconto_unitario) : 0;
    const totalItem = (preco - desconto) * qtd;
    totalBruto += preco * qtd;
    descontoTotal += desconto * qtd;
    totalLiquido += totalItem;

    let custoUnitVenda: number | null = null;
    let custoTotalItem: number | null = null;
    const lotesDispQ = await client.query({
      text: `SELECT COALESCE(SUM(quantidade_disponivel),0) AS disp FROM estoque_lote WHERE produto_id=$1`,
      values: [it.produto_id],
    });
    const dispLotes = Number(lotesDispQ.rows?.[0]?.disp || 0);
    if (dispLotes >= qtd && dispLotes > 0) {
      try {
        const consumo = await consumirFIFO({
          client,
          produtoId: it.produto_id,
          quantidade: qtd,
        });
        custoTotalItem = Number(consumo.custo_total.toFixed(2));
        custoUnitVenda = Number((consumo.custo_total / qtd).toFixed(2));
        consumosPorItem.push({ produto_id: it.produto_id, consumo });
        result.push({
          produto_id: it.produto_id,
          quantidade: qtd,
          preco,
          desconto,
          total_item: totalItem,
          custo_unit_venda: custoUnitVenda,
          custo_total_item: custoTotalItem,
          legacy: false,
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "ESTOQUE_INSUFICIENTE")
          throw new Error(
            `Saldo insuficiente para o produto "${it.produto_id}"`,
          );
        throw err;
      }
    } else {
      if (dispLotes > 0 && dispLotes < qtd) {
        throw new Error(`Saldo insuficiente para o produto "${it.produto_id}"`);
      }
      const saldoAgregadoQ = await client.query({
        text: `SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE 0 END),0) AS saldo
               FROM movimento_estoque WHERE produto_id = $1`,
        values: [it.produto_id],
      });
      const saldoAgregado = Number(saldoAgregadoQ.rows?.[0]?.saldo || 0);
      if (saldoAgregado < qtd)
        throw new Error(`Saldo insuficiente para o produto "${it.produto_id}"`);
      const custoQ = await client.query({
        text: `SELECT COALESCE(SUM(valor_total)/NULLIF(SUM(quantidade),0),0) AS custo
               FROM movimento_estoque
               WHERE produto_id = $1 AND tipo = 'ENTRADA' AND data_movimento <= COALESCE($2::timestamptz, NOW())`,
        values: [it.produto_id, dataEmissao || null],
      });
      custoUnitVenda = Number(Number(custoQ.rows?.[0]?.custo || 0).toFixed(2));
      custoTotalItem = Number((custoUnitVenda * qtd).toFixed(2));
      consumosPorItem.push({ produto_id: it.produto_id, legacy: true });
      result.push({
        produto_id: it.produto_id,
        quantidade: qtd,
        preco,
        desconto,
        total_item: totalItem,
        custo_unit_venda: custoUnitVenda,
        custo_total_item: custoTotalItem,
        legacy: true,
      });
    }
  }

  return {
    itens: result,
    consumosPorItem,
    totais: { totalBruto, descontoTotal, totalLiquido },
  };
}
