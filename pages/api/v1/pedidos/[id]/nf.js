// pages/api/v1/pedidos/[id]/nf.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import EMITENTE from "lib/constants/company";

// Helpers globais de formatação (compartilhados)
const BRL = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');
const STR = (v, fb = '—') => (v == null || v === '' ? fb : String(v));
const stripDigits = (value = '') => String(value || '').replace(/\D+/g, '');
const formatCpfCnpj = (raw = '') => {
  const d = stripDigits(raw).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
const formatTelefone = (raw = '') => {
  const d = stripDigits(raw).slice(0, 11);
  if (!d) return '—';
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
const formatCep = (raw = '') => {
  const d = stripDigits(raw).slice(0, 8);
  return d ? d.replace(/(\d{5})(\d)/, '$1-$2') : '—';
};

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
                    e.cep AS entidade_cep
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

    // Carregar logo (PNG preferencial). Se não existir, ignora.
    const tryLoadLogoPng = () => {
      try {
        const pngPath = path.join(process.cwd(), 'Logo.png');
        return fs.existsSync(pngPath) ? pngPath : null;
      } catch (_) {
        return null;
      }
    };
    const LOGO_PNG = tryLoadLogoPng();
    // Constantes de layout
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
      if (LOGO_PNG) {
        try {
          doc.image(LOGO_PNG, left + 8, top - 6, { width: 36, height: 36, fit: [36, 36] });
          titleX += 44;
        } catch (_) {
          // ignora erro de imagem
        }
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
        doc.fillColor('#111827').fontSize(11).text(title, x + 8, y + 4, { width: w - 16, align: 'center' });
      }
      doc.restore();
    };

    // drawKV (uma coluna) não é mais usado; usamos drawKVInline em duas colunas

    const measureKVHeight = (label, value, width, align = 'left') => {
      const text = `${label}: ${STR(value)}`;
      return doc.heightOfString(text, { width, align });
    };

    const drawKVInline = (label, value, x, y, width, align = 'left') => {
      if (!label) return; // permite pares vazios à direita
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text(`${label}: `, x, y, { width, align, continued: true });
      doc.font('Helvetica').fillColor('#374151').text(STR(value), { width, align });
    };

    const drawInfoBoxTwoCols = (title, rows, x, y, w, h) => {
      box(x, y, w, h, title);
      const pad = 10;
      const gutter = 16;
      const contentX = x + pad;
      const contentW = w - pad * 2;
      const colW = Math.floor((contentW - gutter) / 2);
      let yy = y + 24;
      rows.forEach((pair) => {
        const [leftPair, rightPair] = pair;
        const [lLabel, lValue] = leftPair || [];
        const [rLabel, rValue] = rightPair || [];

        const hLeft = lLabel ? measureKVHeight(lLabel, lValue, colW) : 0;
        const hRight = rLabel ? measureKVHeight(rLabel, rValue, colW) : 0;
        const rowH = Math.max(hLeft, hRight, 12);

        drawKVInline(lLabel, lValue, contentX, yy, colW);
        if (rLabel) drawKVInline(rLabel, rValue, contentX + colW + gutter, yy, colW);

        yy += rowH + 2;
      });
      return y + h;
    };

    // drawInfoBox (versão uma coluna) foi substituído por drawInfoBoxTwoCols

    const drawParties = () => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const y = doc.y + 6;
      const w = right - left;
      const half = Math.floor(w / 2) - 6;

      // Emitente (duas colunas)
      drawInfoBoxTwoCols('Emitente', [
        [['Razão Social', EMITENTE.razao], ['Email', EMITENTE.email]],
        [['Gestão', EMITENTE.gestao], ['Vendedor', EMITENTE.vendedor]],
        [['CNPJ', EMITENTE.cnpj], ['IE', EMITENTE.ie]],
        [['Loja', EMITENTE.loja], ['Telefone', EMITENTE.telefone]],
        [['Endereço', EMITENTE.endereco], ['Cidade/UF', EMITENTE.cidadeUf]],
        [['Frete', EMITENTE.frete], null],
      ], left, y, half, 132);

      // Destinatário
      const nome = pedido.entidade_nome || pedido.partner_name || 'Não informado';
      const docRaw = pedido.entidade_document || pedido.partner_document || '';
      const tipoEnt = pedido.entidade_tipo || '-';
      const destX = left + half + 12;
      // Destinatário (duas colunas)
      drawInfoBoxTwoCols('Destinatário', [
        [['Nome', nome], ['Documento', formatCpfCnpj(docRaw)]],
        [['Tipo', tipoEnt], ['Telefone', formatTelefone(pedido.entidade_telefone)]],
        [['Email', STR(pedido.entidade_email)], ['CEP', formatCep(pedido.entidade_cep)]],
      ], destX, y, half, 132);

      doc.moveDown(2);
      doc.y = y + 140;
    };

    const computeItemColumns = () => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const w = right - left;
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
      return { left, w, cols };
    };

    const drawItemsHeader = (colsMeta) => {
      const y = doc.y + 6;
      const { left, w, cols } = colsMeta;

      // Título
      doc.fontSize(11).fillColor('#111827').text('Itens', left, y);
      const headerY = doc.y + 4;

      // Barra do cabeçalho
      doc.save();
      doc.rect(left, headerY, w, 20).fill('#F3F4F6');
      doc.restore();
      doc.strokeColor('#E5E7EB').lineWidth(1).rect(left, headerY, w, 20).stroke();
      doc.fillColor('#374151').fontSize(9);
      cols.forEach((c) => {
        doc.text(c.label, c.x + 6, headerY + 5, { width: c.w - 12, align: c.align });
      });
      return headerY + 20;
    };

    const drawItemsRows = (colsMeta, yStart) => {
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 120; // espaço para totais
      let y = yStart;
      let totalGeral = 0;
      const { cols, left, w } = colsMeta;
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
          y = drawItemsHeader(colsMeta);
        }

        // Zebra
        if (idx % 2 === 1) doc.rect(left, y, w, rowHeight).fill('#FAFAFA').fillColor('#111827');

        // Borda inferior da linha
        doc.strokeColor('#F3F4F6').lineWidth(1).moveTo(cols[0].x, y + rowHeight).lineTo(cols[5].x + cols[5].w, y + rowHeight).stroke();

        // Células
        doc.fillColor('#111827').fontSize(9);
        doc.text(String(row.produto_id), cols[0].x + 6, y + 5, { width: cols[0].w - 12, align: 'left' });
        doc.text(String(row.produto_nome || row.produto_id), cols[1].x + 6, y + 5, { width: cols[1].w - 12, align: 'left' });
        doc.text(String(Math.trunc(qtd)), cols[2].x + 6, y + 5, { width: cols[2].w - 12, align: 'right' });
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
      // Retorna a base ocupada, considerando que doc.y pode ter sido avançado pelas observações
      return Math.max(doc.y, y + 70);
    };

    const drawSignature = (startY) => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      let y = (typeof startY === 'number' ? startY : doc.y + 16);
      const required = 120; // altura reservada para o bloco de assinatura
      const bottomY = doc.page.height - doc.page.margins.bottom;
      const topY = doc.page.margins.top;
      // Se não houver espaço suficiente na página atual, cria nova página
      if (y + required > bottomY) {
        doc.addPage();
        drawHeader();
        y = topY;
      }

      // Título
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Recebimento', left, y);
      y = doc.y + 8;
      const lineY = y + 18;
      const colW = (right - left - 20) / 2;

      // Linhas
      doc.strokeColor('#D1D5DB').moveTo(left, lineY).lineTo(left + colW, lineY).stroke();
      doc.strokeColor('#D1D5DB').moveTo(left + colW + 20, lineY).lineTo(right, lineY).stroke();
      doc.font('Helvetica').fontSize(9).fillColor('#374151');
      doc.text('Recebido por (nome legível):', left, y);
      doc.text('Assinatura:', left + colW + 20, y);

      // Segunda linha
      const y2 = lineY + 24;
      const lineY2 = y2 + 18;
      doc.strokeColor('#D1D5DB').moveTo(left, lineY2).lineTo(left + colW, lineY2).stroke();
      doc.strokeColor('#D1D5DB').moveTo(left + colW + 20, lineY2).lineTo(right, lineY2).stroke();
      doc.text('CPF:', left, y2);
      doc.text('Data:', left + colW + 20, y2);
      doc.moveDown(2);
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
    const colsMeta = computeItemColumns();
    const yStart = drawItemsHeader(colsMeta);
    const { y: yAfterRows, totalGeral } = drawItemsRows(colsMeta, yStart);
    const bottomAfterTotals = drawTotals(yAfterRows, totalGeral);
    drawSignature(bottomAfterTotals + 16);
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