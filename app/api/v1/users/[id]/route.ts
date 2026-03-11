import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/users/[id]";

const base = withPagesHandler(handler);
const withAdmin = withRole(base, ["admin"]);
export const GET = withAdmin;
export const PUT = withAdmin;
export const DELETE = withAdmin;
