import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/users";

const base = withPagesHandler(handler);
export const GET = withRole(base, ["admin"]);
export const POST = withRole(base, ["admin"]);
