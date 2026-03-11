import database from "infra/database";
import bcrypt from "bcryptjs";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method === "GET") return getUsers(req, res);
  if (req.method === "POST") return postUser(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getUsers(_req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const result = await database.query({
      text: `SELECT id, nome, email, role, must_change_password, created_at
             FROM users
             ORDER BY created_at DESC`,
      values: [],
    });
    const users = (result.rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      nome: r.nome,
      email: r.email,
      role: r.role,
      must_change_password: !!r.must_change_password,
      created_at: r.created_at,
    }));
    res.status(200).json(users);
  } catch (e) {
    console.error("GET /users error", e);
    res.status(500).json({ error: "Erro interno" });
  }
}

async function postUser(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const nome = typeof b.nome === "string" ? b.nome.trim() : "";
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const senha = typeof b.senha === "string" ? b.senha : "";
    const role = typeof b.role === "string" ? b.role.trim().toLowerCase() : "";

    if (!nome || nome.length < 2) {
      res.status(400).json({ error: "Nome inválido (mínimo 2 caracteres)" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Email inválido" });
      return;
    }
    if (!senha || senha.length < 8) {
      res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
      return;
    }
    const allowedRoles = ["admin", "operador", "visualizador"];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: "Role inválido. Use: admin, operador ou visualizador" });
      return;
    }

    const dupResult = await database.query({
      text: "SELECT id FROM users WHERE email = $1 LIMIT 1",
      values: [email],
    });
    if (dupResult.rows.length) {
      res.status(409).json({ error: "Email já cadastrado" });
      return;
    }

    const hash = await bcrypt.hash(senha, 10);
    const insertResult = await database.query({
      text: `INSERT INTO users (nome, email, senha_hash, role, must_change_password)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id, nome, email, role, must_change_password, created_at`,
      values: [nome, email, hash, role],
    });
    const user = insertResult.rows[0] as Record<string, unknown>;
    res.status(201).json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      must_change_password: !!user.must_change_password,
      created_at: user.created_at,
    });
  } catch (e) {
    console.error("POST /users error", e);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
}

export default handler;
