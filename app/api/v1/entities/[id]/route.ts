import { withAudit } from "@/lib/api/withAudit";
import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/entities/[id]";

const base = withPagesHandler(handler);
const withAuth = withRole(base);
const getEntityId = (req: Request) => req.url.match(/\/entities\/(\d+)/)?.[1];
export const GET = withAuth;
export const PUT = withAuth;
export const DELETE = withAudit(withAuth, {
  action: "ENTITY_DELETE",
  entityType: "entity",
  getEntityId,
  methods: ["DELETE"],
});
