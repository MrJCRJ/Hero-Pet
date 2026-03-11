import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const id = req.query?.id;
  const despesaId = parseInt(String(id), 10);

  if (isNaN(despesaId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  if (req.method === "GET") {
    return getDespesa(req, res, despesaId);
  }
  if (req.method === "PUT") {
    return putDespesa(req, res, despesaId);
  }
  if (req.method === "DELETE") {
    return deleteDespesa(req, res, despesaId);
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function getDespesa(
  req: ApiReqLike,
  res: ApiResLike,
  despesaId: number
): Promise<void> {
  try {
    const query = {
      text: `
        SELECT d.*, e.name as fornecedor_name
        FROM despesas d
        LEFT JOIN entities e ON d.fornecedor_id = e.id
        WHERE d.id = $1
      `,
      values: [despesaId],
    };
    const result = await database.query(query);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Despesa não encontrada" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`GET /despesas/${despesaId} error`, error);
    res.status(500).json({ error: "Erro ao buscar despesa" });
  }
}

async function putDespesa(
  req: ApiReqLike,
  res: ApiResLike,
  despesaId: number
): Promise<void> {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const {
      descricao,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      fornecedor_id,
      observacao,
    } = body;

    if (descricao !== undefined && !(descricao as string).trim()) {
      res.status(400).json({ error: "Descrição não pode ser vazia" });
      return;
    }
    if (valor !== undefined && parseFloat(String(valor)) <= 0) {
      res.status(400).json({ error: "Valor inválido" });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (descricao !== undefined) {
      updates.push(`descricao = $${paramIndex}`);
      values.push((descricao as string).trim());
      paramIndex++;
    }
    if (categoria !== undefined) {
      updates.push(`categoria = $${paramIndex}`);
      values.push(categoria);
      paramIndex++;
    }
    if (valor !== undefined) {
      updates.push(`valor = $${paramIndex}`);
      values.push(parseFloat(String(valor)));
      paramIndex++;
    }
    if (data_vencimento !== undefined) {
      updates.push(`data_vencimento = $${paramIndex}`);
      values.push(data_vencimento);
      paramIndex++;
    }
    if (data_pagamento !== undefined) {
      updates.push(`data_pagamento = $${paramIndex}`);
      values.push(data_pagamento || null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (fornecedor_id !== undefined) {
      updates.push(`fornecedor_id = $${paramIndex}`);
      values.push(fornecedor_id || null);
      paramIndex++;
    }
    if (observacao !== undefined) {
      updates.push(`observacao = $${paramIndex}`);
      values.push((observacao as string)?.trim() || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(despesaId);

    const updateQuery = {
      text: `
        UPDATE despesas
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
      values,
    };

    const result = await database.query(updateQuery);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Despesa não encontrada" });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`PUT /despesas/${despesaId} error`, error);
    res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
}

async function deleteDespesa(
  req: ApiReqLike,
  res: ApiResLike,
  despesaId: number
): Promise<void> {
  try {
    const deleteQuery = {
      text: "DELETE FROM despesas WHERE id = $1 RETURNING id",
      values: [despesaId],
    };
    const result = await database.query(deleteQuery);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Despesa não encontrada" });
      return;
    }

    res.status(200).json({ message: "Despesa excluída com sucesso" });
  } catch (error) {
    console.error(`DELETE /despesas/${despesaId} error`, error);
    res.status(500).json({ error: "Erro ao excluir despesa" });
  }
}
