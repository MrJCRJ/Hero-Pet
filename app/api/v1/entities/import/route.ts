import { withRole } from "@/lib/api/withRole";
import { importEntitiesFromCsv } from "@/server/api/v1/entities/importCsv";

async function importHandler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: `Method ${request.method} not allowed` },
      { status: 405 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "Envie um arquivo CSV (campo 'file')" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const buf = Buffer.from(text, "utf-8");
  const csvContent = buf.toString("utf-8");

  try {
    const result = await importEntitiesFromCsv(csvContent);
    return Response.json(result);
  } catch (e) {
    console.error("Import entities error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Erro ao importar" },
      { status: 500 }
    );
  }
}

export const POST = withRole(importHandler);
