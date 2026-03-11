// pages/api/v1/pedidos/[id]/nf.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import PDFDocument from "pdfkit";
import {
  stripDigits,
  tryFetchViaCep,
  composeEnderecoFromViaCep,
  tryLoadLogoPng,
} from "lib/domain/pdf/nf/helpers";
import {
  drawHeader,
  drawParties,
  drawTransportadora,
  computeItemColumns,
  drawItemsHeader,
  drawItemsRows,
  drawTotals,
  drawSignature,
  drawFooter,
} from "lib/domain/pdf/nf/sections";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike & { setHeader: (name: string, value: string) => void }
): Promise<void> {
  if (req.method === "GET") return getNF(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getNF(
  req: ApiReqLike,
  res: ApiResLike & { setHeader: (name: string, value: string) => void }
): Promise<void> {
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const head = await database.query({
      text: `SELECT p.*,
                    e.name AS entidade_nome,
                    e.document_digits AS entidade_document,
                    e.entity_type AS entidade_tipo,
                    e.telefone AS entidade_telefone,
                    e.email AS entidade_email,
                    e.cep AS entidade_cep,
                    e.numero AS entidade_numero,
                    e.complemento AS entidade_complemento
             FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE p.id = $1`,
      values: [id],
    });
    if (!head.rows.length) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }
    const pedido = head.rows[0] as Record<string, unknown>;

    if (pedido.tipo !== "VENDA") {
      res.status(400).json({
        error: "Geração de NF permitida apenas para pedidos de VENDA",
      });
      return;
    }
    if (!pedido.tem_nota_fiscal) {
      res.status(400).json({
        error: "Pedido não possui nota fiscal habilitada",
      });
      return;
    }

    const itensQ = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome, p.codigo_barras
             FROM pedido_itens i
             JOIN produtos p ON p.id = i.produto_id
             WHERE i.pedido_id = $1
             ORDER BY i.id`,
      values: [id],
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="NF-${pedido.id}.pdf"`
    );
    const doc = new PDFDocument({ margin: 36 }) as InstanceType<typeof PDFDocument> & {
      pipe: (dest: unknown) => void;
      end: () => void;
    };
    doc.pipe(res as unknown);

    const cepDigits = stripDigits(String(pedido.entidade_cep || ""));
    const viaCepAddr = await tryFetchViaCep(cepDigits);
    const DEST_ENDERECO = composeEnderecoFromViaCep(
      viaCepAddr,
      pedido.entidade_numero as string | number | undefined,
      pedido.entidade_complemento as string | undefined,
      cepDigits
    );

    const LOGO_PNG = tryLoadLogoPng();

    drawHeader(doc, pedido, LOGO_PNG);
    drawParties(doc, pedido, DEST_ENDERECO);

    const parseWeightKgFromName = (name = ""): number => {
      const m = String(name || "").match(/(\d+(?:[.,]\d+)?)\s*(?:k\s*g\s*s?)/i);
      if (!m) return 0;
      const n = Number(String(m[1]).replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    const totals = (itensQ.rows as Array<Record<string, unknown>>).reduce<{
      quantidade: number;
      pesoKg: number;
    }>(
      (acc, row) => {
        const qtd = Number(row.quantidade) || 0;
        acc.quantidade += qtd;
        const unitKg = parseWeightKgFromName(
          String(row.produto_nome || "")
        );
        acc.pesoKg += unitKg * qtd;
        return acc;
      },
      { quantidade: 0, pesoKg: 0 }
    );

    const pesoFmt = `${totals.pesoKg.toFixed(2)} kg`;
    const viaCepRecord = viaCepAddr as Record<string, string> | null;
    drawTransportadora(doc, {
      razao: "Nosso Transporte",
      cpf: "406,986,885-20",
      placa: "IAI1506",
      uf: viaCepRecord?.uf ?? "SE",
      quantidade: totals.quantidade,
      especie: "",
      pesoB: pesoFmt,
      pesoL: pesoFmt,
    });

    const colsMeta = computeItemColumns(doc);
    const headerMeta = drawItemsHeader(doc, colsMeta);
    const { y: yAfterRows, totalGeral } = drawItemsRows(
      doc,
      colsMeta,
      itensQ.rows,
      headerMeta
    );
    const bottomAfterTotals = drawTotals(
      doc,
      pedido,
      yAfterRows,
      totalGeral
    );
    drawSignature(doc, bottomAfterTotals + 16, () =>
      drawHeader(doc, pedido, LOGO_PNG)
    );
    drawFooter(doc);

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/nf error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated (pedidos|pedido_itens|produtos missing)",
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
