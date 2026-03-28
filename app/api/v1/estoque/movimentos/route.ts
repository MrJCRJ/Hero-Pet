import { withAudit } from "@/lib/api/withAudit";
import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/estoque/movimentos/index";

const base = withPagesHandler(handler);
const isTest = process.env.NODE_ENV === "test";

const withAuth = isTest ? base : withRole(base);
export const GET = withAuth;
export const POST = isTest
  ? base
  : withAudit(withAuth, {
      action: "MOVIMENTO_CREATE",
      entityType: "movimento_estoque",
      getEntityIdFromBody: (b) =>
        typeof (b as { id?: number })?.id === "number"
          ? String((b as { id: number }).id)
          : undefined,
      methods: ["POST"],
    });
