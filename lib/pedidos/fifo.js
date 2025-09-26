// lib/pedidos/fifo.js
// Funções compartilhadas para processamento de itens de pedidos (VENDA) com lógica FIFO e fallback legacy.
import { consumirFIFO } from "lib/fifo";

/**
 * processarItensVenda
 * Itera itens enviados, calcula totais e custos (FIFO ou legacy) e retorna dados para inserção.
 * @param {object} params
 *  - client: pg client (transação aberta)
 *  - itens: array de itens { produto_id, quantidade, preco_unitario?, desconto_unitario? }
 *  - dataEmissao: string 'YYYY-MM-DD' (para média histórica fallback)
 * Retorna:
 *  {
 *    itens: [ { produto_id, quantidade, preco, desconto, total_item, custo_unit_venda, custo_total_item, legacy, consumo? } ],
 *    consumosPorItem: [ { produto_id, legacy, consumo? } ],
 *    totais: { totalBruto, descontoTotal, totalLiquido }
 *  }
 */
export async function processarItensVenda({ client, itens, dataEmissao }) {
  const result = [];
  const consumosPorItem = [];
  let totalBruto = 0,
    descontoTotal = 0,
    totalLiquido = 0;

  for (const it of itens) {
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

    let custoUnitVenda = null;
    let custoTotalItem = null;
    // Verifica saldo em lotes para decidir FIFO vs fallback
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
      } catch (err) {
        if (err.code === "ESTOQUE_INSUFICIENTE")
          throw new Error(
            `Saldo insuficiente para o produto "${it.produto_id}"`,
          );
        throw err;
      }
    } else {
      if (dispLotes > 0 && dispLotes < qtd) {
        throw new Error(`Saldo insuficiente para o produto "${it.produto_id}"`);
      }
      // fallback legacy (sem lotes): checar saldo agregado e calcular média
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
