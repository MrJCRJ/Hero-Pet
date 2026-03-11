// Items section for NF PDF
import { BRL } from "./helpers";
import { drawHeader } from "./header";
import type { PDFDoc, PedidoLike, RowLike, ColsMeta, HeaderMeta } from "./types";

export const computeItemColumns = (doc: PDFDoc): ColsMeta => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const fixed = 70 + 60 + 70 + 60 + 80;
  const flex = w - fixed;
  const cols = [
    { key: "codigo", label: "Cód.", x: left, w: 70, align: "left" },
    { key: "produto", label: "Produto", x: left + 70, w: flex, align: "left" },
    { key: "qtd", label: "Qtd", x: left + 70 + flex, w: 60, align: "right" },
    {
      key: "preco",
      label: "Preço",
      x: left + 70 + flex + 60,
      w: 70,
      align: "right",
    },
    {
      key: "desc",
      label: "Desc.",
      x: left + 70 + flex + 60 + 70,
      w: 60,
      align: "right",
    },
    {
      key: "total",
      label: "Total",
      x: left + 70 + flex + 60 + 70 + 60,
      w: 80,
      align: "right",
    },
  ];
  return { left, w, cols };
};

export const drawItemsHeader = (
  doc: PDFDoc,
  colsMeta: ColsMeta,
): HeaderMeta => {
  const y = doc.y + 6;
  const { left, w, cols } = colsMeta;

  doc.save();
  doc.rect(left, y, w, 18).fill("#F9FAFB");
  doc.restore();
  doc
    .fillColor("#111827")
    .fontSize(11)
    .text("Itens", left + 8, y + 4, { width: w - 16, align: "center" });

  const headerY = y + 24;
  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9);
  cols.forEach((c) => {
    doc.text(c.label, c.x + 6, headerY + 4, {
      width: c.w - 12,
      align: c.align as "left" | "right" | "center",
    });
  });
  doc
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .moveTo(left, headerY + 18)
    .lineTo(left + w, headerY + 18)
    .stroke();

  const yStart = headerY + 22;
  return { yStart, box: { left, top: y, w } };
};

export const drawItemsRows = (
  doc: PDFDoc,
  colsMeta: ColsMeta,
  itensRows: RowLike[],
  headerMeta: HeaderMeta,
): { y: number; totalGeral: number } => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 140;
  let y = headerMeta.yStart;
  let totalGeral = 0;
  let rowsOnPage = 0;
  const { cols, left, w } = colsMeta;
  let currentBox = headerMeta.box;

  itensRows.forEach((row, idx) => {
    const qtd = Number(row.quantidade);
    const preco = Number(row.preco_unitario);
    const desc = Number(row.desconto_unitario || 0);
    const total = Number(row.total_item || qtd * (preco - desc));
    totalGeral += total;

    const rowHeight = 20;
    if (rowsOnPage >= 10 || y + rowHeight > bottomLimit) {
      const boxHeight = Math.max(28, y - currentBox.top + 8);
      doc
        .save()
        .roundedRect(
          currentBox.left,
          currentBox.top,
          currentBox.w,
          boxHeight,
          4,
        )
        .strokeColor("#D1D5DB")
        .lineWidth(1)
        .stroke()
        .restore();

      doc.addPage();
      drawHeader(
        doc,
        {
          id: row.pedido_id,
          tipo: "",
          data_emissao: new Date(),
        } as PedidoLike,
        null as string | null,
      );
      const nextHeader = drawItemsHeader(doc, colsMeta);
      y = nextHeader.yStart;
      currentBox = nextHeader.box;
      rowsOnPage = 0;
    }

    if (idx % 2 === 1)
      doc.rect(left, y, w, rowHeight).fill("#FAFAFA").fillColor("#111827");

    doc
      .strokeColor("#F3F4F6")
      .lineWidth(1)
      .moveTo(cols[0].x, y + rowHeight)
      .lineTo(cols[5].x + cols[5].w, y + rowHeight)
      .stroke();

    doc.fillColor("#111827").fontSize(9);
    doc.text(String(row.produto_id), cols[0].x + 6, y + 5, {
      width: cols[0].w - 12,
      align: "left",
    });
    doc.text(
      String(row.produto_nome || row.produto_id),
      cols[1].x + 6,
      y + 5,
      { width: cols[1].w - 12, align: "left" },
    );
    doc.text(String(Math.trunc(qtd)), cols[2].x + 6, y + 5, {
      width: cols[2].w - 12,
      align: "right",
    });
    doc.text(BRL(preco), cols[3].x + 6, y + 5, {
      width: cols[3].w - 12,
      align: "right",
    });
    doc.text(BRL(desc), cols[4].x + 6, y + 5, {
      width: cols[4].w - 12,
      align: "right",
    });
    doc.text(BRL(total), cols[5].x + 6, y + 5, {
      width: cols[5].w - 12,
      align: "right",
    });

    y += rowHeight;
    rowsOnPage += 1;
  });

  const finalBoxHeight = Math.max(28, y - currentBox.top + 8);
  doc
    .save()
    .roundedRect(
      currentBox.left,
      currentBox.top,
      currentBox.w,
      finalBoxHeight,
      4,
    )
    .strokeColor("#D1D5DB")
    .lineWidth(1)
    .stroke()
    .restore();

  return { y, totalGeral };
};
