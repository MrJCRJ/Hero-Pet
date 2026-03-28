import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/migrations/index";

const base = withPagesHandler(handler);

// Em testes, permite rodar migrações sem auth (usado pelo orchestrator/setup)
const isTest = process.env.NODE_ENV === "test";
export const GET = isTest ? base : withRole(base);
export const POST = isTest ? base : withRole(base, ["admin"]);
