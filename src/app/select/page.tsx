import Image from "next/image";
import Link from "next/link";
import { getAccessibleProfiles } from "@/lib/access";
import { PROFILES } from "@/lib/profiles";
import { signOutAction } from "@/app/actions";
import { AutoAnimate } from "@/components/AutoAnimate";

export default async function SelectPage() {
  const accessible = await getAccessibleProfiles();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="tt-label">Papertrail OS · Profile Selector</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Choose a profile
          </h1>
        </div>
        <form action={signOutAction}>
          <button className="tt-label rounded-md border border-line px-3 py-1.5 hover:border-violet">
            Sign out
          </button>
        </form>
      </header>

      {accessible === null ? (
        <SetupNotice />
      ) : accessible.length === 0 ? (
        <p className="text-sm text-muted">
          Your account has no profile access yet. Ask a super admin to add a
          membership.
        </p>
      ) : (
        <AutoAnimate className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {accessible.map(({ slug, role }) => {
            const brand = PROFILES[slug];
            return (
              <Link
                key={slug}
                href={`/p/${slug}`}
                className="group tt-card tt-scan overflow-hidden transition hover:-translate-y-0.5"
                style={{ ["--glow" as string]: brand.accent }}
              >
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src={brand.card}
                    alt={brand.name}
                    fill
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="object-contain p-2 opacity-90 transition group-hover:opacity-100"
                  />
                </div>
                <div className="p-4">
                  <div className="tt-label" style={{ color: brand.accent }}>
                    {brand.tagline}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{brand.name}</div>
                  <div className="mt-2 inline-block rounded border border-line px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-muted">
                    {role.replace("_", " ")}
                  </div>
                </div>
              </Link>
            );
          })}
        </AutoAnimate>
      )}
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="tt-card p-6">
      <div className="tt-label text-gold">Setup required</div>
      <p className="mt-2 text-sm text-muted">
        Cannot reach the database. Set <code className="text-fg">DATABASE_URL</code>{" "}
        and <code className="text-fg">DIRECT_URL</code> in <code>.env</code>, then
        run <code className="text-fg">npm run db:migrate</code> and{" "}
        <code className="text-fg">npm run db:seed</code>. See README.
      </p>
    </div>
  );
}
