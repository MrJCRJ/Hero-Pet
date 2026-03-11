// pages/api/v1/pedidos/[id]/confirm
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  _req: ApiReqLike,
  res: ApiResLike,
): Promise<void> {
  res
    .status(410)
    .json({ error: "Endpoint removido: pedidos já nascem confirmados" });
}
