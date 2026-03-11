import database from "infra/database";
import bcrypt from "bcryptjs";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  const id = (req.query as Record<string, string>).id;
  const numId = parseInt(id, 10);
  if (!id || !Number.isFinite(numId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  if (req.method === "GET") return getUser(numId, res);
  if (req.method === "PUT") return putUser(numId, req, res);
  if (req.method === "DELETE") return deleteUser(numId, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getUser(id: number, res: ApiResLike): Promise<void> {
  try {
    const result = await database.query({
      text: "SELECT id, nome, email, role, must_change_password, created_at FROM users WHERE id = $1",
      values: [id],
    });
    if (!result.rows.length) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const r = result.rows[0] as Record<string, unknown>;
    res.status(200).json({
      id: r.id,
      nome: r.nome,
      email: r.email,
      role: r.role,
      must_change_password: !!r.must_change_password,
      created_at: r.created_at,
    });
  } catch (e) {
    console.error("GET /users/[id] error", e);
    res.status(500).json({ error: "Erro interno" });
  }
}

async function putUser(id: number, req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const nome = typeof b.nome === "string" ? b.nome.trim() : undefined;
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : undefined;
    const senha = typeof b.senha === "string" ? b.senha : undefined;
    const role = typeof b.role === "string" ? b.role.trim().toLowerCase() : undefined;
    const must_change_password = b.must_change_password;

    const allowedRoles = ["admin", "operador", "visualizador"];
    if (role !== undefined && !allowedRoles.includes(role)) {
      res.status(400).json({ error: "Role inválido" });
      return;
    }
    if (nome !== undefined && nome.length < 2) {
      res.status(400).json({ error: "Nome inválido" });
      return;
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Email inválido" });
      return;
    }
    if (senha !== undefined && senha.length < 8) {
      res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
      return;
    }

    const existing = await database.query({
      text: "SELECT id FROM users WHERE id = $1",
      values: [id],
    });
    if (!existing.rows.length) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    if (email) {
      const dup = await database.query({
        text: "SELECT id FROM users WHERE email = $1 AND id != $2",
        values: [email, id],
      });
      if (dup.rows.length) {
        res.status(409).json({ error: "Email já cadastrado" });
        return;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (nome !== undefined) {
      updates.push(`nome = $${idx++}`);
      values.push(nome);
    }
    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (must_change_password !== undefined) {
      updates.push(`must_change_password = $${idx++}`);
      values.push(!!must_change_password);
    }
    if (senha && senha.length >= 8) {
      const hash = await bcrypt.hash(senha, 10);
      updates.push(`senha_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      const r = await database.query({
        text: "SELECT id, nome, email, role, must_change_password, created_at FROM users WHERE id = $1",
        values: [id],
      });
      const row = r.rows[0] as Record<string, unknown>;
      return res.status(200).json({
        id: row.id,
        nome: row.nome,
        email: row.email,
        role: row.role,
        must_change_password: !!row.must_change_password,
        created_at: row.created_at,
      });
    }

    values.push(id);
    const result = await database.query({
      text: `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}
             RETURNING id, nome, email, role, must_change_password, created_at`,
      values,
    });
    const row = result.rows[0] as Record<string, unknown>;
    res.status(200).json({
      id: row.id,
      nome: row.nome,
      email: row.email,
      role: row.role,
      must_change_password: !!row.must_change_password,
      created_at: row.created_at,
    });
  } catch (e) {
    console.error("PUT /users/[id] error", e);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
}

async function deleteUser(id: number, res: ApiResLike): Promise<void> {
  try {
    const result = await database.query({
      text: "DELETE FROM users WHERE id = $1 RETURNING id",
      values: [id],
    });
    if (!result.rows.length) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const r = res.status(204);
    if (r.end) r.end();
  } catch (e) {
    console.error("DELETE /users/[id] error", e);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
}

export default handler;
