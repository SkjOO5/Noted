# DESIGN_NOTES — WhatsAppText U0
**Source**: Contra Wireframe Kit (Figma node 184-1880). No Figma API/inspect access.
No /design PNGs present. **All tokens are [estimated]** from 7% screenshot + CLAUDE.md.
→ Accept estimates, OR drop frame PNGs into `/design` and I re-audit before U1.

## (a) Screen Inventory
| Figma frame → App screen | Anatomy taken |
|---|---|
| Chat Listing → **Messages List** | Search pill, avatar+name+preview+time+badge rows |
| Chat Detail → **Chat View** | Bubble rows, bottom input bar |
| To-do list → **Notes List/Detail** | Checkbox rows → note cards + checklist |
| Alarm/clock → **Reminders List** | Time card → reminder card (time+label+status) |
| Settings list/toggles → **Settings** | Section headers, nav rows, toggle rows |
| Splash/Onboarding → **Permissions** | Full-screen card, title+body+CTA |
| **Ignored**: Login, Sign Up, OTP, Shop, Map, Pricing, Blog |

## (b) Tokens (all [estimated]) — see `src/styles/tokens.css`
Colors: bg `#0B141A`, surface `#111B21`, elevated `#202C33`, border `#2A3942`, accent `#25D366`.
Type: Inter 12/14/16/20/24 (400+600). Spacing: 8px grid (4–64px). Borders: 1px.
Radii: card 12, button 10, chip 9999, sheet 20, input 10. Motion: 150/200ms ease-out.
Layout: AppBar 56px, TabBar 60px, gutter 16px, max-w 480px, touch-min 44px, icon 20px/1.75.

## (c) Component Map (Figma → React)
`MessageListRow`, `SearchBar`, `SettingsSectionHeader`, `SettingsNavRow`,
`SettingsToggleRow`, `NoteListRow`, `ReminderCard`, `BottomSheet` (restyle),
`Chip` (restyle), `Button` (primary/ghost/danger), `IconButton`, `AppBar`,
`TabBar` (4 tabs: Messages·Calendar·Notes·Reminders), `FAB`, `EmptyState`.

## (d) Gaps (not in kit — built in same visual language)
- **Month calendar**: 7-col grid, 40×40 day cells, accent dot, card anatomy
- **Event edit sheet**: Bottom sheet, labeled inputs, date row, save CTA
- **Import sheet**: Bottom sheet, paste input, type chip, confirm/cancel
- **Ambiguity picker**: Bottom sheet, radio-style list rows
- **Empty/error states**: Muted 1-line text + 1 accent action, no illustration

## (e) Nav: 4 bottom tabs (Messages·Calendar·Notes·Reminders). Settings = gear in AppBar.
## (f) Swipe: right=Calendar, left=Notes. Delete=overflow menu+Undo. Remind=long-press.
## (g) Boot: LocalNotificationRestoreReceiver handles BOOT_COMPLETED. Verify in U7.
## (h) Share plugin: recommend `@capgo/capacitor-share-target` (v8.0.54, peer ≥8.0.0). Awaiting OK.