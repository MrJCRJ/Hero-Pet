// Footer section for NF PDF
import { BRL } from "./helpers";
import EMITENTE from "lib/constants/company";
import type { PDFDoc, PedidoLike } from "./types";

export const drawTotals = (
  doc: PDFDoc,
  pedido: PedidoLike,
  yStart: number,
  totalGeral: number,
): number => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const boxWidth = 260;
  const x = right - boxWidth;
  const y = yStart + 8;

  doc.save();
  doc
    .roundedRect(x, y, boxWidth, 70, 6)
    .strokeColor("#D1D5DB")
    .lineWidth(1)
    .stroke();
  doc.restore();
  doc.fontSize(10).fillColor("#111827");
  const linhas: [string, string][] = [
    [
      "Total Bruto",
      BRL(
        pedido.total_bruto != null ? Number(pedido.total_bruto) : totalGeral,
      ),
    ],
    [
      "Descontos",
      BRL(
        pedido.desconto_total != null ? Number(pedido.desconto_total) : 0,
      ),
    ],
    [
      "Total Líquido",
      BRL(
        pedido.total_liquido != null ? Number(pedido.total_liquido) : totalGeral,
      ),
    ],
  ];
  let yy = y + 8;
  linhas.forEach(([k, v], i) => {
    doc.text(k, x + 10, yy);
    doc.text(v, x + boxWidth - 10 - 120, yy, { width: 120, align: "right" });
    if (i < linhas.length - 1) {
      doc
        .strokeColor("#F3F4F6")
        .moveTo(x + 10, yy + 16)
        .lineTo(x + boxWidth - 10, yy + 16)
        .stroke();
    }
    yy += 22;
  });

  if (pedido.observacao) {
    const obsY = y;
    const obsX = left;
    const obsW = x - obsX - 12;
    doc.fontSize(10).fillColor("#111827").text("Observações", obsX, obsY);
    doc
      .fontSize(9)
      .fillColor("#374151")
      .text(String(pedido.observacao), obsX, obsY + 14, { width: obsW });
  }
  return Math.max(doc.y, y + 70);
};

export const drawSignature = (
  doc: PDFDoc,
  _startY: number,
  drawHeaderFn: () => void,
): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const required = 80;
  const bottomY = doc.page.height - doc.page.margins.bottom;
  const topY = doc.page.margins.top;
  const footerTop = bottomY - 20;
  const gap = 8;

  let y = footerTop - gap - required;

  if (y < doc.y + 8) {
    doc.addPage();
    drawHeaderFn();
    const newBottomY = doc.page.height - doc.page.margins.bottom;
    const newFooterTop = newBottomY - 20;
    y = Math.max(topY, newFooterTop - gap - required);
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text("Recebimento", left, y);
  const contentY = doc.y + 10;
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  const sigLabel = "Assinatura:";
  const sigLabelW = doc.widthOfString(sigLabel);
  const dateRegionW = 160;
  const dateX = right - dateRegionW;

  doc.text(sigLabel, left, contentY);
  const sigLineStart = left + sigLabelW + 6;
  const sigLineEnd = dateX - 16;
  const lineY = contentY + 14;
  doc
    .strokeColor("#D1D5DB")
    .moveTo(sigLineStart, lineY)
    .lineTo(Math.max(sigLineStart + 60, sigLineEnd), lineY)
    .stroke();

  const dateLabel = "Data:";
  doc.text(dateLabel, dateX, contentY);
  const dateLabelW = doc.widthOfString(dateLabel);
  const dateLineStart = dateX + dateLabelW + 6;
  const dateLineEnd = right - 8;
  doc
    .strokeColor("#D1D5DB")
    .moveTo(dateLineStart, lineY)
    .lineTo(Math.max(dateLineStart + 60, dateLineEnd), lineY)
    .stroke();
  doc.moveDown(2);
};

export const drawFooter = (doc: PDFDoc): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  doc
    .strokeColor("#E5E7EB")
    .moveTo(left, bottom - 20)
    .lineTo(right, bottom - 20)
    .stroke();
  doc
    .fontSize(8)
    .fillColor("#6B7280")
    .text(
      `Nota feita a punho por ${EMITENTE.razao} • CNPJ ${EMITENTE.cnpj} sem nenhum valor fiscal`,
      left,
      bottom - 16,
      { width: right - left, align: "center" },
    );
};
