// pages/api/v1/pedidos/[id].ts
import { getPedido } from "./handlers/getPedido";
import { putPedido } from "./handlers/putPedido";
import { deletePedido } from "./handlers/deletePedido";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "GET") return getPedido(req, res);
  if (req.method === "PUT") return putPedido(req, res);
  if (req.method === "DELETE") return deletePedido(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}
