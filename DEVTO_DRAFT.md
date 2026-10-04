---
title: "Noted: The 100% Offline Android App Turning College WhatsApp Chaos into Calendar Events & Study Plans"
published: false
description: "How I built an offline-first Android app with bilingual Hinglish NLP, an intelligent 7-day study planner, and swipe gestures to help a friend stop missing surprise college quizzes and lab vivas."
tags: "android, react, typescript, machinelearning, hacktoberfest"
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

I decided to build **Noted**: an installable, 100% offline-first Android companion app that takes raw, messy college WhatsApp messages (including Hinglish) and turns them into **calendar events, interactive study checklists, smart reminders, and 7-day study timetables with a single swipe**.

---

## 🌟 What Noted Does

Noted is designed to feel like a native extension of WhatsApp itself, adopting its sleek dark theme (`#0B141A`), emerald accents (`#25D366`), minimalist typography, and rapid gesture flows:

1. **📥 Zero-Friction Input**:
   - **Android Share Sheet**: Tap "Share" on any WhatsApp message on Android and choose **Noted**.
   - **Smart Paste**: Paste single notices or entire announcement threads.
   - **Exported `.txt` Import**: Upload an official WhatsApp chat export file to batch import semester notices.
2. **🇮🇳 Bilingual Hinglish NLP Parser**:
   - Understands colloquial Hindi/Hinglish expressions like `kal` (tomorrow), `parso` (day after tomorrow), `subah 10 baje` (10:00 AM), `shaam ko` (in the evening), and `tarikh tak` (deadline until).
   - Resolves Devanagari numerals (`कल सुबह ८ बजे`) and ambiguous DD/MM dates with interactive confirmation.
3. **👆 Single-Swipe Event & Note Extraction**:
   - **Swipe right** to schedule a calendar event with RFC 5545 `.ics` export.
   - **Swipe left** to turn a multi-topic syllabus announcement into an interactive checklist you can tick off as you study.
   - **Long press** to set scheduled local notifications with snooze (+15m, +1h, +1d).
4. **🧠 Intelligent 7-Day Study Planner**:
   - Generates personalized study and revision plans around existing class timetables.
   - Enforces 8 hard constraints: rest buffers, max 4h study caps/day, subject difficulty weighting, and spaced review pacing.
   - **0.21 millisecond execution**: Runs 100% offline right on the student's phone without requiring internet.
5. **🔒 100% Privacy & Data Sovereignty**:
   - **No accounts, no telemetry, no tracking, and no external servers required.** All data lives in local storage on the phone.

---

## 🛠️ The Tech Stack

- **Mobile Framework**: Capacitor 6 (native Android runtime) + React 18 + TypeScript (Strict mode)
- **Styling**: Curated WhatsApp dark palette tokens (`#0B141A` background, `#111B21` surface, `#25D366` green accent, Inter typography).
- **Client Storage**: Dexie.js (Reactive IndexedDB) with full JSON backup & restore.
- **NLP & Parsing**: Custom Hinglish Normalizer + Chrono-node engine with 57 bilingual test fixtures.
- **Gestures**: Framer Motion for physics-based swipe actions with instant undo.
- **Testing**: Vitest (95+ unit tests) + Playwright for E2E flows + automated secret leak guards.

---

## 🧠 Deep Dive: The Hinglish Date Parsing Pipeline

In Indian colleges, notices are almost never written in formal ISO formats. They look like:
- *"Bhai kal subah 9 baje library mein milte hain"*
- *"Parso shaam 5 baje assignment submission deadline hai"*
- *"DBMS quiz on 22nd Oct 2:00 PM in Room 204"*

To solve this completely offline without relying on heavy cloud APIs, Noted uses a lightweight, two-stage pipeline:

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

---

## 🔬 The Machine Learning Experiment: Tinker LoRA vs. Offline Greedy

As part of testing advanced study plan generation, I explored fine-tuning an open-source LLM (Qwen) using **Thinking Machines Lab (Tinker API)** to see if a neural model could beat an algorithmic greedy planner.

### Benchmark Setup
- **Dataset**: 800 training, 100 validation, and 100 strictly held-out student scenarios with varying exam loads and class timetables.
- **Training**: LoRA fine-tuning on Tinker API (49 steps, loss decreased from 0.0619 &rarr; 0.0033).
- **Evaluation Criteria**: Plan validity rate (satisfying all 8 hard constraints), slot adherence, and latency.

### The Results

| Model / Approach | Valid Plan Rate | Avg Latency | Deployment Requirement |
| :--- | :---: | :---: | :--- |
| **Base Qwen 8B (Zero-Shot)** | 17.0% | ~1,200 ms | Cloud GPU / Internet |
| **Fine-Tuned LoRA (Tinker)** | 21.0% | ~1,200 ms | Cloud GPU / Internet |
| **Noted Offline Greedy Planner** | **94.0%** | **0.21 ms** | **100% Offline on Phone** |

### The Engineering Takeaway
While LLMs are fantastic for unstructured text parsing, **strict constraint satisfaction and schedule generation are far better served by specialized greedy algorithms**. Noted ships with the offline greedy planner as its core engine — delivering near-instant (0.21ms) valid study schedules directly on the student's phone with zero cloud dependencies and absolute privacy!

---

## 📲 Download & Try Noted

- **GitHub Repository**: [https://github.com/SkjOO5/Noted](https://github.com/SkjOO5/Noted)
- **Direct Android APK Download**: [https://github.com/SkjOO5/Noted/releases/latest](https://github.com/SkjOO5/Noted/releases/latest)

If you have friends who are constantly missing assignment deadlines or showing up unprepared for college quizzes, download the APK or star the repo on GitHub! 💚
