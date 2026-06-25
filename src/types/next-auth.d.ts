import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    isSuperAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isSuperAdmin?: boolean;
  }
}
