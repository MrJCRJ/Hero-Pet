// pages/api/v1/pedidos/[id]/nf.js
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
  drawHeader,
  drawParties,
  drawTransportadora,
  computeItemColumns,
  drawItemsHeader,
  drawItemsRows,
  drawTotals,
  drawSignature,
  drawFooter,
} from "lib/pdf/nf/sections";


export default async function handler(req, res) {
  if (req.method === "GET") return getNF(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getNF(req, res) {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    // Buscar dados do pedido e destinatário
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
    if (!head.rows.length) return res.status(404).json({ error: "Pedido não encontrado" });
    const pedido = head.rows[0];

    if (pedido.tipo !== 'VENDA') {
      return res.status(400).json({ error: "Geração de NF permitida apenas para pedidos de VENDA" });
    }
    if (!pedido.tem_nota_fiscal) {
      return res.status(400).json({ error: "Pedido não possui nota fiscal habilitada" });
    }

    // Buscar itens do pedido
    const itensQ = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome, p.codigo_barras
             FROM pedido_itens i
             JOIN produtos p ON p.id = i.produto_id
             WHERE i.pedido_id = $1
             ORDER BY i.id`,
      values: [id],
    });

    // Cabeçalhos de resposta (forçar download)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NF-${pedido.id}.pdf"`);
    const doc = new PDFDocument({ margin: 36 }); // margem menor para mais área útil
    doc.pipe(res);

    // Dados fixos da empresa (Emitente) agora em lib/constants/company

    // Lookup opcional de endereço por CEP (não persiste; apenas exibição)
    const cepDigits = stripDigits(pedido.entidade_cep || '');
    const viaCepAddr = await tryFetchViaCep(cepDigits);
    const DEST_ENDERECO = composeEnderecoFromViaCep(
      viaCepAddr,
      pedido.entidade_numero,
      pedido.entidade_complemento,
      cepDigits
    );

    const LOGO_PNG = tryLoadLogoPng();

    // Desenho (modular)
    drawHeader(doc, pedido, LOGO_PNG);
    drawParties(doc, pedido, DEST_ENDERECO);

    // Transportadora: valores fixos fornecidos + campos calculados (quantidade e pesos)
    const parseWeightKgFromName = (name = '') => {
      // Suporta: "25kg", "25 KG", "25Kg", "125kg" e tolera espaços entre K e G, e plural opcional (kgs)
      const m = String(name || '').match(/(\d+(?:[.,]\d+)?)\s*(?:k\s*g\s*s?)/i);
      if (!m) return 0;
      const n = Number(String(m[1]).replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    };
    const totals = itensQ.rows.reduce((acc, row) => {
      const qtd = Number(row.quantidade) || 0;
      acc.quantidade += qtd;
      const unitKg = parseWeightKgFromName(row.produto_nome || '');
      acc.pesoKg += unitKg * qtd;
      return acc;
    }, { quantidade: 0, pesoKg: 0 });

    const pesoFmt = `${totals.pesoKg.toFixed(2)} kg`;
    drawTransportadora(doc, {
      razao: 'Nosso Transporte',
      cpf: '406,986,885-20',
      placa: 'IAI1506',
      // Usa UF do ViaCEP quando disponível; fallback para 'SE' (apenas sigla)
      uf: (viaCepAddr && viaCepAddr.uf) ? viaCepAddr.uf : 'SE',
      quantidade: totals.quantidade,
      especie: '',
      pesoB: pesoFmt,
      pesoL: pesoFmt,
    });

    const colsMeta = computeItemColumns(doc);
    const yStart = drawItemsHeader(doc, colsMeta);
    const { y: yAfterRows, totalGeral } = drawItemsRows(doc, colsMeta, itensQ.rows, yStart);
    const bottomAfterTotals = drawTotals(doc, pedido, yAfterRows, totalGeral);
    drawSignature(doc, bottomAfterTotals + 16, () => drawHeader(doc, pedido, LOGO_PNG));
    drawFooter(doc);

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/nf error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos|pedido_itens|produtos missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
// Não há POST: NF não é persistida. O PDF é gerado on-the-fly via GET acima.