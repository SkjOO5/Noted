# NOTED: MASTER BUILD SPECIFICATION (Capacitor + React Native Android)

> Source of Truth for the Noted app ("Bhoolna mat. Don't forget.")
> Built for DEV Hacktoberfest 2026 Weekend Challenge, theme **"Build for a Friend"**.

---

## 0. Rules of Work

1. Plan first. Show a plan, wait for approval, then build **one phase at a time**.
2. After each phase: typecheck, run tests, build, commit (conventional commit), give a 5-line summary and **stop**.
3. Do not invent. If something is unverified, mark as `[unverified]`, `[estimated]`, or `[measured]`.
4. Never claim a feature works on a device unless actually tested.
5. Ask before adding dependencies not listed here.
6. No `any`. No dead code. Pure logic lives in `lib/` with unit tests, never inside React components.
7. Privacy is a core feature: all user data stays on device by default. Cloud calls are opt-in only and never log bodies.
8. The existing, approved UI layout, theme, and logo must be strictly preserved without regressions.

---

## 1. Product

- **Name:** Noted (Repo: `Noted`).
- **Tagline:** "Bhoolna mat. Don't forget."
- **Target Platform:** Android APK first (`noted.apk`). Web build is a preview for judges and UI checks.
- **Inputs:** Android Share Target intent, paste box, exported chat `.txt`.
- **Hard truths:** WhatsApp has no API to read personal messages. Native scheduled notifications fire when app is closed; web preview cannot fire background notifications or handle Android share intents.

---

## 2. Actual Tech Stack & Commands

| Area | Verified Technology | Details |
|---|---|---|
| **App Framework** | React 18 + Vite + TypeScript (strict) | Bundled into Android native container via Capacitor 8 |
| **Native Runtime** | `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` | Capacitor 8.1.2 |
| **Storage Layer** | Dexie (IndexedDB) | Schema versioning + typed repository layer in `src/db/` (`groupRepo`, `messageRepo`, `eventRepo`, `noteRepo`, `reminderRepo`, `settingsRepo`, `classSlotRepo`) |
| **Date Parsing** | `chrono-node` (en-GB / DD-MM locale) + Hinglish/Devanagari pre-processor | Handles English, Hinglish (`kal 10 baje`, `parso shaam`), Devanagari (`कल सुबह ८ बजे`), DD/MM order |
| **Reminders** | `@capacitor/local-notifications` + hand-crafted RFC 5545 `.ics` with `VALARM` | Native Android scheduled notifications with Snooze/Done actions |
| **Share Intent** | `@capgo/capacitor-share-target` (v8.0.54) | Handles `ACTION_SEND` (text/plain and stream) via Android share sheet |
| **Gestures & UI** | `framer-motion` + Tailwind CSS + `lucide-react` | 150-200ms ease-out swipe right (Calendar), swipe left (Notes), long-press (Remind), Undo toasts |
| **Testing** | Vitest (unit tests) + Playwright (E2E browser tests) | 82 unit tests + 18 E2E tests |
| **Cloud Service** | Python FastAPI on Render | In `/cloud`, endpoints `/health`, `/plan`, opt-in only |
| **ML (Tinker)** | Tinker Python SDK (`tinker`, `tinker-cookbook`) | In `/ml`, fine-tuned student schedule generator |

### Verified Commands
- **Dev server:** `npm run dev`
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`)
- **Unit tests:** `npm run test` (`vitest run`)
- **E2E tests:** `npx playwright test`
- **Web production build:** `npm run build` (`tsc -b && vite build`)
- **Capacitor sync:** `npm run cap:sync` (`cap sync android`)
- **Android APK compile:** `cd android && ./gradlew.bat assembleDebug` -> generates `android/app/build/outputs/apk/debug/app-debug.apk`

### Render Static Site Settings (Web Preview)
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Routing rewrite rule:** `/*` -> `/index.html`
- **Notice label:** "Web preview: native background notifications and system Share-to-app require the Android APK."

### Render Web Service Settings (Cloud Backend)
- **Root directory:** `cloud`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 3. UI / Design System [from SPEC, not measured from Figma]

- **Palette:** Dark default (`bg #0B141A`, `surface #111B21`, `elevated #202C33`, `border #2A3942`, `text #E9EDEF`, `muted #8696A0`, `accent #25D366`).
- **Chips:** Quiz `#FF6B6B`, Assignment `#4ECDC4`, Exam `#FFE66D`, Class change `#A78BFA`, Other `#8696A0`.
- **Typography:** Inter (400 regular, 600 semibold only), 12/14/16/20/24.
- **Layout & Spacing:** 8px grid, 16px screen gutter, 44px minimum touch targets, 12px card radius, 9999px chip radius.
- **Navigation:** 4 bottom tabs (**Messages, Calendar, Notes, Reminders**) + Settings gear in AppBar + Floating Action Button (`+`).

---

## 4. Phase Breakdown & Scope

- **Phases 0–12 (COMPLETED):**
  - Design audit (`DESIGN_NOTES.md`), scaffold, Dexie data repositories, date/message parser (57 fixtures), chat import, UI component library, Messages screen with swipe/undo, Calendar with `.ics` export, Notes with checklist, Reminders with notifications, Share target configuration, debug APK generation, offline study planner with timetable editor, preferences, pure TS validator, greedy planner, PlanReviewSheet modal, FastAPI cloud planner on Render with zero-body privacy, pre-commit secret leak guard, shared JSON validator test cases, 800/100/100 student scenarios, Qwen3-8B LoRA fine-tuning on Thinking Machines Lab (Tinker API), `results.md` benchmark analysis, and hardened `TinkerBackend` with retry, fallback, rate limiting, and app token auth.
- **Phase 13: TabPFN Insights (COULD) / Phase 14: Polish & Open Source Submission (NEXT):**
  - `/insights` endpoint on `reminder_log` numeric features for lead-time optimization.
- **Phase 14: Polish & Open Source Submission:**
  - Signed release APK on GitHub Releases.
  - GitHub topics (`hacktoberfest`), `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
  - Issue templates: `parser-bug.md` and 3-5 `good first issue` templates.
  - Demo GIF and submission-ready documentation.
