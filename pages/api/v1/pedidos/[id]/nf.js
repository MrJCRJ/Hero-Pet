// pages/api/v1/pedidos/[id]/nf.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";

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
      text: `SELECT p.*, e.name AS entidade_nome, e.document_digits AS entidade_document, e.entity_type AS entidade_tipo
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

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Título e cabeçalho
    doc.fontSize(18).text('NOTA FISCAL (MVP)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Pedido: #${pedido.id}`);
    doc.text(`Tipo: ${pedido.tipo}`);
    doc.text(`Emissão: ${pedido.data_emissao ? new Date(pedido.data_emissao).toLocaleDateString('pt-BR') : '-'}`);
    if (pedido.data_entrega) doc.text(`Entrega: ${new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}`);
    doc.moveDown(0.5);

    // Destinatário
    doc.fontSize(12).text('Destinatário', { underline: true });
    doc.fontSize(10);
    const nome = pedido.entidade_nome || pedido.partner_name || 'Não informado';
    const docRaw = pedido.entidade_document || pedido.partner_document || '';
    doc.text(`Nome: ${nome}`);
    if (docRaw) doc.text(`Documento: ${docRaw}`);
    if (pedido.entidade_tipo) doc.text(`Tipo: ${pedido.entidade_tipo}`);
    doc.moveDown(0.5);

    // Itens
    doc.fontSize(12).text('Itens', { underline: true });
    doc.fontSize(9);
    doc.text('Produto', 50, doc.y);
    doc.text('Qtd', 260, doc.y);
    doc.text('Preço', 300, doc.y);
    doc.text('Desc.', 360, doc.y);
    doc.text('Total', 420, doc.y);
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    doc.moveDown(1.2);

    let totalGeral = 0;
    itensQ.rows.forEach((it) => {
      const qtd = Number(it.quantidade);
      const preco = Number(it.preco_unitario);
      const desc = Number(it.desconto_unitario || 0);
      const total = Number(it.total_item);
      totalGeral += Number(total || 0);
      const y = doc.y;
      doc.text(String(it.produto_nome || it.produto_id), 50, y, { width: 200 });
      doc.text(qtd.toFixed(3), 260, y);
      doc.text(`R$ ${preco.toFixed(2)}`, 300, y);
      doc.text(`R$ ${desc.toFixed(2)}`, 360, y);
      doc.text(`R$ ${Number(total || 0).toFixed(2)}`, 420, y);
      doc.moveDown(1);
      if (doc.y > 720) {
        doc.addPage();
      }
    });

    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total Bruto: R$ ${Number(pedido.total_bruto || totalGeral).toFixed(2)}`);
    doc.text(`Descontos: R$ ${Number(pedido.desconto_total || 0).toFixed(2)}`);
    doc.text(`Total Líquido: R$ ${Number(pedido.total_liquido || totalGeral).toFixed(2)}`);

    // Observação
    if (pedido.observacao) {
      doc.moveDown(0.5);
      doc.fontSize(12).text('Observações', { underline: true });
      doc.fontSize(10).text(String(pedido.observacao), { width: 500 });
    }

    doc.moveDown(1);
    doc.fontSize(8).text('Emitido por Hero-Pet • Dados do emitente serão configurados posteriormente.');
    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/nf error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos|pedido_itens|produtos missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
// Não há POST: NF não é persistida. O PDF é gerado on-the-fly via GET acima.