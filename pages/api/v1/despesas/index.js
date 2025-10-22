import database from "infra/database.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return getDespesas(req, res);
  }
  if (req.method === "POST") {
    return postDespesa(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function getDespesas(req, res) {
  try {
    const { categoria, status, mes, ano, fornecedor_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (categoria) {
      whereClauses.push(`categoria = $${paramIndex}`);
      params.push(categoria);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (fornecedor_id) {
      whereClauses.push(`fornecedor_id = $${paramIndex}`);
      params.push(parseInt(fornecedor_id));
      paramIndex++;
    }

    if (mes && ano) {
      whereClauses.push(
        `EXTRACT(MONTH FROM data_vencimento) = $${paramIndex} AND EXTRACT(YEAR FROM data_vencimento) = $${paramIndex + 1}`,
      );
      params.push(parseInt(mes), parseInt(ano));
      paramIndex += 2;
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count total
    const countQuery = {
      text: `SELECT COUNT(*) as total FROM despesas ${whereSQL}`,
      values: params,
    };
    const countResult = await database.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get data with pagination
    const dataQuery = {
      text: `
        SELECT d.*, e.name as fornecedor_name
        FROM despesas d
        LEFT JOIN entities e ON d.fornecedor_id = e.id
        ${whereSQL}
        ORDER BY d.data_vencimento DESC, d.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      values: [...params, limit, offset],
    };
    const dataResult = await database.query(dataQuery);

    return res.status(200).json({
      data: dataResult.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /despesas error", error);
    return res.status(500).json({ error: "Erro ao buscar despesas" });
  }
}

async function postDespesa(req, res) {
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
    if (!descricao?.trim()) {
      return res.status(400).json({ error: "Descrição é obrigatória" });
    }
    if (!categoria) {
      return res.status(400).json({ error: "Categoria é obrigatória" });
    }
    if (!valor || parseFloat(valor) <= 0) {
      return res.status(400).json({ error: "Valor inválido" });
    }
    if (!data_vencimento) {
      return res
        .status(400)
        .json({ error: "Data de vencimento é obrigatória" });
    }

    const insertQuery = {
      text: `
        INSERT INTO despesas (
          descricao, categoria, valor, data_vencimento, 
          data_pagamento, status, fornecedor_id, observacao
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      values: [
        descricao.trim(),
        categoria,
        parseFloat(valor),
        data_vencimento,
        data_pagamento || null,
        status || "pendente",
        fornecedor_id || null,
        observacao?.trim() || null,
      ],
    };

    const result = await database.query(insertQuery);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /despesas error", error);
    return res.status(500).json({ error: "Erro ao criar despesa" });
  }
}
