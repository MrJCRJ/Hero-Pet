// Header/parties section for NF PDF
import {
  STR,
  DATE,
  formatCep,
  formatTelefone,
  formatCpfCnpj,
} from "./helpers";
import EMITENTE from "lib/constants/company";
import type { PDFDoc, PedidoLike, TwoColRow, TransportadoraInfo } from "./types";

export const box = (
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  title?: string,
): void => {
  doc.save();
  doc.roundedRect(x, y, w, h, 4).strokeColor("#D1D5DB").lineWidth(1).stroke();
  if (title) {
    doc.rect(x + 1, y + 1, w - 2, 18).fill("#F9FAFB");
    doc
      .fillColor("#111827")
      .fontSize(11)
      .text(title, x + 8, y + 4, { width: w - 16, align: "center" });
  }
  doc.restore();
};

export const measureKVHeight = (
  doc: PDFDoc,
  label: string,
  value: unknown,
  width: number,
  align = "left",
): number => {
  const text = `${label}: ${STR(value)}`;
  return doc.heightOfString(text, { width, align });
};

export const drawKVInline = (
  doc: PDFDoc,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number,
  align = "left",
): void => {
  if (!label) return;
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`${label}: `, x, y, { width, align, continued: true });
  doc.font("Helvetica").fillColor("#374151").text(STR(value), { width, align });
};

export const drawInfoBoxTwoCols = (
  doc: PDFDoc,
  title: string,
  rows: TwoColRow[],
  x: number,
  y: number,
  w: number,
  h: number,
): number => {
  box(doc, x, y, w, h, title);
  const pad = 10;
  const gutter = 16;
  const contentX = x + pad;
  const contentW = w - pad * 2;
  const colW = Math.floor((contentW - gutter) / 2);
  let yy = y + 24;
  rows.forEach((pair) => {
    const [leftPair, rightPair] = pair;
    const lLabel = (leftPair || [])[0] as string | undefined;
    const lValue = (leftPair || [])[1];
    const rLabel = (rightPair || [])[0] as string | undefined;
    const rValue = (rightPair || [])[1];

    const hLeft = lLabel ? measureKVHeight(doc, lLabel, lValue, colW) : 0;
    const hRight = rLabel ? measureKVHeight(doc, rLabel, rValue, colW) : 0;
    const rowH = Math.max(hLeft, hRight, 12);

    if (lLabel) drawKVInline(doc, lLabel, lValue, contentX, yy, colW);
    if (rLabel)
      drawKVInline(doc, rLabel, rValue, contentX + colW + gutter, yy, colW);

    yy += rowH + 2;
  });
  return y + h;
};

export const drawHeader = (
  doc: PDFDoc,
  pedido: PedidoLike,
  LOGO_PNG: string | null,
): void => {
  const { width } = doc.page;
  const left = doc.page.margins.left;
  const right = width - doc.page.margins.right;
  const top = doc.page.margins.top;
  const headerInfoWidth = 180;

  if (LOGO_PNG) {
    try {
      doc.save();
      doc.opacity(0.12);
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const maxW = pageW * 0.65;
      const maxH = pageH * 0.65;
      const x = (pageW - maxW) / 2;
      const y = (pageH - maxH) / 2;
      doc.image(LOGO_PNG, x, y, { fit: [maxW, maxH] });
      doc.opacity(1);
      doc.restore();
    } catch (_) {
      /* ignore */
    }
  }

  doc.save();
  doc.rect(left, top - 10, right - left, 32).fill("#F3F4F6");
  doc.restore();

  const titleX = left + 8;
  const titleY = top - 6;
  doc
    .fontSize(16)
    .fillColor("#111827")
    .text(EMITENTE.razao, titleX, titleY, { continued: false });
  doc
    .fontSize(10)
    .fillColor("#374151")
    .text("Documento Auxiliar de Nota Fiscal (MVP)", titleX, top + 12);

  const info: string[] = [
    `Pedido: #${pedido.id}`,
    `Tipo: ${pedido.tipo}`,
    `Emissão: ${DATE(pedido.data_emissao as string | Date)}`,
  ];
  if (pedido.data_entrega)
    info.push(`Entrega: ${DATE(pedido.data_entrega as string | Date)}`);
  doc.fontSize(9).fillColor("#111827");
  doc.text(info.join("  •  "), right - headerInfoWidth, top, {
    width: headerInfoWidth,
    align: "right",
  });

  doc
    .moveTo(left, top + 28)
    .lineTo(right, top + 28)
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .stroke();
  doc.moveDown(1);
};

export const drawParties = (
  doc: PDFDoc,
  pedido: PedidoLike,
  DEST_ENDERECO: string,
): void => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y + 6;
  const w = right - left;
  const half = Math.floor(w / 2) - 6;

  drawInfoBoxTwoCols(
    doc,
    "Emitente",
    [
      [
        ["Razão Social", EMITENTE.razao],
        ["Email", EMITENTE.email],
      ],
      [
        ["Gestão", EMITENTE.gestao],
        ["Vendedor", EMITENTE.vendedor],
      ],
      [
        ["CNPJ", EMITENTE.cnpj],
        ["IE", EMITENTE.ie],
      ],
      [
        ["Loja", EMITENTE.loja],
        ["Telefone", EMITENTE.telefone],
      ],
      [
        ["Endereço", EMITENTE.endereco],
        ["Frete", EMITENTE.frete],
      ],
    ],
    left,
    y,
    half,
    132,
  );

  const nome =
    (pedido.entidade_nome as string) ||
    (pedido.partner_name as string) ||
    "Não informado";
  const docRaw =
    (pedido.entidade_document as string) ||
    (pedido.partner_document as string) ||
    "";
  const destX = left + half + 12;

  drawInfoBoxTwoCols(
    doc,
    "Destinatário",
    [
      [
        ["Nome", nome],
        ["Documento", formatCpfCnpj(docRaw)],
      ],
      [
        ["Email", STR(pedido.entidade_email)],
        ["Telefone", formatTelefone(pedido.entidade_telefone as string)],
      ],
      [
        ["Endereço", DEST_ENDERECO],
        ["CEP", formatCep(pedido.entidade_cep as string)],
      ],
    ],
    destX,
    y,
    half,
    132,
  );

  doc.moveDown(2);
  doc.y = y + 140;
};

export const drawTransportadora = (
  doc: PDFDoc,
  info: TransportadoraInfo | null | undefined,
): number => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y + 6;
  const w = right - left;

  const rows: TwoColRow[] = [
    [
      ["Transportadora", STR(info?.razao || "—")],
      [
        "Quantidade",
        STR(info?.quantidade != null ? String(info.quantidade) : "—"),
      ],
    ],
    [
      ["Razão social", STR(info?.razao || "—")],
      ["Espécie", STR(info?.especie || "")],
    ],
    [
      ["CPF", formatCpfCnpj(info?.cpf || "")],
      ["Peso B", STR(info?.pesoB || "—")],
    ],
    [
      ["Placa", STR(info?.placa || "—")],
      ["Peso L", STR(info?.pesoL || "—")],
    ],
    [["UF", STR(info?.uf || "—")], null],
  ];

  const bottom = drawInfoBoxTwoCols(doc, "Transportadora", rows, left, y, w, 100);
  doc.y = bottom + 8;
  return bottom;
};
