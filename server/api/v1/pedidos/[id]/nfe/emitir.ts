import database from "infra/database.js";
import { emitirNFe } from "@/lib/nfe/provider";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function emitirNFeHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const pedidoId = Number(req.query?.id);
    if (!Number.isFinite(pedidoId)) {
      res.status(400).json({ error: "ID do pedido inválido" });
      return;
    }

    const pedidoResult = await database.query({
      text: `SELECT p.id, p.tipo, p.status, p.partner_entity_id, p.partner_document, p.partner_name,
                    p.total_liquido, p.data_emissao,
                    e.name AS entity_name, e.document_digits, e.email
             FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE p.id = $1`,
      values: [pedidoId],
    });

    if (!pedidoResult.rows.length) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }

    const pedido = pedidoResult.rows[0] as Record<string, unknown>;
    if (pedido.tipo !== "VENDA") {
      res.status(400).json({ error: "NF-e só pode ser emitida para pedidos de venda" });
      return;
    }
    if (pedido.status !== "confirmado") {
      res.status(400).json({ error: "Pedido deve estar confirmado para emitir NF-e" });
      return;
    }

    const existing = await database.query({
      text: "SELECT id, status, chave_acesso FROM pedido_nfe WHERE pedido_id = $1",
      values: [pedidoId],
    });
    if (existing.rows.length && (existing.rows[0] as Record<string, unknown>).status === "autorizada") {
      res.status(409).json({
        error: "NF-e já autorizada para este pedido",
        chave_acesso: (existing.rows[0] as Record<string, unknown>).chave_acesso,
      });
      return;
    }

    const itensResult = await database.query({
      text: `SELECT pi.quantidade, pi.preco_unitario, pi.total_item, p.nome AS produto_nome
             FROM pedido_itens pi
             LEFT JOIN produtos p ON p.id = pi.produto_id
             WHERE pi.pedido_id = $1
             ORDER BY pi.id`,
      values: [pedidoId],
    });

    const doc = String(pedido.partner_document || pedido.document_digits || "").replace(/\D/g, "");
    const itens = (itensResult.rows as Array<Record<string, unknown>>).map((i) => ({
      descricao: String(i.produto_nome || "Produto"),
      ncm: "23099090",
      cfop: "5102",
      quantidade: Number(i.quantidade || 0),
      valorUnitario: Number(i.preco_unitario || 0),
      valorTotal: Number(i.total_item || 0),
    }));

    const payload = {
      pedidoId,
      cliente: {
        nome: String(pedido.partner_name || pedido.entity_name || "Cliente"),
        document: doc || "00000000000000",
        email: String(pedido.email || ""),
      },
      itens,
      total: Number(pedido.total_liquido || 0),
    };

    const result = await emitirNFe(payload);

    const client = await database.getClient();
    try {
      await client.query("BEGIN");
      if (existing.rows.length) {
        await client.query({
          text: `UPDATE pedido_nfe SET status = $1, chave_acesso = $2, protocolo = $3,
                 danfe_url = $4, xml_url = $5, erro = $6, updated_at = NOW()
                 WHERE pedido_id = $7`,
          values: [
            result.ok ? "autorizada" : "erro",
            result.chaveAcesso || null,
            result.protocolo || null,
            result.danfeUrl || null,
            result.xmlUrl || null,
            result.erro || null,
            pedidoId,
          ],
        });
      } else {
        await client.query({
          text: `INSERT INTO pedido_nfe (pedido_id, status, chave_acesso, protocolo, danfe_url, xml_url, erro)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          values: [
            pedidoId,
            result.ok ? "autorizada" : "erro",
            result.chaveAcesso || null,
            result.protocolo || null,
            result.danfeUrl || null,
            result.xmlUrl || null,
            result.erro || null,
          ],
        });
      }
      await client.query("COMMIT");
    } catch (e) {
      await database.safeRollback(client);
      throw e;
    } finally {
      client.release();
    }

    if (result.ok) {
      res.status(200).json({
        ok: true,
        chave_acesso: result.chaveAcesso,
        protocolo: result.protocolo,
        danfe_url: result.danfeUrl,
        xml_url: result.xmlUrl,
      });
    } else {
      res.status(502).json({
        ok: false,
        erro: result.erro || "Falha ao emitir NF-e",
      });
    }
  } catch (e) {
    console.error("POST /pedidos/:id/nfe/emitir error", e);
    res.status(500).json({ error: "Erro interno ao processar emissão" });
  }
}
