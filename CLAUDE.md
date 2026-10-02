# WhatsAppText

A WhatsApp-style companion PWA for college students. It turns messy college
WhatsApp messages (Hinglish included) into calendar events, notes and
reminders with a single swipe. Built for the DEV Hacktoberfest "Build for a
Friend" challenge. Target user: a busy student who keeps missing quiz dates.

## Stack (do not change without asking)
- React 18 + Vite + TypeScript (strict)
- Tailwind CSS, no other UI library
- Dexie (IndexedDB) for storage, no backend, no accounts
- chrono-node + custom Hinglish pre-processor for date parsing
- vite-plugin-pwa (service worker, manifest, share_target)
- Vitest for unit tests, Playwright for one e2e flow
- framer-motion ONLY for swipe gestures

## Commands
- `npm run dev` : dev server
- `npm run build` : production build (must pass before every commit)
- `npm run typecheck` : tsc --noEmit
- `npm run test` : vitest run
- `npm run e2e` : playwright test

## Structure
src/
  db/          Dexie schema + repositories (no DB calls inside components)
  lib/parser/  date parser, Hinglish normalizer, message classifier (pure TS)
  lib/chat/    WhatsApp chat text/export parsing
  lib/remind/  reminder scheduling
  features/    messages/ calendar/ notes/ reminders/ settings/
  components/  shared UI primitives
  styles/      tokens.css

## Rules
- Pure logic (parser, classifier, scheduler) lives in lib/ with unit tests.
  Never put parsing logic inside React components.
- WhatsApp has NO official API for reading personal messages. Never fake it.
  Supported inputs only: Web Share Target, paste box, exported .txt import.
- Privacy: all data stays on device. No analytics, no network calls except
  loading the app itself.
- Never silently guess ambiguous dates; show a confirm sheet.
- Every destructive or swipe action shows a toast with Undo.
- Small functions, no `any`, no dead code, no TODO left behind.
- After each task: run typecheck, test, build. Fix failures before moving on.
- Commit after each completed phase with a conventional commit message.
- Ask before adding any new dependency.

## Design system (simple and elegant)
- Dark by default, light theme supported via CSS variables in tokens.css.
- Colors: bg #0B141A, surface #111B21, elevated #202C33, border #2A3942,
  text #E9EDEF, muted #8696A0, accent #25D366 (accent only for primary
  actions and active states).
- One font: Inter. Sizes: 12 / 14 / 16 / 20. Weights: 400 and 600 only.
- 8px spacing grid. Radius 12px for cards, 999px for chips.
- No gradients, no heavy shadows, no emojis in UI chrome. Thin 1px borders.
- Icons: lucide-react, 20px, stroke 1.75.
- Touch targets >= 44px. Max content width 480px, centered on desktop.
- Motion: 150-200ms ease-out only; respect prefers-reduced-motion.
- Every screen needs a calm empty state: one line of text + one action.