import React from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

export const metadata = {
  title: "Hero-Pet",
  description: "Sistema de gestão empresarial para análise de dados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');})();`,
          }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
