import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "DELETE") {
    return deleteAporte(req, res);
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function deleteAporte(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const idRaw = req.query?.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "ID obrigatório" });
      return;
    }

    const result = await database.query({
      text: "DELETE FROM aportes_capital WHERE id = $1 RETURNING id",
      values: [parseInt(id, 10)],
    });

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Aporte não encontrado" });
      return;
    }

    const r = res.status(204);
    if (r.end) r.end();
  } catch (error) {
    console.error("DELETE /aportes/:id error", error);
    res.status(500).json({ error: "Erro ao excluir aporte" });
  }
}
