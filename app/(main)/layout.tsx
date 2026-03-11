import React from "react";
import { MainLayout } from "./MainLayout";

/**
 * Layout para rotas /entities, /products, /orders, /expenses.
 * Fornece autenticação, header e navegação.
 */
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
