import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "DELETE") {
    return deleteAporte(req, res);
  }
  if (req.method === "PUT") {
    return putAporte(req, res);
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function putAporte(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const idRaw = req.query?.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "ID obrigatório" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const { data, valor, descricao } = body;

    if (!data) {
      res.status(400).json({ error: "Data é obrigatória" });
      return;
    }
    if (!valor || parseFloat(String(valor)) <= 0) {
      res.status(400).json({ error: "Valor deve ser maior que zero" });
      return;
    }

    const result = await database.query({
      text: `
        UPDATE aportes_capital
        SET data = $1::date, valor = $2, descricao = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, data, valor, descricao, created_at, updated_at
      `,
      values: [
        data,
        parseFloat(String(valor)),
        (descricao as string)?.trim() || null,
        parseInt(id, 10),
      ],
    });

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Aporte não encontrado" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("PUT /aportes/:id error", error);
    res.status(500).json({ error: "Erro ao atualizar aporte" });
  }
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
