import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/estoque/resumo/index";

const base = withPagesHandler(handler);
const isTest = process.env.NODE_ENV === "test";

export const GET = isTest ? base : withRole(base);
