import { withAudit } from "@/lib/api/withAudit";
import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/despesas/[id]";

const base = withPagesHandler(handler);
const withAuth = withRole(base);
const getDespesaId = (req: Request) => req.url.match(/\/despesas\/(\d+)/)?.[1];
export const GET = withAuth;
export const PUT = withAuth;
export const DELETE = withAudit(withAuth, {
  action: "DESPESA_DELETE",
  entityType: "despesa",
  getEntityId: getDespesaId,
  methods: ["DELETE"],
});
