"use client";

import { ProductsManager } from "@/components/products";
import { PageSection } from "@/components/layout/PageSection";

/**
 * Página de gestão de Produtos.
 * Rota: /products
 */
export function ProductsPage() {
  return (
    <PageSection
      title="Produtos"
      description="Gerencie o catálogo de produtos"
    >
      <ProductsManager />
    </PageSection>
  );
}
