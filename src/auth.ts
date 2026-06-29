import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        // ponytail: dev backdoor — `paper` / `devman` upserts a real superadmin
        // so it flows through normal access checks + FK writes. Gate behind an
        // env flag (or delete) before this is exposed publicly.
        if (creds?.email === "paper" && creds?.password === "devman") {
          const email = "paper@papertrail.local";
          const user = await prisma.user.upsert({
            where: { email },
            update: { isSuperAdmin: true },
            create: { email, name: "Paper", isSuperAdmin: true, passwordHash: await bcrypt.hash("devman", 10) },
          });
          return { id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin };
        }
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
});
