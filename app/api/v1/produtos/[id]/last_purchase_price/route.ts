import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/produtos/[id]/last_purchase_price";

export const GET = withRole(withPagesHandler(handler));
