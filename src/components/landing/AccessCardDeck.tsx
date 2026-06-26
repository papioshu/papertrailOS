"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { PROFILE_LIST, type ProfileSlug } from "@/lib/profiles";
import { accessProfile, type AccessResult } from "@/app/landing-actions";

export function AccessCardDeck() {
  const [active, setActive] = useState<ProfileSlug | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // Outside-click and Escape flip the open card back.
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      if (deckRef.current && !deckRef.current.contains(e.target as Node)) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <div
      ref={deckRef}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {PROFILE_LIST.map((brand) => (
        <AccessCard
          key={brand.slug}
          brand={brand}
          open={active === brand.slug}
          onToggle={() => setActive((cur) => (cur === brand.slug ? null : brand.slug))}
        />
      ))}
    </div>
  );
}

function AccessCard({
  brand,
  open,
  onToggle,
}: {
  brand: (typeof PROFILE_LIST)[number];
  open: boolean;
  onToggle: () => void;
}) {
  const [state, formAction, pending] = useActionState<AccessResult, FormData>(
    accessProfile.bind(null, brand.slug),
    null,
  );

  return (
    <div
      className={`flip aspect-[3/4] ${open ? "is-open" : ""}`}
      style={{ ["--glow" as string]: brand.accent }}
    >
      <div className="flip-inner">
        {/* Front — the access card art */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Open ${brand.name} access pass`}
          className="flip-face tt-glow group block overflow-hidden text-left transition hover:-translate-y-1"
        >
          <Image
            src={brand.card}
            alt={brand.name}
            fill
            sizes="(max-width:640px) 100vw, 25vw"
            className="object-contain"
            priority
          />
          <span className="tt-label absolute bottom-3 left-0 right-0 text-center opacity-0 transition group-hover:opacity-100">
            Tap to sign in
          </span>
        </button>

        {/* Back — the access pass / login */}
        <div className="flip-face flip-back tt-card tt-scan flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="tt-label" style={{ color: brand.accent }}>
                Access Pass
              </span>
              <span className="tt-label">{brand.short}</span>
            </div>
            <div className="tt-display mt-2 text-lg leading-tight">{brand.name}</div>
            <div className="tt-label mt-0.5">{brand.tagline}</div>
          </div>

          <form action={formAction} className="space-y-2">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              className="w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-violet"
            />
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              className="w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-violet"
            />
            {state?.error && <p className="text-[0.7rem] text-signal">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
              style={{ background: brand.accent }}
            >
              {pending ? "Verifying…" : "Enter"}
            </button>
          </form>

          <div className="tt-label flex items-center justify-between border-t border-line pt-2">
            <span>Papertrail OS</span>
            <button type="button" onClick={onToggle} className="hover:text-fg">
              ← back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
