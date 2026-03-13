import type { NextAuthConfig } from "next-auth";

/**
 * Configuração Edge-compatível para middleware.
 * Não inclui Credentials (usa DB). Providers vazios para middleware.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.must_change_password = (user as { must_change_password?: boolean })
          .must_change_password;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { must_change_password?: boolean }).must_change_password =
          !!token.must_change_password;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isSetupPage = nextUrl.pathname === "/setup";
      const isAlterarSenhaPage = nextUrl.pathname === "/alterar-senha";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isApi = nextUrl.pathname.startsWith("/api/");

      if (isApiAuth || isApi) return true;
      if (isSetupPage) return true;
      if (isAuthPage)
        return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      if (isLoggedIn) {
        const role = (auth.user as { role?: string })?.role;
        if (nextUrl.pathname.startsWith("/admin") && role !== "admin") {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[auth] Redirecionamento /admin: role=%s, path=%s", role ?? "(ausente)", nextUrl.pathname);
          }
          const loginUrl = new URL("/login", nextUrl);
          loginUrl.searchParams.set("error", "role_missing");
          loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
          return Response.redirect(loginUrl);
        }
        const mustChange = (auth.user as { must_change_password?: boolean })
          ?.must_change_password;
        if (mustChange && !isAlterarSenhaPage) {
          return Response.redirect(new URL("/alterar-senha", nextUrl));
        }
        return true;
      }
      return false;
    },
  },
  pages: {
    signIn: "/login",
  },
};
