import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { proximasDatasMensais, proximasDatasAnuais } from "@/lib/despesas/recorrencia";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "GET") {
    return getDespesas(req, res);
  }
  if (req.method === "POST") {
    return postDespesa(req, res);
  }
  res.status(405).json({ error: "Method not allowed" });
}

async function getDespesas(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const q = req.query || {};
    const categoria = q.categoria as string | undefined;
    const status = q.status as string | undefined;
    const mes = q.mes as string | undefined;
    const ano = q.ano as string | undefined;
    const fornecedor_id = q.fornecedor_id as string | undefined;
    const page = parseInt((q.page as string) || "1", 10) || 1;
    const limit = parseInt((q.limit as string) || "50", 10) || 50;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: unknown[] = [];
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
      params.push(parseInt(fornecedor_id, 10));
      paramIndex++;
    }
    if (mes && ano) {
      whereClauses.push(
        `EXTRACT(MONTH FROM data_vencimento) = $${paramIndex} AND EXTRACT(YEAR FROM data_vencimento) = $${paramIndex + 1}`
      );
      params.push(parseInt(mes, 10), parseInt(ano, 10));
      paramIndex += 2;
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countQuery = {
      text: `SELECT COUNT(*) as total FROM despesas ${whereSQL}`,
      values: params,
    };
    const countResult = await database.query(countQuery);
    const total = parseInt(
      (countResult.rows[0] as Record<string, unknown>).total as string,
      10
    );

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

    res.status(200).json({
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
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
}

async function postDespesa(
  req: ApiReqLike,
  res: ApiResLike
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
      recorrente,
      recorrencia_frequencia,
      recorrencia_dia,
      recorrencia_mes,
    } = body;

    if (!(descricao as string)?.trim()) {
      res.status(400).json({ error: "Descrição é obrigatória" });
      return;
    }
    if (!categoria) {
      res.status(400).json({ error: "Categoria é obrigatória" });
      return;
    }
    if (!valor || parseFloat(String(valor)) <= 0) {
      res.status(400).json({ error: "Valor inválido" });
      return;
    }
    if (!data_vencimento) {
      res.status(400).json({ error: "Data de vencimento é obrigatória" });
      return;
    }

    const isRecorrente = !!recorrente;
    const freq = (recorrencia_frequencia as string) || "mensal";
    const dia = recorrencia_dia != null ? Number(recorrencia_dia) : new Date(String(data_vencimento)).getDate();
    const mesAnual = recorrencia_mes != null ? Number(recorrencia_mes) : new Date(String(data_vencimento)).getMonth() + 1;
    const inicio = new Date(String(data_vencimento));

    const insertBase = {
      text: `
        INSERT INTO despesas (
          descricao, categoria, valor, data_vencimento,
          data_pagamento, status, fornecedor_id, observacao,
          recorrente, recorrencia_frequencia, recorrencia_dia, recorrencia_mes, despesa_modelo_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
    };

    if (isRecorrente) {
      const datas =
        freq === "anual"
          ? proximasDatasAnuais(mesAnual, dia, inicio, 12)
          : proximasDatasMensais(dia, inicio, 12);
      const desc = (descricao as string).trim();
      const val = parseFloat(String(valor));
      const stat = (status as string) || "pendente";
      const forn = fornecedor_id || null;
      const obs = (observacao as string)?.trim() || null;

      const firstResult = await database.query({
        text: insertBase.text,
        values: [
          desc,
          categoria,
          val,
          datas[0],
          data_pagamento || null,
          stat,
          forn,
          obs,
          true,
          freq,
          dia,
          freq === "anual" ? mesAnual : null,
          null,
        ],
      });
      const modeloId = (firstResult.rows[0] as Record<string, unknown>).id as number;

      for (let i = 1; i < datas.length; i++) {
        await database.query({
          text: insertBase.text,
          values: [
            desc,
            categoria,
            val,
            datas[i],
            null,
            stat,
            forn,
            obs,
            false,
            null,
            null,
            null,
            modeloId,
          ],
        });
      }
      res.status(201).json(firstResult.rows[0]);
      return;
    }

    const result = await database.query({
      text: insertBase.text,
      values: [
        (descricao as string).trim(),
        categoria,
        parseFloat(String(valor)),
        data_vencimento,
        data_pagamento || null,
        (status as string) || "pendente",
        fornecedor_id || null,
        (observacao as string)?.trim() || null,
        false,
        null,
        null,
        null,
        null,
      ],
    });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /despesas error", error);
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
}
