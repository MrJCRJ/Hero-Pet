import database from "infra/database.js";
import { consultarNFe } from "@/lib/nfe/provider";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function nfeStatusHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const pedidoId = Number(req.query?.id);
    if (!Number.isFinite(pedidoId)) {
      res.status(400).json({ error: "ID do pedido inválido" });
      return;
    }

    const refresh = req.query?.refresh === "1" || req.query?.refresh === "true";
    if (refresh) {
      const consulta = await consultarNFe(pedidoId);
      const result = await database.query({
        text: `SELECT pedido_id, chave_acesso, protocolo, status, danfe_url, xml_url, erro, created_at
               FROM pedido_nfe WHERE pedido_id = $1`,
        values: [pedidoId],
      });
      if (!result.rows.length) {
        res.status(200).json({
          nfe: null,
          consulta: consulta.status ? { status: consulta.status, erro: consulta.erro } : undefined,
        });
        return;
      }
      const row = result.rows[0] as Record<string, unknown>;
      res.status(200).json({
        nfe: {
          pedido_id: row.pedido_id,
          chave_acesso: row.chave_acesso,
          protocolo: row.protocolo,
          status: row.status,
          danfe_url: row.danfe_url,
          xml_url: row.xml_url,
          erro: row.erro,
          created_at: row.created_at,
        },
      });
      return;
    }

    const result = await database.query({
      text: `SELECT pedido_id, chave_acesso, protocolo, status, danfe_url, xml_url, erro, created_at
             FROM pedido_nfe
             WHERE pedido_id = $1`,
      values: [pedidoId],
    });

    if (!result.rows.length) {
      res.status(200).json({ nfe: null });
      return;
    }

    const row = result.rows[0] as Record<string, unknown>;
    res.status(200).json({
      nfe: {
        pedido_id: row.pedido_id,
        chave_acesso: row.chave_acesso,
        protocolo: row.protocolo,
        status: row.status,
        danfe_url: row.danfe_url,
        xml_url: row.xml_url,
        erro: row.erro,
        created_at: row.created_at,
      },
    });
  } catch (e) {
    console.error("GET /pedidos/:id/nfe/status error", e);
    res.status(500).json({ error: "Erro ao buscar status da NF-e" });
  }
}
