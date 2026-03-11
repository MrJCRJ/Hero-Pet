import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const { default: database } = await import("infra/database.js");
        const bcrypt = (await import("bcryptjs")).default;

        const result = await database.query({
          text: "SELECT id, nome, email, senha_hash, role, must_change_password FROM users WHERE email = $1",
          values: [email],
        });
        if (!result.rows?.length) return null;
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.senha_hash);
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.nome,
          email: user.email,
          role: user.role,
          must_change_password: !!user.must_change_password,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
  },
});
