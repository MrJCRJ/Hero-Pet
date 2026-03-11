// pages/api/v1/pedidos/comissoes-vendas.ts
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getComissoesVendasPDF } from "./handlers/comissoesVendas";

type ResWithSetHeader = ApiResLike & {
  setHeader: (name: string, value: string) => void;
};

export default async function handler(
  req: ApiReqLike,
  res: ResWithSetHeader
): Promise<void> {
  if (req.method === "GET") return getComissoesVendasPDF(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}
