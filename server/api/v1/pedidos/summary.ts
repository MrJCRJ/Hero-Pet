// pages/api/v1/pedidos/summary.ts
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getSummaryHandler } from "./handlers/summary";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  return getSummaryHandler(req, res);
}
