// Seeds the four profiles (identity + settings) and the Paper super-admin
// account. Real per-profile users are added later via admin tools.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROFILES = [
  { slug: "zathena", name: "Zathena Ventures", tagline: "Venture Intelligence System", accent: "#c9a227" },
  { slug: "papershoots", name: "Papershoots", tagline: "Capture. Collect. Connect.", accent: "#b8a4e3" },
  { slug: "caedis", name: "Caedis Aerials", tagline: "Aerial Intelligence System", accent: "#5b8def" },
  { slug: "bombsquad", name: "BMBSQD", tagline: "CREATE OR DIE", accent: "#aef044" },
];

async function main() {
  for (const p of PROFILES) {
    const profile = await prisma.profile.upsert({
      where: { slug: p.slug },
      update: { name: p.name, tagline: p.tagline, accent: p.accent },
      create: p,
    });
    await prisma.businessIdentity.upsert({
      where: { profileId: profile.id },
      update: {},
      create: { profileId: profile.id },
    });
    await prisma.profileSettings.upsert({
      where: { profileId: profile.id },
      update: {},
      create: { profileId: profile.id },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "paper@papertrail.os";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "papertrail-dev";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { isSuperAdmin: true },
    create: { email, name: "Paper", passwordHash, isSuperAdmin: true },
  });

  console.log(`Seeded ${PROFILES.length} profiles.`);
  console.log(`Super admin: ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log('Default password: "papertrail-dev" — set SEED_ADMIN_PASSWORD to override.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
