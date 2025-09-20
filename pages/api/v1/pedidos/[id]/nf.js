// pages/api/v1/pedidos/[id]/nf.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method "${req.method}" not allowed` });
  }

  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    // Buscar dados do pedido
    const head = await database.query({ text: `SELECT * FROM pedidos WHERE id = $1`, values: [id] });
    if (!head.rows.length) return res.status(404).json({ error: "Pedido não encontrado" });

    const pedido = head.rows[0];

    // Verificar se tem nota fiscal e que é somente para VENDA
    if (!pedido.tem_nota_fiscal) {
      return res.status(400).json({ error: "Pedido não possui nota fiscal habilitada" });
    }
    if (pedido.tipo !== 'VENDA') {
      return res.status(400).json({ error: "Geração de NF permitida apenas para pedidos de VENDA" });
    }

    // Buscar itens do pedido
    const itens = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome, p.codigo_barras 
             FROM pedido_itens i 
             JOIN produtos p ON p.id = i.produto_id 
             WHERE i.pedido_id = $1 
             ORDER BY i.id`,
      values: [id],
    });

    // Buscar dados da entidade (cliente/fornecedor)
    let entidade = null;
    if (pedido.partner_entity_id) {
      const entQuery = await database.query({
        text: `SELECT * FROM entities WHERE id = $1`,
        values: [pedido.partner_entity_id]
      });
      entidade = entQuery.rows[0] || null;
    }

    // Gerar PDF
    const doc = new PDFDocument({ margin: 50 });

    // Headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="NF-${pedido.tipo}-${id}.pdf"`);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).text('NOTA FISCAL', 50, 50);
    doc.fontSize(12);
    doc.text(`Tipo: ${pedido.tipo}`, 50, 80);
    doc.text(`Número: ${pedido.id}`, 50, 95);
    doc.text(`Data de Emissão: ${new Date(pedido.data_emissao).toLocaleDateString('pt-BR')}`, 50, 110);

    if (pedido.data_entrega) {
      doc.text(`Data de Entrega: ${new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}`, 50, 125);
    }

    // Dados do Cliente/Fornecedor
    doc.fontSize(14).text('DADOS DO PARCEIRO', 50, 160);
    doc.fontSize(10);
    let yPos = 180;

    if (entidade) {
      doc.text(`Nome: ${entidade.name}`, 50, yPos);
      yPos += 15;
      doc.text(`Tipo: ${entidade.entity_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}`, 50, yPos);
      yPos += 15;
      if (entidade.document_digits) {
        const doc_formatted = entidade.entity_type === 'PF'
          ? entidade.document_digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          : entidade.document_digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        doc.text(`Documento: ${doc_formatted}`, 50, yPos);
        yPos += 15;
      }
      if (entidade.telefone) {
        doc.text(`Telefone: ${entidade.telefone}`, 50, yPos);
        yPos += 15;
      }
      if (entidade.email) {
        doc.text(`Email: ${entidade.email}`, 50, yPos);
        yPos += 15;
      }
    } else {
      doc.text(`Nome: ${pedido.partner_name || 'Não informado'}`, 50, yPos);
      yPos += 15;
      if (pedido.partner_document) {
        doc.text(`Documento: ${pedido.partner_document}`, 50, yPos);
        yPos += 15;
      }
    }

    // Itens
    yPos += 20;
    doc.fontSize(14).text('ITENS', 50, yPos);
    yPos += 20;

    doc.fontSize(9);
    doc.text('Produto', 50, yPos);
    doc.text('Qtd', 250, yPos);
    doc.text('Preço Unit.', 300, yPos);
    doc.text('Desconto', 380, yPos);
    doc.text('Total', 450, yPos);
    yPos += 15;

    // Linha separadora
    doc.moveTo(50, yPos).lineTo(500, yPos).stroke();
    yPos += 10;

    let totalGeral = 0;

    for (const item of itens.rows) {
      doc.fontSize(8);
      doc.text(item.produto_nome.substring(0, 30), 50, yPos);
      doc.text(Number(item.quantidade).toFixed(3), 250, yPos);
      doc.text(`R$ ${Number(item.preco_unitario).toFixed(2)}`, 300, yPos);
      doc.text(`R$ ${Number(item.desconto_unitario || 0).toFixed(2)}`, 380, yPos);
      doc.text(`R$ ${Number(item.total_item).toFixed(2)}`, 450, yPos);

      totalGeral += Number(item.total_item);
      yPos += 12;

      // Nova página se necessário
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    }

    // Total
    yPos += 10;
    doc.moveTo(50, yPos).lineTo(500, yPos).stroke();
    yPos += 15;

    doc.fontSize(12);
    doc.text(`TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`, 350, yPos);

    // Promissórias se aplicável
    if (pedido.numero_promissorias > 1) {
      yPos += 30;
      doc.fontSize(12).text('CONDIÇÕES DE PAGAMENTO', 50, yPos);
      yPos += 15;
      doc.fontSize(10);
      doc.text(`Parcelado em ${pedido.numero_promissorias} promissórias`, 50, yPos);
      yPos += 12;

      if (pedido.valor_por_promissoria) {
        doc.text(`Valor por promissória: R$ ${Number(pedido.valor_por_promissoria).toFixed(2)}`, 50, yPos);
        yPos += 12;
      }

      if (pedido.data_primeira_promissoria) {
        doc.text(`Primeira promissória: ${new Date(pedido.data_primeira_promissoria).toLocaleDateString('pt-BR')}`, 50, yPos);
      }
    }

    // Observações
    if (pedido.observacao) {
      yPos += 30;
      doc.fontSize(12).text('OBSERVAÇÕES', 50, yPos);
      yPos += 15;
      doc.fontSize(10);
      doc.text(pedido.observacao, 50, yPos, { width: 450 });
    }

    // Rodapé
    doc.fontSize(8);
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 50, 750);

    // Finalizar PDF
    doc.end();

  } catch (e) {
    console.error("GET /pedidos/:id/nf error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}