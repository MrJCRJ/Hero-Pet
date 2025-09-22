// pages/api/v1/pedidos/[id]/promissorias-pdf.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";
import {
  stripDigits,
  tryFetchViaCep,
  composeEnderecoFromViaCep,
  tryLoadLogoPng,
} from "lib/pdf/nf/helpers";
import {
  drawPromissoriaCard,
  PROMISSORIA_CARD_HEIGHT,
} from "lib/pdf/promissoria/sections";

export default async function handler(req, res) {
  if (req.method === "GET") return getPromissoriasPDF(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // ajusta fim de mês
  return d;
}

async function getPromissoriasPDF(req, res) {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });

    // Carregar pedido e entidade
    const head = await database.query({
      text: `SELECT p.*,
                    e.name AS entidade_nome,
                    e.document_digits AS entidade_document,
                    e.entity_type AS entidade_tipo,
                    e.telefone AS entidade_telefone,
                    e.email AS entidade_email,
                    e.cep AS entidade_cep,
                    e.numero AS entidade_numero,
                    e.complemento AS entidade_complemento
             FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE p.id = $1`,
      values: [id],
    });
    if (!head.rows.length)
      return res.status(404).json({ error: "Pedido não encontrado" });
    const pedido = head.rows[0];

    if (pedido.tipo !== "VENDA")
      return res
        .status(400)
        .json({ error: "Promissórias válidas apenas para pedidos de VENDA" });
    if (!pedido.parcelado)
      return res
        .status(400)
        .json({ error: "Pedido não está parcelado em promissórias" });

    // Buscar itens para fallback de total
    const itensQ = await database.query({
      text: `SELECT i.* FROM pedido_itens i WHERE i.pedido_id = $1 ORDER BY i.id`,
      values: [id],
    });
    const itens = itensQ.rows || [];
    const totalItens = itens.reduce((acc, it) => {
      const qtd = Number(it.quantidade);
      const preco = Number(it.preco_unitario);
      const desc = Number(it.desconto_unitario || 0);
      const total =
        Number.isFinite(qtd) && Number.isFinite(preco)
          ? qtd * (preco - desc)
          : 0;
      return acc + (Number.isFinite(total) ? total : 0);
    }, 0);
    const totalLiquido =
      pedido.total_liquido != null ? Number(pedido.total_liquido) : totalItens;

    const n = Number(pedido.numero_promissorias || 1);
    const firstDate =
      pedido.data_primeira_promissoria || pedido.data_emissao || new Date();
    const baseAmount = Number(
      pedido.valor_por_promissoria || (n > 0 ? totalLiquido / n : totalLiquido),
    );

    // Corrigir arredondamento distribuindo diferença na última parcela
    const parcelas = [];
    let acumulado = 0;
    for (let i = 0; i < Math.max(1, n); i++) {
      const due = addMonths(firstDate, i);
      let amount = Number(baseAmount.toFixed(2));
      if (i < n - 1) {
        acumulado += amount;
      } else {
        amount = Number((totalLiquido - acumulado).toFixed(2));
      }
      parcelas.push({
        seq: i + 1,
        totalSeq: Math.max(1, n),
        amount,
        dueDate: due,
      });
    }

    // Enriquecer endereço (apenas exibição)
    const cepDigits = stripDigits(pedido.entidade_cep || "");
    const viaCepAddr = await tryFetchViaCep(cepDigits);
    const DEST_ENDERECO = composeEnderecoFromViaCep(
      viaCepAddr,
      pedido.entidade_numero,
      pedido.entidade_complemento,
      cepDigits,
    );

    // PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Promissorias-${pedido.id}.pdf"`,
    );
    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);

    const LOGO_PNG = tryLoadLogoPng();
    const topY = doc.page.margins.top; // sem header, começar no topo útil
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const gap = 10; // pequeno espaço entre cartões

    let y = topY;
    parcelas.forEach((parc) => {
      // Se não couber o próximo cartão, nova página
      if (y + PROMISSORIA_CARD_HEIGHT + gap > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      // Desenha cartão na posição atual; drawPromissoriaCard já avança doc.y
      drawPromissoriaCard(doc, parc, pedido, DEST_ENDERECO, LOGO_PNG);
      y = doc.y + gap;
    });

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/promissorias-pdf error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({
          error: "Schema not migrated (pedidos|pedido_itens missing)",
          dependency: "database",
          code: e.code,
          action: "Run migrations",
        });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({
          error: "Database unreachable",
          dependency: "database",
          code: e.code,
        });
    return res.status(500).json({ error: "Internal error" });
  }
}
