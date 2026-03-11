import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/produtos/[id]/custos_historicos";

export const GET = withRole(withPagesHandler(handler));
