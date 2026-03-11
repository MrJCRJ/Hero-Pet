import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/dashboard";

export const GET = withRole(withPagesHandler(handler));
