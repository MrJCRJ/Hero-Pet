import database from "infra/database.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const despesaId = parseInt(id);

  if (isNaN(despesaId)) {
    return res.status(400).json({ error: "ID inválido" });
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
  return res.status(405).json({ error: "Method not allowed" });
}

async function getDespesa(req, res, despesaId) {
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
      return res.status(404).json({ error: "Despesa não encontrada" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`GET /despesas/${despesaId} error`, error);
    return res.status(500).json({ error: "Erro ao buscar despesa" });
  }
}

async function putDespesa(req, res, despesaId) {
  try {
    const body = req.body || {};
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

    // Validações
    if (descricao !== undefined && !descricao.trim()) {
      return res.status(400).json({ error: "Descrição não pode ser vazia" });
    }
    if (valor !== undefined && parseFloat(valor) <= 0) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    // Construir query de update dinamicamente
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (descricao !== undefined) {
      updates.push(`descricao = $${paramIndex}`);
      values.push(descricao.trim());
      paramIndex++;
    }
    if (categoria !== undefined) {
      updates.push(`categoria = $${paramIndex}`);
      values.push(categoria);
      paramIndex++;
    }
    if (valor !== undefined) {
      updates.push(`valor = $${paramIndex}`);
      values.push(parseFloat(valor));
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
      values.push(observacao?.trim() || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
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
      return res.status(404).json({ error: "Despesa não encontrada" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`PUT /despesas/${despesaId} error`, error);
    return res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
}

async function deleteDespesa(req, res, despesaId) {
  try {
    const deleteQuery = {
      text: "DELETE FROM despesas WHERE id = $1 RETURNING id",
      values: [despesaId],
    };
    const result = await database.query(deleteQuery);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Despesa não encontrada" });
    }

    return res.status(200).json({ message: "Despesa excluída com sucesso" });
  } catch (error) {
    console.error(`DELETE /despesas/${despesaId} error`, error);
    return res.status(500).json({ error: "Erro ao excluir despesa" });
  }
}
