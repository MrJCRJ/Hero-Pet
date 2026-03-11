import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/produtos/top";

export const GET = withRole(withPagesHandler(handler));
