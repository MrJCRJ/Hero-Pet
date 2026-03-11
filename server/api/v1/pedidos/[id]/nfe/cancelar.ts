import { cancelarNFe } from "@/lib/nfe/provider";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function nfeCancelarHandler(
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

    const b = (req.body || {}) as Record<string, unknown>;
    const motivo = typeof b.motivo === "string" ? b.motivo.trim() : "";
    if (!motivo || motivo.length < 15) {
      res.status(400).json({
        error: "Justificativa de cancelamento obrigatória (mínimo 15 caracteres)",
      });
      return;
    }

    const result = await cancelarNFe(pedidoId, motivo);
    if (!result.ok) {
      res.status(400).json({ error: result.erro || "Falha ao cancelar NF-e" });
      return;
    }

    res.status(200).json({ success: true, message: "NF-e cancelada com sucesso" });
  } catch (e) {
    console.error("POST /pedidos/:id/nfe/cancelar error", e);
    res.status(500).json({ error: "Erro ao cancelar NF-e" });
  }
}
