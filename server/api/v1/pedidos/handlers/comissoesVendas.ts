import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithSetHeader = ApiResLike & {
  setHeader: (name: string, value: string) => void;
};

export async function getComissoesVendasPDF(
  req: ApiReqLike,
  res: ResWithSetHeader
): Promise<void> {
  try {
    const mes = req.query?.mes;
    const ano = req.query?.ano;
    const now = new Date();
    const targetMes = mes ? Number(mes) : now.getMonth() + 1;
    const targetAno = ano ? Number(ano) : now.getFullYear();

    if (!Number.isFinite(targetMes) || targetMes < 1 || targetMes > 12) {
      res.status(400).json({ error: "Mês inválido" });
      return;
    }
    if (!Number.isFinite(targetAno)) {
      res.status(400).json({ error: "Ano inválido" });
      return;
    }

    const firstDay = `${targetAno}-${String(targetMes).padStart(2, "0")}-01`;
    const nextMonth = targetMes === 12 ? 1 : targetMes + 1;
    const nextYear = targetMes === 12 ? targetAno + 1 : targetAno;
    const lastDay = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const query = {
      text: `
        SELECT 
          p.id AS pedido_id,
          p.data_emissao,
          p.partner_name,
          e.name AS entidade_nome,
          pi.produto_id,
          prod.nome AS produto_nome,
          prod.categoria,
          pi.quantidade,
          pi.preco_unitario,
          pi.desconto_unitario,
          pi.total_item
        FROM pedidos p
        LEFT JOIN entities e ON e.id = p.partner_entity_id
        LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
        LEFT JOIN produtos prod ON prod.id = pi.produto_id
        WHERE p.tipo = 'VENDA'
          AND p.status = 'confirmado'
          AND p.data_emissao >= $1::date
          AND p.data_emissao < $2::date
          AND (
            prod.categoria IN ('Cachorro', 'Gato', 'Passaros')
            OR prod.categoria IS NULL
            OR prod.categoria = ''
          )
        ORDER BY p.data_emissao DESC, p.id, pi.id
      `,
      values: [firstDay, lastDay],
    };

    const result = await database.query(query);
    const vendas = result.rows as Array<Record<string, unknown>>;

    const pedidosMap = new Map<
      number,
      { id: number; data: unknown; cliente: string; total: number }
    >();
    const produtosMap = new Map<
      number,
      { nome: string; categoria: unknown; quantidade: number; valorTotal: number }
    >();
    const clientesMap = new Map<
      string,
      { nome: string; totalCompras: number }
    >();
    let totalGeral = 0;

    vendas.forEach((item) => {
      const pedidoId = item.pedido_id as number;
      const produtoId = item.produto_id as number;
      const clienteNome =
        (item.partner_name || item.entidade_nome || "Cliente não identificado") as string;
      const quantidade = Number(item.quantidade) || 0;
      const totalItem = Number(item.total_item) || 0;

      if (!pedidosMap.has(pedidoId)) {
        pedidosMap.set(pedidoId, {
          id: pedidoId,
          data: item.data_emissao,
          cliente: clienteNome,
          total: 0,
        });
      }
      const pedido = pedidosMap.get(pedidoId)!;
      pedido.total += totalItem;

      if (!produtosMap.has(produtoId)) {
        produtosMap.set(produtoId, {
          nome: (item.produto_nome || "") as string,
          categoria: item.categoria,
          quantidade: 0,
          valorTotal: 0,
        });
      }
      const produto = produtosMap.get(produtoId)!;
      produto.quantidade += quantidade;
      produto.valorTotal += totalItem;

      if (!clientesMap.has(clienteNome)) {
        clientesMap.set(clienteNome, {
          nome: clienteNome,
          totalCompras: 0,
        });
      }
      const cliente = clientesMap.get(clienteNome)!;
      cliente.totalCompras += totalItem;

      totalGeral += totalItem;
    });

    const pedidos = Array.from(pedidosMap.values()).sort(
      (a, b) => new Date(b.data as string | Date).getTime() - new Date(a.data as string | Date).getTime()
    );
    const produtos = Array.from(produtosMap.values()).sort(
      (a, b) => b.valorTotal - a.valorTotal
    );
    const clientes = Array.from(clientesMap.values()).sort(
      (a, b) => b.totalCompras - a.totalCompras
    );

    const comissao3 = totalGeral * 0.03;
    const comissao5 = totalGeral * 0.05;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Comissoes-Vendas-${targetAno}-${String(targetMes).padStart(2, "0")}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 }) as InstanceType<typeof PDFDocument> & {
      pipe: (dest: unknown) => void;
      end: () => void;
      y: number;
      page: { width: number; height: number };
      addPage: () => void;
      fontSize: (n: number) => unknown;
      font: (f: string) => unknown;
      text: (t: string, x?: number, y?: number, opts?: Record<string, unknown>) => unknown;
      moveDown: (n?: number) => unknown;
      moveTo: (x: number, y: number) => unknown;
      lineTo: (x: number, y: number) => unknown;
      stroke: () => unknown;
      fillColor: (c: string) => unknown;
    };
    doc.pipe(res as unknown);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Relatório de Comissões de Vendas", { align: "center" });
    doc.moveDown(0.5);

    const mesNome = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ][targetMes - 1];

    doc
      .fontSize(14)
      .font("Helvetica")
      .text(`Período: ${mesNome} de ${targetAno}`, { align: "center" });
    doc
      .fontSize(10)
      .text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, {
        align: "center",
      });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").text("1. Pedidos do Mês");
    doc.moveDown(0.5);

    if (pedidos.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Nenhum pedido encontrado neste período.", { align: "center" });
    } else {
      const pedidosTableTop = doc.y;
      const colPedidoId = 50;
      const colPedidoData = 110;
      const colPedidoCliente = 200;
      const colPedidoTotal = 480;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Pedido", colPedidoId, pedidosTableTop);
      doc.text("Data", colPedidoData, pedidosTableTop);
      doc.text("Cliente", colPedidoCliente, pedidosTableTop);
      doc.text("Valor Total", colPedidoTotal, pedidosTableTop);

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(9).font("Helvetica");
      pedidos.forEach((pedido) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          doc.fontSize(9).font("Helvetica");
        }
        const dataFormatada = new Date(pedido.data as string | Date).toLocaleDateString("pt-BR");
        doc.text(`#${pedido.id}`, colPedidoId, doc.y);
        const lineY = doc.y - 12;
        doc.text(dataFormatada, colPedidoData, lineY);
        doc.text(pedido.cliente.substring(0, 35), colPedidoCliente, lineY, { width: 260 });
        doc.text(`R$ ${pedido.total.toFixed(2)}`, colPedidoTotal, lineY, { width: 80 });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").text("2. Produtos Vendidos");
    doc.moveDown(0.5);

    if (produtos.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Nenhuma venda de ração/alimento encontrada neste período.", { align: "center" });
    } else {
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 350;
      const col3X = 450;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Produto", col1X, tableTop);
      doc.text("Qtd.", col2X, tableTop);
      doc.text("Valor Total", col3X, tableTop);

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(9).font("Helvetica");
      produtos.forEach((produto) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          doc.fontSize(9).font("Helvetica");
        }
        doc.text(produto.nome, col1X, doc.y, { width: 280, continued: false });
        const lineY = doc.y - 12;
        doc.text(produto.quantidade.toFixed(2), col2X, lineY, { width: 80 });
        doc.text(`R$ ${produto.valorTotal.toFixed(2)}`, col3X, lineY, { width: 100 });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").text("3. Clientes e Compras");
    doc.moveDown(0.5);

    if (clientes.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Nenhum cliente encontrado neste período.", { align: "center" });
    } else {
      const clientesTableTop = doc.y;
      const colClienteNome = 50;
      const colClienteTotal = 450;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Cliente", colClienteNome, clientesTableTop);
      doc.text("Total Comprado", colClienteTotal, clientesTableTop);

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(9).font("Helvetica");
      clientes.forEach((cliente) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          doc.fontSize(9).font("Helvetica");
        }
        doc.text(cliente.nome.substring(0, 50), colClienteNome, doc.y, { width: 380 });
        const lineY = doc.y - 12;
        doc.text(`R$ ${cliente.totalCompras.toFixed(2)}`, colClienteTotal, lineY, { width: 100 });
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").text("Resumo de Comissões");
    doc.moveDown(0.5);

    doc.fontSize(11).font("Helvetica");
    doc.text(`Total de vendas de rações/alimentos: R$ ${totalGeral.toFixed(2)}`);
    doc.moveDown(0.3);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#006400");
    doc.text(`Comissão 3%: R$ ${comissao3.toFixed(2)}`);
    doc.moveDown(0.3);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000080");
    doc.text(`Comissão 5%: R$ ${comissao5.toFixed(2)}`);

    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("#666666");
    doc.text(
      "Este relatório considera apenas pedidos de venda confirmados com produtos de alimentação animal (todas as rações/alimentos).",
      { align: "center" }
    );

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/comissoes-vendas error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated (pedidos missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(500).json({ error: "Internal error" });
  }
}
