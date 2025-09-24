// lib/pdf/nf/sections.js
// Funções de desenho (seções) para o PDF da NF
import {
  STR,
  BRL,
  DATE,
  formatCep,
  formatTelefone,
  formatCpfCnpj,
} from "./helpers";
import EMITENTE from "lib/constants/company";

export const box = (doc, x, y, w, h, title) => {
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

export const measureKVHeight = (doc, label, value, width, align = "left") => {
  const text = `${label}: ${STR(value)}`;
  return doc.heightOfString(text, { width, align });
};

export const drawKVInline = (
  doc,
  label,
  value,
  x,
  y,
  width,
  align = "left",
) => {
  if (!label) return; // permite pares vazios à direita
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`${label}: `, x, y, { width, align, continued: true });
  doc.font("Helvetica").fillColor("#374151").text(STR(value), { width, align });
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
    if (rLabel)
      drawKVInline(doc, rLabel, rValue, contentX + colW + gutter, yy, colW);

    yy += rowH + 2;
  });
  return y + h;
};

export const drawHeader = (doc, pedido, LOGO_PNG) => {
  const { width } = doc.page;
  const left = doc.page.margins.left;
  const right = width - doc.page.margins.right;
  const top = doc.page.margins.top;
  const headerInfoWidth = 180; // largura reservada para o bloco de info à direita

  // Marca d'água: logo grande e sutil ao fundo (não interfere no conteúdo)
  if (LOGO_PNG) {
    try {
      doc.save();
      // opacidade baixa, porém mais visível, sem competir com o texto
      doc.opacity(0.12);
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const maxW = pageW * 0.65; // ocupa ~65% da largura da página
      const maxH = pageH * 0.65; // ocupa ~65% da altura da página
      const x = (pageW - maxW) / 2;
      const y = (pageH - maxH) / 2;
      doc.image(LOGO_PNG, x, y, { fit: [maxW, maxH] });
      // restaura opacidade padrão antes de desenhar conteúdo
      doc.opacity(1);
      doc.restore();
    } catch (_) {
      // ignora erro de imagem
    }
  }

  // Faixa superior
  doc.save();
  doc.rect(left, top - 10, right - left, 32).fill("#F3F4F6");
  doc.restore();

  // Título (sem logo no cabeçalho)
  const titleX = left + 8; // título sempre começa aqui
  const titleY = top - 6;
  doc
    .fontSize(16)
    .fillColor("#111827")
    .text(EMITENTE.razao, titleX, titleY, { continued: false });
  doc
    .fontSize(10)
    .fillColor("#374151")
    .text("Documento Auxiliar de Nota Fiscal (MVP)", titleX, top + 12);

  // Info do pedido (lado direito)
  const info = [
    `Pedido: #${pedido.id}`,
    `Tipo: ${pedido.tipo}`,
    `Emissão: ${DATE(pedido.data_emissao)}`,
  ];
  if (pedido.data_entrega) info.push(`Entrega: ${DATE(pedido.data_entrega)}`);
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

export const drawParties = (doc, pedido, DEST_ENDERECO) => {
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

  const nome = pedido.entidade_nome || pedido.partner_name || "Não informado";
  const docRaw = pedido.entidade_document || pedido.partner_document || "";
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
        ["Telefone", formatTelefone(pedido.entidade_telefone)],
      ],
      [
        ["Endereço", DEST_ENDERECO],
        ["CEP", formatCep(pedido.entidade_cep)],
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

// Seção de Transportadora abaixo de Emitente/Destinatário
export const drawTransportadora = (doc, info) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.y + 6;
  const w = right - left;

  const rows = [
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

  const bottom = drawInfoBoxTwoCols(
    doc,
    "Transportadora",
    rows,
    left,
    y,
    w,
    100,
  );
  doc.y = bottom + 8;
  return bottom;
};

export const computeItemColumns = (doc) => {
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

export const drawItemsHeader = (doc, colsMeta) => {
  const y = doc.y + 6;
  const { left, w, cols } = colsMeta;

  // Barra de título (sem borda externa agora; borda será desenhada ao final junto com as linhas)
  doc.save();
  doc.rect(left, y, w, 18).fill("#F9FAFB");
  doc.restore();
  doc
    .fillColor("#111827")
    .fontSize(11)
    .text("Itens", left + 8, y + 4, { width: w - 16, align: "center" });

  const headerY = y + 24; // área dos rótulos das colunas

  // Cabeçalhos das colunas
  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9);
  cols.forEach((c) => {
    doc.text(c.label, c.x + 6, headerY + 4, {
      width: c.w - 12,
      align: c.align,
    });
  });
  // Linha divisória inferior do cabeçalho
  doc
    .strokeColor("#E5E7EB")
    .lineWidth(1)
    .moveTo(left, headerY + 18)
    .lineTo(left + w, headerY + 18)
    .stroke();

  const yStart = headerY + 22; // aproxima as linhas logo após o cabeçalho
  return { yStart, box: { left, top: y, w } };
};

export const drawItemsRows = (doc, colsMeta, itensRows, headerMeta) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 140;
  let y = headerMeta.yStart;
  let totalGeral = 0;
  let rowsOnPage = 0;
  const { cols, left, w } = colsMeta;
  let currentBox = headerMeta.box; // { left, top, w }
  itensRows.forEach((row, idx) => {
    const qtd = Number(row.quantidade);
    const preco = Number(row.preco_unitario);
    const desc = Number(row.desconto_unitario || 0);
    const total = Number(row.total_item || qtd * (preco - desc));
    totalGeral += total;

    const rowHeight = 20;
    // Quebra por limite visual OU por limite de 10 itens por página
    if (rowsOnPage >= 10 || y + rowHeight > bottomLimit) {
      // Fecha a borda da caixa da página atual até a última linha desenhada
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
        { id: row.pedido_id, tipo: "", data_emissao: new Date() },
        null,
      ); // re-render header minimal
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
    doc.text(String(row.produto_nome || row.produto_id), cols[1].x + 6, y + 5, {
      width: cols[1].w - 12,
      align: "left",
    });
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
  // Fecha a borda da última página (inclui cabeçalho + linhas)
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

export const drawTotals = (doc, pedido, yStart, totalGeral) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const boxWidth = 260;
  const x = right - boxWidth;
  // Posiciona imediatamente abaixo da tabela, com pequeno espaço
  const y = yStart + 8;

  doc.save();
  doc
    .roundedRect(x, y, boxWidth, 70, 6)
    .strokeColor("#D1D5DB")
    .lineWidth(1)
    .stroke();
  doc.restore();
  doc.fontSize(10).fillColor("#111827");
  const linhas = [
    [
      "Total Bruto",
      BRL(pedido.total_bruto != null ? pedido.total_bruto : totalGeral),
    ],
    ["Descontos", BRL(pedido.desconto_total || 0)],
    [
      "Total Líquido",
      BRL(pedido.total_liquido != null ? pedido.total_liquido : totalGeral),
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

export const drawSignature = (doc, startY, drawHeaderFn) => {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const required = 80; // bloco simplificado
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

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text("Recebimento", left, y);
  const contentY = doc.y + 10;
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  // Uma linha só com campos e linhas: Assinatura (à esquerda) e Data (à direita)
  const sigLabel = "Assinatura:";
  const sigLabelW = doc.widthOfString(sigLabel);
  const dateRegionW = 160; // região reservada para Data (label + linha)
  const dateX = right - dateRegionW;

  // Escreve o label de Assinatura e desenha linha após o label
  doc.text(sigLabel, left, contentY);
  const sigLineStart = left + sigLabelW + 6;
  const sigLineEnd = dateX - 16; // deixa espaço antes do bloco de Data
  const lineY = contentY + 14; // altura visual para a linha
  doc
    .strokeColor("#D1D5DB")
    .moveTo(sigLineStart, lineY)
    .lineTo(Math.max(sigLineStart + 60, sigLineEnd), lineY)
    .stroke();

  // Escreve o label de Data e desenha linha curta à direita do label
  const dateLabel = "Data:";
  doc.text(dateLabel, dateX, contentY);
  const dateLabelW = doc.widthOfString(dateLabel);
  const dateLineStart = dateX + dateLabelW + 6;
  const dateLineEnd = right - 8; // pequena margem direita
  doc
    .strokeColor("#D1D5DB")
    .moveTo(dateLineStart, lineY)
    .lineTo(Math.max(dateLineStart + 60, dateLineEnd), lineY)
    .stroke();
  doc.moveDown(2);
};

export const drawFooter = (doc) => {
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
