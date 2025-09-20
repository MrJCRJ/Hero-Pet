// pages/api/v1/pedidos/[id]/nf.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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

    // Helpers de formatação
    const BRL = (n) => `R$ ${Number(n || 0).toFixed(2)}`;
    const DATE = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');

    const doc = new PDFDocument({ margin: 36 }); // margem menor para mais área útil
    doc.pipe(res);

    // Dados fixos da empresa (Emitente)
    const EMITENTE = {
      razao: 'Hero Pet',
      email: 'HeroPetltda@gmail.com',
      gestao: 'Icaro Jhonatan | Jose Cicero',
      vendedor: '—',
      cnpj: '60.296.757/0001-04',
      loja: 'Distribuidora',
      endereco: 'Rua 92, n° 109, Albano',
      cidadeUf: 'Nossa Senhora do Socorro, SE',
      ie: '272309281',
      frete: 'CIF',
      telefone: '79 9 9975-9371'
    };

    // Carregar logo (PNG preferencial). Se não existir, ignora.
    const tryLoadLogo = () => {
      try {
        const pngPath = path.join(process.cwd(), 'Logo.png');
        if (fs.existsSync(pngPath)) return { type: 'png', path: pngPath };
      } catch (e) {
        // ignore
      }
      try {
        const svgPath = path.join(process.cwd(), 'Logo.svg');
        if (fs.existsSync(svgPath)) return { type: 'svg', path: svgPath };
      } catch (e) {
        // ignore
      }
      return null;
    };
    const LOGO = tryLoadLogo();

    const drawHeader = () => {
      const { width } = doc.page;
      const left = doc.page.margins.left;
      const right = width - doc.page.margins.right;
      const top = doc.page.margins.top;

      // Faixa superior
      doc.save();
      doc.rect(left, top - 10, right - left, 32).fill('#F3F4F6');
      doc.restore();

      // Logo + marca / título
      let titleX = left + 8;
      const titleY = top - 6;
      if (LOGO && LOGO.type === 'png') {
        try {
          doc.image(LOGO.path, left + 8, top - 6, { width: 36, height: 36, fit: [36, 36] });
          titleX += 44;
        } catch (e) {
          // ignore image errors
        }
      } else if (LOGO && LOGO.type === 'svg') {
        // pdfkit não suporta SVG nativamente sem plugin; neste caso, ignoramos ou convertemos externamente.
      }
      doc.fontSize(16).fillColor('#111827').text('Hero-Pet', titleX, titleY, { continued: false });
      doc.fontSize(10).fillColor('#374151').text('Documento Auxiliar de Nota Fiscal (MVP)', titleX, top + 12);

      // Info do pedido (lado direito)
      const info = [
        `Pedido: #${pedido.id}`,
        `Tipo: ${pedido.tipo}`,
        `Emissão: ${DATE(pedido.data_emissao)}`,
      ];
      if (pedido.data_entrega) info.push(`Entrega: ${DATE(pedido.data_entrega)}`);
      doc.fontSize(9).fillColor('#111827');
      const textWidth = 180;
      doc.text(info.join('  •  '), right - textWidth, top, { width: textWidth, align: 'right' });

      doc.moveTo(left, top + 28).lineTo(right, top + 28).strokeColor('#E5E7EB').lineWidth(1).stroke();
      doc.moveDown(1);
    };

    const box = (x, y, w, h, title) => {
      doc.save();
      doc.roundedRect(x, y, w, h, 4).strokeColor('#D1D5DB').lineWidth(1).stroke();
      if (title) {
        doc.rect(x + 1, y + 1, w - 2, 18).fill('#F9FAFB');
        doc.fillColor('#111827').fontSize(10).text(title, x + 8, y + 4);
      }
      doc.restore();
    };

    const drawParties = () => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const y = doc.y + 6;
      const w = right - left;
      const half = Math.floor(w / 2) - 6;

      // Emitente
      box(left, y, half, 120, 'Emitente');
      doc.fontSize(9).fillColor('#111827');
      const ex = left + 10;
      let ey = y + 24;
      doc.text(`Razão Social: ${EMITENTE.razao}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`Email: ${EMITENTE.email}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`Gestão: ${EMITENTE.gestao}    Vendedor: ${EMITENTE.vendedor}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`CNPJ: ${EMITENTE.cnpj}    Loja: ${EMITENTE.loja}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`Endereço: ${EMITENTE.endereco}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`${EMITENTE.cidadeUf}    IE: ${EMITENTE.ie}`, ex, ey, { width: half - 20 }); ey = doc.y + 2;
      doc.text(`Telefone: ${EMITENTE.telefone}    Frete: ${EMITENTE.frete}`, ex, ey, { width: half - 20 });

      // Destinatário
      const nome = pedido.entidade_nome || pedido.partner_name || 'Não informado';
      const docRaw = pedido.entidade_document || pedido.partner_document || '';
      const tipoEnt = pedido.entidade_tipo || '-';
      box(left + half + 12, y, half, 120, 'Destinatário');
      const startX = left + half + 22;
      let dy = y + 24;
      doc.text(`Nome: ${nome}`, startX, dy, { width: half - 30 }); dy = doc.y + 2;
      if (docRaw) { doc.text(`Documento: ${docRaw}`, startX, dy, { width: half - 30 }); dy = doc.y + 2; }
      doc.text(`Tipo: ${tipoEnt}`, startX, dy, { width: half - 30 });

      doc.moveDown(2);
      doc.y = y + 130;
    };

    const drawItemsHeader = () => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const y = doc.y + 6;
      const w = right - left;

      // Título
      doc.fontSize(11).fillColor('#111827').text('Itens', left, y);
      const headerY = doc.y + 4;

      // Colunas
      const fixed = 70 + 60 + 70 + 60 + 80; // cod + qtd + preço + desc + total
      const flex = w - fixed;
      const cols = [
        { key: 'codigo', label: 'Cód.', x: left, w: 70, align: 'left' },
        { key: 'produto', label: 'Produto', x: left + 70, w: flex, align: 'left' },
        { key: 'qtd', label: 'Qtd', x: left + 70 + flex, w: 60, align: 'right' },
        { key: 'preco', label: 'Preço', x: left + 70 + flex + 60, w: 70, align: 'right' },
        { key: 'desc', label: 'Desc.', x: left + 70 + flex + 60 + 70, w: 60, align: 'right' },
        { key: 'total', label: 'Total', x: left + 70 + flex + 60 + 70 + 60, w: 80, align: 'right' },
      ];

      // Barra do cabeçalho
      doc.save();
      doc.rect(left, headerY, w, 20).fill('#F3F4F6');
      doc.restore();
      doc.strokeColor('#E5E7EB').lineWidth(1).rect(left, headerY, w, 20).stroke();
      doc.fillColor('#374151').fontSize(9);
      cols.forEach((c) => {
        doc.text(c.label, c.x + 6, headerY + 5, { width: c.w - 12, align: c.align });
      });

      return { cols, yStart: headerY + 20, tableWidth: w };
    };

    const drawItemsRows = (cols, yStart) => {
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 120; // espaço para totais
      let y = yStart;
      let totalGeral = 0;
      itensQ.rows.forEach((row, idx) => {
        const qtd = Number(row.quantidade);
        const preco = Number(row.preco_unitario);
        const desc = Number(row.desconto_unitario || 0);
        const total = Number(row.total_item || (qtd * (preco - desc)));
        totalGeral += total;

        // Quebra de página
        const rowHeight = 20; // altura fixa simples
        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          drawHeader();
          const meta = drawItemsHeader();
          cols = meta.cols; // reatribui referências
          y = meta.yStart;
        }

        // Zebra
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(cols[0].x, y, cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w + cols[5].w, rowHeight).fill('#FAFAFA');
          doc.restore();
        }

        // Borda inferior da linha
        doc.strokeColor('#F3F4F6').lineWidth(1).moveTo(cols[0].x, y + rowHeight).lineTo(cols[5].x + cols[5].w, y + rowHeight).stroke();

        // Células
        doc.fillColor('#111827').fontSize(9);
        doc.text(String(row.produto_id), cols[0].x + 6, y + 5, { width: cols[0].w - 12, align: 'left' });
        doc.text(String(row.produto_nome || row.produto_id), cols[1].x + 6, y + 5, { width: cols[1].w - 12, align: 'left' });
        doc.text(qtd.toFixed(3), cols[2].x + 6, y + 5, { width: cols[2].w - 12, align: 'right' });
        doc.text(BRL(preco), cols[3].x + 6, y + 5, { width: cols[3].w - 12, align: 'right' });
        doc.text(BRL(desc), cols[4].x + 6, y + 5, { width: cols[4].w - 12, align: 'right' });
        doc.text(BRL(total), cols[5].x + 6, y + 5, { width: cols[5].w - 12, align: 'right' });

        y += rowHeight;
      });

      return { y, totalGeral };
    };

    const drawTotals = (yStart, totalGeral) => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const boxWidth = 260;
      const x = right - boxWidth;
      const y = Math.max(yStart + 12, doc.page.height - doc.page.margins.bottom - 90);

      // Caixa de totais
      doc.save();
      doc.roundedRect(x, y, boxWidth, 70, 6).strokeColor('#D1D5DB').lineWidth(1).stroke();
      doc.restore();
      doc.fontSize(10).fillColor('#111827');
      const linhas = [
        ['Total Bruto', BRL(pedido.total_bruto != null ? pedido.total_bruto : totalGeral)],
        ['Descontos', BRL(pedido.desconto_total || 0)],
        ['Total Líquido', BRL(pedido.total_liquido != null ? pedido.total_liquido : totalGeral)],
      ];
      let yy = y + 8;
      linhas.forEach(([k, v], i) => {
        doc.text(k, x + 10, yy);
        doc.text(v, x + boxWidth - 10 - 120, yy, { width: 120, align: 'right' });
        if (i < linhas.length - 1) {
          doc.strokeColor('#F3F4F6').moveTo(x + 10, yy + 16).lineTo(x + boxWidth - 10, yy + 16).stroke();
        }
        yy += 22;
      });

      // Observações
      if (pedido.observacao) {
        const obsY = y;
        const obsX = left;
        const obsW = x - obsX - 12;
        doc.fontSize(10).fillColor('#111827').text('Observações', obsX, obsY);
        doc.fontSize(9).fillColor('#374151').text(String(pedido.observacao), obsX, obsY + 14, { width: obsW });
      }
    };

    const drawFooter = () => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const bottom = doc.page.height - doc.page.margins.bottom;
      doc.strokeColor('#E5E7EB').moveTo(left, bottom - 20).lineTo(right, bottom - 20).stroke();
      doc.fontSize(8).fillColor('#6B7280').text('Emitido por Hero-Pet • Dados do emitente serão configurados posteriormente.', left, bottom - 16, { width: right - left, align: 'center' });
    };

    // Desenho
    drawHeader();
    drawParties();
    const meta = drawItemsHeader();
    const { y: yAfterRows, totalGeral } = drawItemsRows(meta.cols, meta.yStart);
    drawTotals(yAfterRows, totalGeral);
    drawFooter();

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/nf error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos|pedido_itens|produtos missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
// Não há POST: NF não é persistida. O PDF é gerado on-the-fly via GET acima.