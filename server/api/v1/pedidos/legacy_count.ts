// Endpoint descomissionado: mantido apenas para evitar 404 em clientes antigos.
// Retorna 410 GONE indicando que a métrica legacy_count foi removida.
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.status(410).json({
    error: "legacy_count deprecated",
    message:
      "A contagem de pedidos legacy foi removida após retirada da migração FIFO",
  });
}
