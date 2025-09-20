// lib/pdf/nf/sections.js
// Funções de desenho (seções) para o PDF da NF
import {
  STR,
  BRL,
  DATE,
  formatCep,
  formatTelefone,
  formatCpfCnpj,
} from './helpers';
import EMITENTE from 'lib/constants/company';

export const box = (doc, x, y, w, h, title) => {
  doc.save();
  doc.roundedRect(x, y, w, h, 4).strokeColor('#D1D5DB').lineWidth(1).stroke();
  if (title) {
    doc.rect(x + 1, y + 1, w - 2, 18).fill('#F9FAFB');
    doc.fillColor('#111827').fontSize(11).text(title, x + 8, y + 4, { width: w - 16, align: 'center' });
  }
  doc.restore();
};

export const measureKVHeight = (doc, label, value, width, align = 'left') => {
  const text = `${label}: ${STR(value)}`;
  return doc.heightOfString(text, { width, align });
};

export const drawKVInline = (doc, label, value, x, y, width, align = 'left') => {
  if (!label) return; // permite pares vazios à direita
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text(`${label}: `, x, y, { width, align, continued: true });
  doc.font('Helvetica').fillColor('#374151').text(STR(value), { width, align });
};

export const drawInfoBoxTwoCols = (doc, title, rows, x, y, w, h) => {
  box(doc, x, y, w, h, title);
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

    const hLeft = lLabel ? measureKVHeight(doc, lLabel, lValue, colW) : 0;
    const hRight = rLabel ? measureKVHeight(doc, rLabel, rValue, colW) : 0;
    const rowH = Math.max(hLeft, hRight, 12);

    drawKVInline(doc, lLabel, lValue, contentX, yy, colW);
    if (rLabel) drawKVInline(doc, rLabel, rValue, contentX + colW + gutter, yy, colW);

    yy += rowH + 2;
  });
  return y + h;
};

export const drawHeader = (doc, pedido, LOGO_PNG) => {
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
  doc.fontSize(16).fillColor('#111827').text(EMITENTE.razao, titleX, titleY, { continued: false });
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

export const drawParties = (doc, pedido, DEST_ENDERECO) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y + 6;
  const w = right - left;
  const half = Math.floor(w / 2) - 6;

  drawInfoBoxTwoCols(doc, 'Emitente', [
    [['Razão Social', EMITENTE.razao], ['Email', EMITENTE.email]],
    [['Gestão', EMITENTE.gestao], ['Vendedor', EMITENTE.vendedor]],
    [['CNPJ', EMITENTE.cnpj], ['IE', EMITENTE.ie]],
    [['Loja', EMITENTE.loja], ['Telefone', EMITENTE.telefone]],
    [['Endereço', EMITENTE.endereco], ['Frete', EMITENTE.frete]],
  ], left, y, half, 132);

  const nome = pedido.entidade_nome || pedido.partner_name || 'Não informado';
  const docRaw = pedido.entidade_document || pedido.partner_document || '';
  const destX = left + half + 12;

  drawInfoBoxTwoCols(doc, 'Destinatário', [
    [['Nome', nome], ['Documento', formatCpfCnpj(docRaw)]],
    [['Email', STR(pedido.entidade_email)], ['Telefone', formatTelefone(pedido.entidade_telefone)]],
    [['Endereço', DEST_ENDERECO], ['CEP', formatCep(pedido.entidade_cep)]],
  ], destX, y, half, 132);

  doc.moveDown(2);
  doc.y = y + 140;
};

export const computeItemColumns = (doc) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const fixed = 70 + 60 + 70 + 60 + 80;
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

export const drawItemsHeader = (doc, colsMeta) => {
  const y = doc.y + 6;
  const { left, w, cols } = colsMeta;

  // Título "Itens" destacado
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Itens', left, y);
  const headerY = doc.y + 6;

  // Cabeçalho simples (como antes), sem barra sólida
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9);
  cols.forEach((c) => {
    doc.text(c.label, c.x + 6, headerY + 4, { width: c.w - 12, align: c.align });
  });
  // Linha divisória inferior do cabeçalho
  doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(left, headerY + 18).lineTo(left + w, headerY + 18).stroke();
  return headerY + 20;
};

