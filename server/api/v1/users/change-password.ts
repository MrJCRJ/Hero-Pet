import database from "infra/database";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function changePasswordHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const senhaAtual = typeof b.senha_atual === "string" ? b.senha_atual : "";
    const novaSenha = typeof b.nova_senha === "string" ? b.nova_senha : "";
    const confirmar = typeof b.confirmar === "string" ? b.confirmar : "";

    if (!senhaAtual || !novaSenha || !confirmar) {
      res.status(400).json({
        error: "Senha atual, nova senha e confirmação são obrigatórios",
      });
      return;
    }
    if (novaSenha.length < 8) {
      res.status(400).json({
        error: "Nova senha deve ter no mínimo 8 caracteres",
      });
      return;
    }
    if (novaSenha !== confirmar) {
      res.status(400).json({ error: "Nova senha e confirmação não coincidem" });
      return;
    }

    const session = await auth();
    const userId = session?.user
      ? Number((session.user as { id?: string }).id)
      : undefined;
    if (!userId || !Number.isFinite(userId)) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const r = await database.query({
      text: "SELECT senha_hash FROM users WHERE id = $1",
      values: [userId],
    });
    if (!r.rows?.length) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const user = r.rows[0] as { senha_hash: string };
    const valid = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!valid) {
      res.status(400).json({ error: "Senha atual incorreta" });
      return;
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await database.query({
      text: "UPDATE users SET senha_hash = $1, must_change_password = false WHERE id = $2",
      values: [hash, userId],
    });

    res.status(200).json({ success: true, message: "Senha alterada com sucesso" });
  } catch (e) {
    console.error("POST change-password error", e);
    res.status(500).json({ error: "Erro ao alterar senha" });
  }
}
