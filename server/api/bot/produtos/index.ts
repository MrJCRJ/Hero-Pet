import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotProdutosQuerySchema } from "@/server/api/bot/schemas";
import { isSimplifiedStockEnabled } from "lib/stock/simplified";

function isGranelProduct(nome: string, categoria: string, vendaGranel?: boolean): boolean {
  if (vendaGranel === true) return true;
  const text = `${nome} ${categoria}`.toLowerCase();
  return text.includes("granel");
}

function normalizeCategoria(input: string): "cachorro" | "gato" | "passaro" | "peixe" {
  const c = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!c) return "cachorro";
  if (
    c.includes("cachorro") ||
    c.includes("cao") ||
    c.includes("caes") ||
    c.includes("canin") ||
    c.includes("dog")
  ) {
    return "cachorro";
  }
  if (c.includes("gato") || c.includes("felin") || c.includes("cat")) return "gato";
  if (c.includes("passaro") || c.includes("ave") || c.includes("bird")) return "passaro";
  if (c.includes("peixe") || c.includes("aquar") || c.includes("fish")) return "peixe";
  // Fallback pragmático para catálogo legado (ex.: "RACAO_GRANEL").
  if (c.includes("racao") || c.includes("granel")) return "cachorro";
  return "cachorro";
}

function sanitizeNomeComercial(nome: string): string {
  return String(nome || "")
    .replace(/\b\d+(?:[.,]\d+)?\s?(?:kg|g)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function dedupeByNome(items: Array<{
  id: number;
  nome: string;
  categoria: "cachorro" | "gato" | "passaro" | "peixe";
  ativo: boolean;
  granel: boolean;
  preco_kg: number;
  estoque_kg: number;
  margem_percentual: number;
  is_best_seller: boolean;
}>): Array<{
  id: number;
  nome: string;
  categoria: "cachorro" | "gato" | "passaro" | "peixe";
  ativo: boolean;
  granel: boolean;
  preco_kg: number;
  estoque_kg: number;
  margem_percentual: number;
  is_best_seller: boolean;
}> {
  const map = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    const key = `${item.nome.toLowerCase()}::${item.categoria}`;
    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }
    const existing = map.get(key)!;
    if (item.id < existing.id) map.set(key, item);
  }
  return [...map.values()];
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  const parsed = BotProdutosQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }

  try {
    if (isSimplifiedStockEnabled()) {
      const resultSimple = await database.query({
        text: `WITH vendas_30d AS (
                 SELECT
                   pi.produto_id,
                   COALESCE(SUM(pi.quantidade), 0) AS vendas_kg
                 FROM pedido_itens pi
                 JOIN pedidos p ON p.id = pi.pedido_id
                 WHERE p.tipo = 'VENDA'
                   AND p.status = 'confirmado'
                   AND p.data_emissao >= NOW() - INTERVAL '30 days'
                 GROUP BY pi.produto_id
               ),
               top_sellers AS (
                 SELECT produto_id
                 FROM vendas_30d
                 ORDER BY vendas_kg DESC
                 LIMIT 10
               )
               SELECT
                 p.id,
                 p.nome,
                 p.categoria,
                 p.ativo,
                 COALESCE(p.venda_granel, false) AS venda_granel,
                 COALESCE(p.preco_kg_granel, p.preco_tabela, 0) AS preco_kg,
                 COALESCE(p.estoque_kg, 0) AS estoque_kg,
                 COALESCE(
                   CASE
                     WHEN COALESCE(p.preco_kg_granel, p.preco_tabela, 0) > 0
                       THEN ((COALESCE(p.preco_kg_granel, p.preco_tabela, 0) - COALESCE(p.custo_medio_kg, 0))
                           / COALESCE(p.preco_kg_granel, p.preco_tabela, 0)) * 100
                     ELSE 0
                   END,
                   0
                 ) AS margem_percentual,
                 CASE WHEN ts.produto_id IS NOT NULL THEN true ELSE false END AS is_best_seller
               FROM produtos p
               LEFT JOIN top_sellers ts ON ts.produto_id = p.id
               WHERE p.ativo = true
               ORDER BY p.nome ASC, p.id ASC
               LIMIT 500`,
        values: [],
      });
      const baseProdutos = (resultSimple.rows as Array<Record<string, unknown>>)
        .map((row) => {
          const nomeOriginal = String(row.nome ?? "");
          const categoriaNormalizada = normalizeCategoria(String(row.categoria ?? ""));
          const nomeComercial = sanitizeNomeComercial(nomeOriginal) || nomeOriginal.trim();
          return {
            id: Number(row.id),
            nome: nomeComercial,
            categoria: categoriaNormalizada,
            ativo: Boolean(row.ativo),
            granel: Boolean(row.venda_granel),
            preco_kg: Number(row.preco_kg ?? 0),
            estoque_kg: Number(row.estoque_kg ?? 0),
            margem_percentual: Number(Number(row.margem_percentual ?? 0).toFixed(2)),
            is_best_seller: Boolean(row.is_best_seller),
          };
        })
        .filter((item) => item.ativo && item.preco_kg > 0);

      const includeEstoque = parsed.data.include_estoque !== false;
      const needsGranel = parsed.data.granel !== false;
      let produtos = baseProdutos
        .filter((item) => (includeEstoque ? item.estoque_kg > 0 : true))
        .filter((item) => (needsGranel ? item.granel : true))
        .map((item) => ({
          ...item,
          categoria: item.categoria as "cachorro" | "gato" | "passaro" | "peixe",
        }));

      const categoriaQuery = normalizeCategoria(parsed.data.categoria ?? "");
      if (parsed.data.categoria && categoriaQuery) {
        produtos = produtos.filter((item) => item.categoria === categoriaQuery);
      }
      if (needsGranel && produtos.length === 0) {
        // Fallback: se não houver SKU marcado como granel, expõe catálogo ativo para evitar hard-fail no atendente.
        produtos = baseProdutos
          .filter((item) => (includeEstoque ? item.estoque_kg > 0 : true))
          .map((item) => ({
            ...item,
            categoria: item.categoria as "cachorro" | "gato" | "passaro" | "peixe",
          }));
      }
      produtos = dedupeByNome(produtos);
      res.status(200).json(produtos);
      return;
    }

    const result = await database.query({
      text: `WITH estoque AS (
                SELECT
                  produto_id,
                  COALESCE(SUM(quantidade_disponivel), 0) AS estoque_kg,
                  COALESCE(
                    CASE
                      WHEN SUM(quantidade_disponivel) > 0
                        THEN SUM(quantidade_disponivel * custo_unitario) / SUM(quantidade_disponivel)
                      ELSE 0
                    END,
                    0
                  ) AS custo_medio_kg
                FROM estoque_lote
                GROUP BY produto_id
             ),
             vendas_30d AS (
                SELECT
                  pi.produto_id,
                  COALESCE(SUM(pi.quantidade), 0) AS vendas_kg
                FROM pedido_itens pi
                JOIN pedidos p ON p.id = pi.pedido_id
                WHERE p.tipo = 'VENDA'
                  AND p.status = 'confirmado'
                  AND p.data_emissao >= NOW() - INTERVAL '30 days'
                GROUP BY pi.produto_id
             ),
             top_sellers AS (
                SELECT produto_id
                FROM vendas_30d
                ORDER BY vendas_kg DESC
                LIMIT 10
             )
             SELECT
                p.id,
                p.nome,
                p.categoria,
                p.ativo,
                p.venda_granel,
                COALESCE(p.preco_kg_granel, p.preco_tabela, 0) AS preco_kg,
                COALESCE(e.estoque_kg, 0) AS estoque_kg,
                COALESCE(
                  CASE
                    WHEN COALESCE(p.preco_kg_granel, p.preco_tabela, 0) > 0
                      THEN ((COALESCE(p.preco_kg_granel, p.preco_tabela, 0) - COALESCE(e.custo_medio_kg, 0))
                          / COALESCE(p.preco_kg_granel, p.preco_tabela, 0)) * 100
                    ELSE 0
                  END,
                  0
                ) AS margem_percentual,
                CASE WHEN ts.produto_id IS NOT NULL THEN true ELSE false END AS is_best_seller
             FROM produtos p
             LEFT JOIN estoque e ON e.produto_id = p.id
             LEFT JOIN top_sellers ts ON ts.produto_id = p.id
             WHERE p.ativo = true
             ORDER BY p.nome ASC, p.id ASC
             LIMIT 500`,
      values: [],
    });

    const baseProdutos = (result.rows as Array<Record<string, unknown>>)
      .map((row) => {
        const nomeOriginal = String(row.nome ?? "");
        const categoriaNormalizada = normalizeCategoria(String(row.categoria ?? ""));
        const preco = Number(row.preco_kg ?? 0);
        const nomeComercial = sanitizeNomeComercial(nomeOriginal) || nomeOriginal.trim();
        return {
          id: Number(row.id),
          nome: nomeComercial,
          categoria: categoriaNormalizada,
          ativo: Boolean(row.ativo),
          granel: isGranelProduct(nomeOriginal, String(row.categoria ?? ""), Boolean(row.venda_granel)),
          preco_kg: preco,
          estoque_kg: Number(row.estoque_kg ?? 0),
          margem_percentual: Number(row.margem_percentual ?? 0),
          is_best_seller: Boolean(row.is_best_seller),
        };
      })
      .filter((item) => item.ativo)
      .filter((item) => item.preco_kg > 0)
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        categoria: item.categoria as "cachorro" | "gato" | "passaro" | "peixe",
        ativo: item.ativo,
        granel: item.granel,
        preco_kg: item.preco_kg,
        estoque_kg: item.estoque_kg,
        margem_percentual: Number(item.margem_percentual.toFixed(2)),
        is_best_seller: item.is_best_seller,
      }));

    const includeEstoque = parsed.data.include_estoque !== false;
    const needsGranel = parsed.data.granel !== false;
    let produtos = baseProdutos
      .filter((item) => (includeEstoque ? item.estoque_kg > 0 : true))
      .filter((item) => (needsGranel ? item.granel : true));

    const categoriaQuery = normalizeCategoria(parsed.data.categoria ?? "");
    if (parsed.data.categoria && categoriaQuery) {
      produtos = produtos.filter((item) => item.categoria === categoriaQuery);
    }

    if (needsGranel && produtos.length === 0) {
      // Fallback: se não houver SKU marcado como granel, expõe catálogo ativo para evitar hard-fail no atendente.
      produtos = baseProdutos.filter((item) => (includeEstoque ? item.estoque_kg > 0 : true));
    }

    produtos = dedupeByNome(produtos);

    res.status(200).json(produtos);
  } catch (error) {
    console.error("[bot/produtos] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
