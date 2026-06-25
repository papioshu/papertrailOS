# Papertrail OS — Design System

**GEN X SOFT CLUB meets dark SaaS command center.** Source of truth:
`assets/papertrail-os-landing.png`.

## Palette (tokens in `src/app/globals.css`)

| Token            | Hex       | Use                          |
| ---------------- | --------- | ---------------------------- |
| `--color-ink`    | `#0b0814` | base background              |
| `--color-panel`  | `#16102b` | cards                        |
| `--color-line`   | `#2c2350` | borders / hairlines          |
| `--color-violet` | `#8b5cf6` | primary accent / glow        |
| `--color-gold`   | `#c9a227` | Zathena / warnings           |
| `--color-lime`   | `#aef044` | BMBSQD / safe status         |
| `--color-signal` | `#ff4d6d` | errors / stop                |
| `--color-fg`     | `#ece8fb` | text                         |
| `--color-muted`  | `#9a92b8` | secondary text / labels      |

## Per-profile accent

Zathena `#c9a227` (gold) · Papershoots `#b8a4e3` (soft violet) · Caedis
`#5b8def` (blue-violet) · BMBSQD `#aef044` (acid lime). Set per surface via the
`--glow` CSS var (`tt-glow` reads it).

## Building blocks (CSS utilities)

- `.tt-card` — frosted dark panel with hairline border.
- `.tt-scan` — adds a subtle scanline overlay.
- `.tt-glow` — soft outer glow keyed to `--glow`.
- `.tt-label` — transit-signage mono label (uppercase, tracked).

## Motion

Keep it subtle and functional: progress rail, soft glowing status badges,
scan/radar pulses during jobs, ticket slide-in for drafts. Animation must
communicate state, never decorate for its own sake.
