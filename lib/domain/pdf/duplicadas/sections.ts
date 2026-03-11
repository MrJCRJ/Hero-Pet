// lib/pdf/duplicadas/sections.ts
// (Renomeado de promissoria/sections.js para consolidar terminologia DUPLICADAS)
import EMITENTE from "lib/constants/company";
import {
  STR,
  BRL,
  DATE,
  formatCpfCnpj,
  formatTelefone,
  tryLoadPixQrPng,
} from "../nf/helpers";

type PDFDoc = import("pdfkit").PDFKit.PDFDocument;
type PedidoLike = Record<string, unknown>;

interface PromissoriaCardOpts {
  seq: number;
  totalSeq: number;
  amount: number;
  dueDate: string;
}

export const PROMISSORIA_CARD_HEIGHT = 240;

export const drawPromissoriaCard = (
  doc: PDFDoc,
  { seq, totalSeq, amount, dueDate }: PromissoriaCardOpts,
  pedido: PedidoLike,
  DEST_ENDERECO: string,
  LOGO_PNG: string | null,
): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  let y = doc.y + 8;
  const w = right - left;
  const h = PROMISSORIA_CARD_HEIGHT;
  const SUBBLOCK_GAP = 12;

  doc.save();
  doc
    .roundedRect(left, y, w, h, 6)
    .strokeColor("#D1D5DB")
    .lineWidth(1)
    .stroke();
  doc.restore();

  let titleX = left + 12;
  const titleY = y + 10;
  if (LOGO_PNG) {
    try {
      const LOGO_W = 42;
      const LOGO_H = 42;
      doc.image(LOGO_PNG, left + 12, y + 6, {
        width: LOGO_W,
        height: LOGO_H,
        fit: [LOGO_W, LOGO_H],
      });
      titleX += LOGO_W + 12;
    } catch (_) {
      /* noop */
    }
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111827")
    .text(`DUPLICADA Nº ${seq}/${totalSeq}`, titleX, titleY);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text(`Referente ao Pedido #${pedido.id}`, left + 52, y + 28);

  const boxW = 220;
  const xBox = right - boxW;
  doc.save();
  doc.roundedRect(xBox - 10, y + 10, boxW, 46, 6).fill("#F9FAFB");
  doc.restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Valor", xBox, y + 16, { width: boxW - 16, align: "right" });
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#111827")
    .text(BRL(amount), xBox, y + 30, { width: boxW - 16, align: "right" });

  const drawKV = (
    x: number,
    yL: number,
    label: string,
    value: string,
    width: number,
  ) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    const labelW = doc.widthOfString(label);
    doc.text(label, x, yL, {
      width: Math.min(labelW, width),
      align: "left",
    });
    const maxValW = Math.max(0, width - labelW);
    doc.font("Helvetica").fontSize(10).fillColor("#374151");
    const fitVal = (text: string, maxW: number) => {
      let s = String(text || "");
      while (doc.widthOfString(s) > maxW && s.length > 1) s = s.slice(0, -1);
      return s;
    };
    const v = fitVal(value, maxValW);
    doc.text(v, x + labelW, yL, { width: maxValW, align: "left" });
  };
  drawKV(xBox - 90, y + 30, "Vencimento: ", DATE(dueDate), 180);

  const nome =
    (pedido.entidade_nome as string) ||
    (pedido.partner_name as string) ||
    "Não informado";
  const docRaw =
    (pedido.entidade_document as string) ||
    (pedido.partner_document as string) ||
    "";
  const telFmt = pedido.entidade_telefone
    ? formatTelefone(pedido.entidade_telefone as string)
    : "-";
  const gutter = 10;
  const contentX = left + 12;
  const contentW = w - 24;
  const col1 = Math.floor((contentW - gutter * 2) * 0.5);
  const col2 = Math.floor((contentW - gutter * 2) * 0.25);
  const col3 = contentW - col1 - col2 - gutter * 2;
  doc.font("Helvetica").fontSize(10).fillColor("#374151");
  const rowY1 = y + 64;
  drawKV(contentX, rowY1, "Nome: ", STR(nome), col1);
  drawKV(contentX + col1 + gutter, rowY1, "Doc: ", formatCpfCnpj(docRaw), col2);
  drawKV(
    contentX + col1 + gutter + col2 + gutter,
    rowY1,
    "Tel: ",
    telFmt,
    col3,
  );
  drawKV(contentX, rowY1 + 18, "Endereço: ", STR(DEST_ENDERECO), contentW);

  const emBaseY = rowY1 + 18 + SUBBLOCK_GAP;
  doc.save();
  doc.rect(left + 12, emBaseY, w - 24, 18).fill("#F9FAFB");
  doc.restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Emissor", left + 18, emBaseY + 2);
  doc.font("Helvetica").fontSize(10).fillColor("#374151");
  const rowY2 = emBaseY + 22;
  drawKV(contentX, rowY2, "Razão: ", EMITENTE.razao, col1);
  drawKV(contentX + col1 + gutter, rowY2, "Doc: ", EMITENTE.cnpj, col2);
  drawKV(
    contentX + col1 + gutter + col2 + gutter,
    rowY2,
    "Telefone: ",
    EMITENTE.telefone,
    col3,
  );
  drawKV(contentX, rowY2 + 18, "Endereço: ", EMITENTE.endereco, contentW);

  const payY = rowY2 + 40;
  doc.save();
  doc.rect(left + 12, payY, w - 24, 18).fill("#F9FAFB");
  doc.restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Forma de pagamento", left + 18, payY + 2);
  doc.font("Helvetica").fontSize(10).fillColor("#374151");
  const payLineY = payY + 22;
  const qrPath = tryLoadPixQrPng();
  const qrW = 88;
  const qrH = 88;
  const textBlockHeight = 32;
  const textW = qrPath ? contentW - qrW - 12 : contentW;
  const textX = contentX;
  const qrX = contentX + textW + 12;
  const qrY = payY + 2;
  const textY = qrPath
    ? payLineY + Math.max(0, Math.floor((qrH - textBlockHeight) / 2))
    : payLineY;
  drawKV(
    textX,
    textY,
    "Nome: ",
    "Icaro Jhonatan de Jesus Oliveira, Nubank.",
    textW,
  );
  const pixLabel = "Chave Pix: ";
  const pixValue = "078.869.085.03";
  doc.font("Helvetica-Bold").fontSize(10);
  const labelW = doc.widthOfString(pixLabel);
  doc.font("Helvetica").fontSize(10);
  const valueW = doc.widthOfString(pixValue);
  const pixY = textY + 16;
  const padX = 4;
  const padY = 2;
  const bgW = Math.min(textW, labelW + valueW + padX * 2);
  const bgH = 14;
  doc.save();
  doc.roundedRect(textX - 2, pixY - padY, bgW + 4, bgH, 4).fill("#FEF3C7");
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#92400E");
  doc.text(pixLabel, textX, pixY);
  doc.font("Helvetica").fontSize(10).fillColor("#92400E");
  doc.text(pixValue, textX + labelW, pixY);
  if (qrPath) {
    try {
      doc.image(qrPath, qrX, qrY, { width: qrW, height: qrH, fit: [qrW, qrH] });
    } catch (_) {
      /* noop */
    }
  }

  doc.y = y + h;
};
