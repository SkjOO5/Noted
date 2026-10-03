---
title: "WhatsAppText: An Offline-First PWA Turning College WhatsApp Chaos into Calendar Events & Study Checklists"
published: false
description: "How I built an offline-first companion PWA with bilingual Hinglish NLP, Dexie IndexedDB, and swipe gestures to help a friend stop missing surprise quizzes and lab vivas."
tags: "webdev, react, typescript, pwa, hacktoberfest"
cover_image: ""
canonical_url: ""
---

## 🎯 The Inspiration: Building for My Friend Rahul

Every semester, my college friend Rahul finds himself in the exact same panic. 

Our university professors, Class Representatives (CRs), and club leads don't post schedules on a clean LMS dashboard. Instead, critical academic updates are dropped casually into hyperactive WhatsApp groups:

> *"CR alert: Mid-term date sheet out! DBMS exam on 22nd Oct 2:00 PM Room 204."*  
> *"Bhai kal 11 baje DBMS ka surprise quiz hai sir ne class mein bola tha."*  
> *"Parso 3 baje Computer Networks lab practical in Lab 3. Bring signed manuals."*

By the time Rahul checks his phone in the evening, those vital notices are buried under 300+ memes, assignment requests, and casual chatter. Last semester, he showed up to college without his lab manual for a surprise viva.

I decided to build **WhatsAppText**: an installable, offline-first companion PWA that takes raw, messy college WhatsApp messages (including Hinglish) and turns them into **calendar events, study notes, and smart reminders with a single swipe**.

---

## 🌟 What WhatsAppText Does

WhatsAppText is designed to feel like an extension of WhatsApp itself, adopting its sleek dark theme, minimalist typography, and rapid gesture flows:

1. **📥 Zero-Friction Input**:
   - **Web Share Target API**: Tap "Share" on any WhatsApp message on Android/iOS and choose WhatsAppText.
   - **Smart Paste**: Paste single notices or entire announcement threads.
   - **Exported `.txt` Import**: Upload an official WhatsApp chat export file to extract history.
2. **🇮🇳 Bilingual Hinglish NLP Parser**:
   - Understands colloquial Hindi/Hinglish expressions like `kal` (tomorrow), `parso` (day after tomorrow), `subah 10 baje` (10:00 AM), `shaam ko` (in the evening), and `tarikh tak` (deadline until).
3. **👆 Single-Swipe Event & Note Extraction**:
   - Swipe right to schedule a calendar event.
   - Swipe left to turn a multi-topic syllabus announcement into a dynamic interactive study checklist.
4. **📅 Academic Calendar & RFC 5545 `.ics` Export**:
   - Filter by quizzes, exams, assignments, or deadlines.
   - One-tap export to Google Calendar, Apple Calendar, and Outlook.
5. **⏰ Smart Reminders with Night Quiet Hours**:
   - Browser push notifications that automatically mute during overnight quiet hours (e.g. 10 PM to 7 AM) so students aren't woken up by alerts.
6. **🔒 100% Privacy & Data Sovereignty**:
   - **No servers, no tracking, no backend database.** Everything lives inside the browser's IndexedDB via Dexie.js.

---

## 🛠️ The Tech Stack

