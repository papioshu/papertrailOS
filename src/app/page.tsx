import { AccessCardDeck } from "@/components/landing/AccessCardDeck";

// Public front door. Soft-club backdrop + the four profile access cards;
// each card flips to an access pass. No forced redirect to a login screen.
export default function Landing() {
  return (
    <main className="tt-backdrop min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        {/* Masthead / system status strip */}
        <header className="flex items-center justify-between border-b border-line/60 pb-4">
          <div>
            <div className="tt-display text-sm tracking-[0.3em]">Papertrail OS</div>
            <div className="tt-label">Track · Connect · Remember</div>
          </div>
          <div className="tt-label flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" />
            System status · Online
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 max-w-2xl">
            <div className="tt-label" style={{ color: "var(--color-violet-soft)" }}>
              Lead Signal Command
            </div>
            <h1 className="tt-display mt-2 text-4xl leading-[1.05] sm:text-5xl">
              Choose your access card
            </h1>
            <p className="mt-3 text-sm text-muted">
              Profile-based lead research, grading, and controlled outreach. Pick a
              profile to sign in.
            </p>
          </div>
          <AccessCardDeck />
        </section>

        {/* Footer nav strip */}
        <footer className="tt-label flex items-center justify-between border-t border-line/60 pt-4">
          <span>Papertrail OS · v0.1.0</span>
          <span className="flex gap-5">
            <span>Zathena</span>
            <span>Papershoots</span>
            <span>Caedis</span>
            <span>BMBSQD</span>
          </span>
        </footer>
      </div>
    </main>
  );
}
