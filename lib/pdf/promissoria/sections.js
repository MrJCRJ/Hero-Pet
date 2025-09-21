// lib/pdf/promissoria/sections.js
import EMITENTE from 'lib/constants/company';
import { STR, BRL, DATE, formatCpfCnpj, formatTelefone, tryLoadPixQrPng } from 'lib/pdf/nf/helpers';

// Altura padrão de um cartão de promissória (sem assinaturas)
export const PROMISSORIA_CARD_HEIGHT = 240;


export const drawPromissoriaCard = (doc, { seq, totalSeq, amount, dueDate }, pedido, DEST_ENDERECO, LOGO_PNG) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  let y = doc.y + 8;
  const w = right - left;
  const h = PROMISSORIA_CARD_HEIGHT; // altura do cartão (sem área de assinaturas)
  const SUBBLOCK_GAP = 12; // gap entre blocos (Cliente -> Emissor)

  // Moldura
  doc.save();
  doc.roundedRect(left, y, w, h, 6).strokeColor('#D1D5DB').lineWidth(1).stroke();
  doc.restore();

  // Título e numeração
  let titleX = left + 12;
  const titleY = y + 10;
  if (LOGO_PNG) {
    try {
      doc.image(LOGO_PNG, left + 12, y + 8, { width: 28, height: 28, fit: [28, 28] });
      titleX += 34;
    } catch (_) { /* noop */ }
  }
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(`PROMISSÓRIA Nº ${seq}/${totalSeq}`, titleX, titleY);
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`Referente ao Pedido #${pedido.id}`, left + 52, y + 28);

  // Valor e vencimento
  const boxW = 220;
  const xBox = right - boxW;
  doc.save();
  doc.roundedRect(xBox - 10, y + 10, boxW, 46, 6).fill('#F9FAFB');
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Valor', xBox, y + 16, { width: boxW - 16, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(BRL(amount), xBox, y + 30, { width: boxW - 16, align: 'right' });
  // Helper: desenhar chave:valor numa mesma linha com chave destacada
  const drawKV = (x, yL, label, value, width) => {
    // largura da label em bold 10
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
    const labelW = doc.widthOfString(label);
    doc.text(label, x, yL, { width: Math.min(labelW, width), align: 'left' });
    const maxValW = Math.max(0, width - labelW);
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    // truncar valor se necessário considerando a fonte regular
    const fitVal = (text, maxW) => {
      let s = String(text || '');
      while (doc.widthOfString(s) > maxW && s.length > 1) s = s.slice(0, -1);
      return s;
    };
    const v = fitVal(value, maxValW);
    doc.text(v, x + labelW, yL, { width: maxValW, align: 'left' });
  };
  drawKV(xBox - 190, y + 30, 'Vencimento: ', DATE(dueDate), 180);

  // Cliente (antes: Sacado) — título invisível (sem barra)
  const nome = pedido.entidade_nome || pedido.partner_name || 'Não informado';
  const docRaw = pedido.entidade_document || pedido.partner_document || '';
  const telFmt = pedido.entidade_telefone ? formatTelefone(pedido.entidade_telefone) : '-';
  // linha única: Nome | Documento | Telefone
  const gutter = 10;
  const contentX = left + 12;
  const contentW = w - 24;
  const col1 = Math.floor((contentW - gutter * 2) * 0.5); // Nome
  const col2 = Math.floor((contentW - gutter * 2) * 0.25); // Documento
  const col3 = contentW - col1 - col2 - gutter * 2; // Telefone
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  const rowY1 = y + 64; // sobe bloco do cliente
  // Nome
  drawKV(contentX, rowY1, 'Nome: ', STR(nome), col1);
  // Documento
  drawKV(contentX + col1 + gutter, rowY1, 'Doc: ', formatCpfCnpj(docRaw), col2);
  // Telefone
  drawKV(contentX + col1 + gutter + col2 + gutter, rowY1, 'Tel: ', telFmt, col3);
  // endereço abaixo
  drawKV(contentX, rowY1 + 18, 'Endereço: ', STR(DEST_ENDERECO), contentW);

  // Emissor (Emitente) — subtítulo destacado, colado ao Cliente com pequeno espaçamento (SUBBLOCK_GAP)
  const emBaseY = rowY1 + 18 + SUBBLOCK_GAP;
  doc.save();
  doc.rect(left + 12, emBaseY, w - 24, 18).fill('#F9FAFB');
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Emissor', left + 18, emBaseY + 2);
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  const rowY2 = emBaseY + 22;
  // linha única: Razão | CNPJ | Telefone
  drawKV(contentX, rowY2, 'Razão: ', EMITENTE.razao, col1);
  drawKV(contentX + col1 + gutter, rowY2, 'Doc: ', EMITENTE.cnpj, col2);
  drawKV(contentX + col1 + gutter + col2 + gutter, rowY2, 'Telefone: ', EMITENTE.telefone, col3);
  // endereço abaixo (usar string completa configurada)
  drawKV(contentX, rowY2 + 18, 'Endereço: ', EMITENTE.endereco, contentW);

  // Forma de pagamento — subtítulo destacado
  const payY = rowY2 + 40;
  doc.save();
  doc.rect(left + 12, payY, w - 24, 18).fill('#F9FAFB');
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Forma de pagamento', left + 18, payY + 2);
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  const payLineY = payY + 22;
  // Nome do titular e Banco + Chave Pix alinhados ao QR
  const qrPath = tryLoadPixQrPng();
  const qrW = 88; // QR maior
  const qrH = 88;
  const textBlockHeight = 32; // duas linhas de ~16px
  const textW = qrPath ? (contentW - qrW - 12) : contentW;
  const textX = contentX;
  const qrX = contentX + textW + 12;
  // subir o QR para alinhar com o título "Forma de pagamento"
  const qrY = payY + 2;
  // centralizar verticalmente as duas linhas dentro do bloco do QR
  const textY = qrPath ? (payLineY + Math.max(0, Math.floor((qrH - textBlockHeight) / 2))) : payLineY;
  drawKV(textX, textY, 'Nome: ', 'Icaro Jhonatan de Jesus Oliveira, Nubank.', textW);
  drawKV(textX, textY + 16, 'Chave Pix: ', '078.869.085.03', textW);
  // QR Code (opcional), render à direita
  if (qrPath) {
    try {
      doc.image(qrPath, qrX, qrY, { width: qrW, height: qrH, fit: [qrW, qrH] });
    } catch (_) { /* noop */ }
  }

  doc.y = y + h;
};

// Footer removido conforme solicitação; manter função ausente e não chamada no endpoint.