- **Frontend**: React 18 + Vite + TypeScript (Strict mode)
- **Styling & Tokens**: Tailwind CSS v4 + custom CSS design tokens matching WhatsApp's exact dark palette (`#0B141A` background, `#111B21` surface, `#25D366` green accent).
- **Client Storage**: [Dexie.js](https://dexie.org/) (Reactive IndexedDB wrapper with custom `useLiveQuery` hooks).
- **NLP & Parsing**: Custom Hinglish Normalizer + [Chrono-node](https://github.com/wanasit/chrono-node).
- **PWA & Offline**: `vite-plugin-pwa` with Service Workers & Web Share Target registration.
- **Gestures**: `framer-motion` for physics-based swipe actions.
- **Testing**: Vitest (82 unit tests) + Playwright for E2E flows.

---

## 🧠 Deep Dive: Solving the Hinglish Date Parsing Challenge

In Indian colleges, dates are rarely written as `2026-10-15 10:00:00`. They look like:
- *"Bhai kal subah 9 baje library mein milte hain"*
- *"Parso shaam 5 baje assignment submission deadline hai"*
- *"DBMS quiz on 22nd Oct 2:00 PM in Room 204"*

Standard English NLP libraries like `chrono-node` struggle with colloquial Hindi vocabulary. To solve this without relying on heavy cloud LLMs (which would destroy user privacy and require internet connectivity), I built a two-stage lightweight pipeline:

### 1. Hinglish Pre-Processor & Normalizer (`hinglishNormalizer.ts`)
Converts Hindi temporal terms, time slots, and Devanagari numerals into standardized English anchors:
- `kal` -> `tomorrow`
- `parso` -> `day after tomorrow`
- `aaj` -> `today`
- `subah 10 baje` -> `10:00 AM`
- `dopahar 2 baje` -> `2:00 PM`
- `shaam 6 baje` -> `6:00 PM`
- `raat 11 baje` -> `11:00 PM`
- `१२३` -> `123`

```typescript
export function normalizeHinglish(text: string): string {
  let normalized = convertDevanagari(text);

  // Normalize Hindi relative days
  normalized = normalized
    .replace(/\b(aaj|aaj\s+ko)\b/gi, 'today')
    .replace(/\b(kal|kal\s+ko)\b/gi, 'tomorrow')
    .replace(/\b(parso|parson)\b/gi, 'day after tomorrow');

  // Normalize Hindi times of day + 'baje' (o'clock)
  normalized = normalized.replace(/\b(subah|subha)\s+(\d{1,2})(?::(\d{2}))?\s*(?:baje)?\b/gi, '$2:$3 AM');
  normalized = normalized.replace(/\b(dopahar|dophar)\s+(\d{1,2})(?::(\d{2}))?\s*(?:baje)?\b/gi, '$2:$3 PM');
  normalized = normalized.replace(/\b(shaam|sham)\s+(\d{1,2})(?::(\d{2}))?\s*(?:baje)?\b/gi, '$2:$3 PM');
  normalized = normalized.replace(/\b(raat|rat)\s+(\d{1,2})(?::(\d{2}))?\s*(?:baje)?\b/gi, '$2:$3 PM');

  return normalized;
}
```

### 2. Message Classifier & Academic Category Extractor (`messageClassifier.ts`)
Categorizes messages into `quiz`, `exam`, `assignment`, `deadline`, `holiday`, or `room-change`, while automatically tagging subjects (`DBMS`, `Computer Networks`, `OS`, `DSA`, `Maths`):

```typescript
export function classifyMessage(text: string): MessageClassification {
  const norm = normalizeHinglish(text);
  const lower = norm.toLowerCase();
  
  let type: MsgType = 'general';
  if (/\b(quiz|surprise\s+test|mcq)\b/i.test(lower)) type = 'quiz';
  else if (/\b(exam|mid-?term|end-?term|viva|practical)\b/i.test(lower)) type = 'exam';
  else if (/\b(assignment|homework|synopsis)\b/i.test(lower)) type = 'assignment';
  else if (/\b(deadline|due\s+date|last\s+date|submission)\b/i.test(lower)) type = 'deadline';
  
  return {
    type,
    subject: extractSubject(text),
    isImportant: type !== 'general' || lower.includes('notice') || lower.includes('urgent'),
  };
}
```

---

## ⚡ Dynamic Syllabus Checklists from Messages

When a professor sends a long syllabus message:

> *"Quiz syllabus: ER modeling, Relational Algebra, SQL queries (JOINs, GROUP BY), Normalization up to BCNF."*

Tapping the **Checklist** action doesn't just create a plain text note. It tokenizes the syllabus string by commas, newlines, and bullet points into an interactive checklist with real-time completion percentages!

---

## 🛡️ Privacy First: Zero Server Footprint

College WhatsApp chats often contain personal phone numbers, names, and student IDs. 

WhatsAppText enforces **strict client-side isolation**:
- All data is saved directly in browser **IndexedDB** using Dexie.js.
- No analytics trackers, no telemetry, and no third-party CDN scripts.
- Users can export full backups (`.json`), import them across devices, or wipe all local data with a single click.

---

## 🚀 Try It Out

- **GitHub Repository**: [https://github.com/yourusername/whatsapptext](https://github.com/yourusername/whatsapptext)
- **Live PWA**: Installable on any Android, iOS, or desktop browser.

If you have friends who are constantly missing assignment deadlines or showing up unprepared for college quizzes, give WhatsAppText a try! 🎓