export const drawItemsRows = (doc, colsMeta, itensRows, yStart) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 140;
  let y = yStart;
  let totalGeral = 0;
  let rowsOnPage = 0;
  const { cols, left, w } = colsMeta;
  itensRows.forEach((row, idx) => {
    const qtd = Number(row.quantidade);
    const preco = Number(row.preco_unitario);
    const desc = Number(row.desconto_unitario || 0);
    const total = Number(row.total_item || (qtd * (preco - desc)));
    totalGeral += total;

    const rowHeight = 20;
    // Quebra por limite visual OU por limite de 10 itens por página
    if (rowsOnPage >= 10 || y + rowHeight > bottomLimit) {
      doc.addPage();
      drawHeader(doc, { id: row.pedido_id, tipo: '', data_emissao: new Date() }, null); // re-render header minimal
      y = drawItemsHeader(doc, colsMeta);
      rowsOnPage = 0;
    }

    if (idx % 2 === 1) doc.rect(left, y, w, rowHeight).fill('#FAFAFA').fillColor('#111827');

    doc.strokeColor('#F3F4F6').lineWidth(1).moveTo(cols[0].x, y + rowHeight).lineTo(cols[5].x + cols[5].w, y + rowHeight).stroke();

    doc.fillColor('#111827').fontSize(9);
    doc.text(String(row.produto_id), cols[0].x + 6, y + 5, { width: cols[0].w - 12, align: 'left' });
    doc.text(String(row.produto_nome || row.produto_id), cols[1].x + 6, y + 5, { width: cols[1].w - 12, align: 'left' });
    doc.text(String(Math.trunc(qtd)), cols[2].x + 6, y + 5, { width: cols[2].w - 12, align: 'right' });
    doc.text(BRL(preco), cols[3].x + 6, y + 5, { width: cols[3].w - 12, align: 'right' });
    doc.text(BRL(desc), cols[4].x + 6, y + 5, { width: cols[4].w - 12, align: 'right' });
    doc.text(BRL(total), cols[5].x + 6, y + 5, { width: cols[5].w - 12, align: 'right' });

    y += rowHeight;
    rowsOnPage += 1;
  });

  return { y, totalGeral };
};

export const drawTotals = (doc, pedido, yStart, totalGeral) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const boxWidth = 260;
  const x = right - boxWidth;
  // Posiciona imediatamente abaixo da tabela, com pequeno espaço
  const y = yStart + 8;

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

  if (pedido.observacao) {
    const obsY = y;
    const obsX = left;
    const obsW = x - obsX - 12;
    doc.fontSize(10).fillColor('#111827').text('Observações', obsX, obsY);
    doc.fontSize(9).fillColor('#374151').text(String(pedido.observacao), obsX, obsY + 14, { width: obsW });
  }
  return Math.max(doc.y, y + 70);
};

export const drawSignature = (doc, startY, drawHeaderFn) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const required = 120; // altura estimada do bloco de assinatura
  const bottomY = doc.page.height - doc.page.margins.bottom;
  const topY = doc.page.margins.top;
  const footerTop = bottomY - 20; // linha do footer é desenhada em bottom - 20
  const gap = 8; // pequeno espaçamento entre assinatura e footer

  // Ancorar assinatura ao rodapé: topo do bloco = footerTop - gap - required
  let y = footerTop - gap - required;

  // Se não houver espaço suficiente por conta do conteúdo anterior, quebra página
  if (y < doc.y + 8) {
    doc.addPage();
    drawHeaderFn();
    // recomputa landmarks na nova página
    const newBottomY = doc.page.height - doc.page.margins.bottom;
    const newFooterTop = newBottomY - 20;
    y = Math.max(topY, newFooterTop - gap - required);
  }

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Recebimento', left, y);
  let contentY = doc.y + 8;
  const lineY = contentY + 18;
  const colW = (right - left - 20) / 2;

  doc.strokeColor('#D1D5DB').moveTo(left, lineY).lineTo(left + colW, lineY).stroke();
  doc.strokeColor('#D1D5DB').moveTo(left + colW + 20, lineY).lineTo(right, lineY).stroke();
  doc.font('Helvetica').fontSize(9).fillColor('#374151');
  doc.text('Recebido por (nome legível):', left, contentY);
  doc.text('Assinatura:', left + colW + 20, contentY);

  const y2 = lineY + 24;
  const lineY2 = y2 + 18;
  doc.strokeColor('#D1D5DB').moveTo(left, lineY2).lineTo(left + colW, lineY2).stroke();
  doc.strokeColor('#D1D5DB').moveTo(left + colW + 20, lineY2).lineTo(right, lineY2).stroke();
  doc.text('CPF:', left, y2);
  doc.text('Data:', left + colW + 20, y2);
  doc.moveDown(2);
};

export const drawFooter = (doc) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  doc.strokeColor('#E5E7EB').moveTo(left, bottom - 20).lineTo(right, bottom - 20).stroke();
  doc.fontSize(8).fillColor('#6B7280').text(`Emitido por ${EMITENTE.razao} • CNPJ ${EMITENTE.cnpj}`,
    left, bottom - 16, { width: right - left, align: 'center' });
};
