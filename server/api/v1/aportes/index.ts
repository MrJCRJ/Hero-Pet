import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "GET") {
    return getAportes(req, res);
  }
  if (req.method === "POST") {
    return postAporte(req, res);
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function getAportes(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const q = req.query || {};
    const mes = q.mes as string | undefined;
    const ano = q.ano as string | undefined;
    const limit = Math.min(500, parseInt((q.limit as string) || "100", 10) || 100);
    const offset = Math.max(0, parseInt((q.offset as string) || "0", 10));

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (mes && ano) {
      whereClauses.push(
        `EXTRACT(MONTH FROM data) = $${paramIndex} AND EXTRACT(YEAR FROM data) = $${paramIndex + 1}`
      );
      params.push(parseInt(mes, 10), parseInt(ano, 10));
      paramIndex += 2;
    } else if (ano) {
      whereClauses.push(`EXTRACT(YEAR FROM data) = $${paramIndex}`);
      params.push(parseInt(ano, 10));
      paramIndex += 1;
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const dataQuery = {
      text: `
        SELECT id, data, valor, descricao, created_at, updated_at
        FROM aportes_capital
        ${whereSQL}
        ORDER BY data DESC, id DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      values: [...params, limit, offset],
    };
    const dataResult = await database.query(dataQuery);

    const countQuery = {
      text: `SELECT COUNT(*) as total FROM aportes_capital ${whereSQL}`,
      values: params,
    };
    const countResult = await database.query(countQuery);
    const total = parseInt(
      (countResult.rows[0] as Record<string, unknown>)?.total as string,
      10
    );

    res.status(200).json({
      data: dataResult.rows,
      meta: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /aportes error", error);
    res.status(500).json({ error: "Erro ao buscar aportes" });
  }
}

async function postAporte(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
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
        INSERT INTO aportes_capital (data, valor, descricao)
        VALUES ($1::date, $2, $3)
        RETURNING id, data, valor, descricao, created_at, updated_at
      `,
      values: [
        data,
        parseFloat(String(valor)),
        (descricao as string)?.trim() || null,
      ],
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /aportes error", error);
    res.status(500).json({ error: "Erro ao criar aporte" });
  }
}
