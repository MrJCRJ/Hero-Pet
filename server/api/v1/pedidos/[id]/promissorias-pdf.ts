// pages/api/v1/pedidos/[id]/promissorias-pdf.ts
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
  drawPromissoriaCard,
  PROMISSORIA_CARD_HEIGHT,
} from "lib/domain/pdf/duplicadas/sections";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike & { setHeader: (name: string, value: string) => void }
): Promise<void> {
  if (req.method === "GET") return getPromissoriasPDF(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

function addMonths(date: Date | string, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

async function getPromissoriasPDF(
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
      res
        .status(400)
        .json({ error: "Promissórias válidas apenas para pedidos de VENDA" });
      return;
    }
    const numeroPromissorias = Number(pedido.numero_promissorias) || 0;
    if (numeroPromissorias < 1) {
      res.status(400).json({ error: "Pedido não possui promissórias" });
      return;
    }

    const itensQ = await database.query({
      text: `SELECT i.* FROM pedido_itens i WHERE i.pedido_id = $1 ORDER BY i.id`,
      values: [id],
    });
    const itens = (itensQ.rows || []) as Array<Record<string, unknown>>;
    const totalItens = itens.reduce((acc, it) => {
      const qtd = Number(it.quantidade);
      const preco = Number(it.preco_unitario);
      const desc = Number(it.desconto_unitario || 0);
      const total =
        Number.isFinite(qtd) && Number.isFinite(preco)
          ? qtd * (preco - desc)
          : 0;
      return acc + (Number.isFinite(total) ? total : 0);
    }, 0);
    const totalLiquido =
      pedido.total_liquido != null
        ? Number(pedido.total_liquido)
        : totalItens;

    const n = Number(pedido.numero_promissorias || 1);
    const firstDate =
      pedido.data_primeira_promissoria ||
      pedido.data_emissao ||
      new Date();
    const baseAmount = Number(
      pedido.valor_por_promissoria ||
        (n > 0 ? totalLiquido / n : totalLiquido)
    );

    const promissoriasQ = await database.query({
      text: `SELECT * FROM pedido_promissorias WHERE pedido_id = $1 ORDER BY seq`,
      values: [id],
    });
    let parcelas: Array<{
      seq: number;
      totalSeq: number;
      amount: number;
      dueDate: string;
    }> = [];
    const fmtDate = (d: Date | string): string =>
      typeof d === "string" ? d : d.toISOString().slice(0, 10);
    if (promissoriasQ.rows?.length) {
      parcelas = (promissoriasQ.rows as Array<Record<string, unknown>>).map(
        (p) => ({
          seq: p.seq as number,
          totalSeq: promissoriasQ.rows.length,
          amount: Number(p.amount),
          dueDate: fmtDate(p.due_date as Date | string),
        })
      );
    } else {
      let acumulado = 0;
      for (let i = 0; i < Math.max(1, n); i++) {
        const due = addMonths(firstDate as Date, i);
        let amount = Number(baseAmount.toFixed(2));
        if (i < n - 1) {
          acumulado += amount;
        } else {
          amount = Number((totalLiquido - acumulado).toFixed(2));
        }
        parcelas.push({
          seq: i + 1,
          totalSeq: Math.max(1, n),
          amount,
          dueDate: fmtDate(due),
        });
      }
    }

    const cepDigits = stripDigits(String(pedido.entidade_cep || ""));
    const viaCepAddr = await tryFetchViaCep(cepDigits);
    const DEST_ENDERECO = composeEnderecoFromViaCep(
      viaCepAddr,
      pedido.entidade_numero as string | number | undefined,
      pedido.entidade_complemento as string | undefined,
      cepDigits
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Duplicadas-${pedido.id}.pdf"`
    );
    const doc = new PDFDocument({ margin: 36 }) as InstanceType<typeof PDFDocument> & {
      pipe: (dest: unknown) => void;
      addPage: () => void;
      end: () => void;
      page: { margins: { top: number }; height: number };
      y: number;
    };
    doc.pipe(res as unknown);

    const LOGO_PNG = tryLoadLogoPng();
    const topY = doc.page.margins.top;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const gap = 10;

    let y = topY;
    parcelas.forEach((parc) => {
      if (y + PROMISSORIA_CARD_HEIGHT + gap > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      drawPromissoriaCard(
        doc as unknown,
        parc,
        pedido,
        DEST_ENDERECO,
        LOGO_PNG
      );
      y = doc.y + gap;
    });

    doc.end();
  } catch (e) {
    console.error("GET /pedidos/:id/promissorias-pdf error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated (pedidos|pedido_itens missing)",
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
