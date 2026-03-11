import database from "infra/database";
import bcrypt from "bcryptjs";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

async function setupCreateHandler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method === "GET") {
    const r = await database.query({
      text: "SELECT COUNT(*)::int AS total FROM users",
      values: [],
    });
    const total = (r.rows[0] as { total: number })?.total ?? 0;
    res.status(200).json({ setupNeeded: total === 0 });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }
  try {
    const countResult = await database.query({
      text: "SELECT COUNT(*)::int AS total FROM users",
      values: [],
    });
    const total = (countResult.rows[0] as { total: number })?.total ?? 0;
    if (total > 0) {
      res.status(400).json({ error: "Sistema já configurado. Use a tela de login." });
      return;
    }
    const b = (req.body || {}) as Record<string, unknown>;
    const nome = typeof b.nome === "string" ? b.nome.trim() : "";
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const senha = typeof b.senha === "string" ? b.senha : "";
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
    const hash = await bcrypt.hash(senha, 10);
    await database.query({
      text: `INSERT INTO users (nome, email, senha_hash, role)
             VALUES ($1, $2, $3, 'admin')`,
      values: [nome, email, hash],
    });
    res.status(201).json({ success: true, message: "Administrador criado. Faça login." });
  } catch (e) {
    console.error("POST /api/v1/setup error", e);
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505" || err.constraint?.includes("unique")) {
      res.status(400).json({ error: "Email já cadastrado" });
      return;
    }
    res.status(500).json({ error: "Erro ao criar administrador" });
  }
}

export default setupCreateHandler;
