import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  res.status(200).json({ status: "ok" });
}
