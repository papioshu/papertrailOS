import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no DB / node deps). Shared by middleware and the full
// auth instance. Providers are attached in src/auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Route protection for middleware: everything except /login requires auth.
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      if (path === "/login") return true;
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
