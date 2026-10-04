# DESIGN_NOTES — Notes (Phase 0)
**Source**: Contra Wireframe Kit (Figma node 184-1880). No Figma inspect access.
**Tokens**: All design tokens are [from SPEC, not measured from Figma].
**Status**: Tokens and UI locked and approved per user instruction.

## (a) Screen Inventory
| Figma frame → App screen | Anatomy taken |
|---|---|
| Chat Listing → **Messages List** | Search pill, avatar+name+preview+time rows |
| Chat Detail → **Chat View** | Bubble rows, bottom input bar |
| To-do list → **Notes (Saved)** | Note cards with interactive checklist |
| Alarm/clock → **Reminders** | Scheduled reminder cards with snooze / done |
| Settings list/toggles → **Settings** | Section headers, nav rows, privacy toggles |
| Splash/Onboarding → **Permissions** | Full-screen card, title + body + CTA |
| **Ignored**: Login, Sign Up, OTP, Shop, Map, Pricing, Blog |

## (b) Design Tokens [from SPEC, not measured from Figma]
Colors: bg `#0B141A`, surface `#111B21`, elevated `#202C33`, border `#2A3942`, text `#E9EDEF`, muted `#8696A0`, accent `#25D366`.
Event chips: Quiz `#FF6B6B`, Assignment `#4ECDC4`, Exam `#FFE66D`, Class change `#A78BFA`, Other `#8696A0`.
Type: Inter (400, 600 only); sizes 12/14/16/20/24; sentence-case.
Spacing & Grid: 8px grid (8, 16, 24, 32), horizontal gutter 16px. Touch targets ≥ 44px.
Radii: card 12, button 10, chip 9999, sheet 20. Motion: 150–200ms ease-out.

## (c) Component Map (Wireframe Kit → React)
`GroupList`, `ChatView`, `EventCard`, `NoteCard`, `ReminderCard`, `BottomSheet`,
`Chip`, `SearchBar`, `Button`, `IconButton`, `AppBar`, `TabBar` (4 tabs), `EmptyState`.

## (d) Gaps & Extensions (Maintained in Same Language)
- **Month Calendar & Agenda**: 7-col grid, 40×40 cells with colored event dots.
- **Import / Confirm Sheet**: Bottom sheet with type chip, date picker, action buttons.
- **Empty / Error States**: 1-line muted text + 1 primary accent button (`+ Paste chat`).

## (e) Interaction Rules
- 4 bottom tabs: Messages · Calendar · Notes (Saved) · Reminders. Settings = gear in AppBar.
- Swipe gestures: Right → Calendar, Left → Notes, Long-press → Reminders. Visible menu fallback + Undo.
- Native: `@capacitor/local-notifications`, `@capgo/capacitor-share-target`, ICS export with `VALARM`.