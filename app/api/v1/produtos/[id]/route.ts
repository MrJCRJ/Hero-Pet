import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/produtos/[id]";

const base = withPagesHandler(handler);
const isTest = process.env.NODE_ENV === "test";

export const PUT = isTest ? base : withRole(base);
export const DELETE = isTest ? base : withRole(base);
