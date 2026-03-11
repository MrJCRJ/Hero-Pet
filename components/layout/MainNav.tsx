"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Package, ShoppingCart, BarChart3, FileText, Banknote, HelpCircle, UserCog } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/entities", label: "Cliente / Fornecedor", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", icon: Banknote },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

const baseLinkClass =
  "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 px-4 py-2.5 text-sm";

/**
 * Navegação principal do App Router.
 * Usa Link do Next.js para navegação client-side.
 */
export function MainNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const items = [
    ...navItems,
    ...(isAdmin ? [{ href: "/admin/usuarios", label: "Usuários", icon: UserCog }] : []),
  ];

  return (
    <nav
      className="flex gap-2 flex-wrap"
      role="navigation"
      aria-label="Menu principal"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || (pathname != null && pathname.startsWith(href + "/"));
        const variantClass = isActive
          ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-md"
          : "border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]/50";
        return (
          <Link
            key={href}
            href={href}
            className={`${baseLinkClass} ${variantClass}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
