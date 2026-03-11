import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/financeiro/contas-pagar";

export const GET = withRole(withPagesHandler(handler));
