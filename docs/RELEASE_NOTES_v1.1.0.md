# Noted v1.1.0 — Offline Study Planner & Community Release 🎓📱

Turn messy college WhatsApp messages into calendar events, notes, reminders, and optimized study plans — with one swipe. **100% Offline & Private.**

---

### ✨ What's New in v1.1.0

#### 1. 🧠 Intelligent Offline Study Planner
- **Greedy Scheduler Engine**: Generates complete 7-day revision plans directly on your device in **0.21 milliseconds** with zero internet connection required.
- **8 Hard Scheduling Constraints**:
  - Automatically respects existing classes, busy hours, and subject difficulty weights.
  - Enforces mandatory rest buffers, study time caps (max 4h/day), and daily review pacing.
  - Guaranteed 100% student privacy — your syllabus, dates, and timetable never leave your phone.
- **Interactive Plan Review Sheet**: Preview generated sessions, adjust slot times, or regenerate with a single tap before committing to your calendar.

#### 2. 🔬 Thinking Machines Tinker ML Experiment
- Includes the full LoRA fine-tuning pipeline and benchmark results comparing base LLMs against our ultra-fast offline greedy solver (`ml/results.md`).

#### 3. 🎃 Hacktoberfest & Open Source Polish
- Added standard **MIT License**, **Code of Conduct**, **Contributing Guidelines**, and **GitHub Issue Templates**.
- Added automated GitHub Actions CI pipeline testing all 95+ unit tests, TypeScript types, and pre-commit secret leak prevention.

---

### 📲 Download & Install Android APK

1. Download **`Noted-v1.1.0.apk`** from the Assets below.
2. Open the downloaded file on your Android phone.
3. Tap **Install** (if prompted by Android, enable *"Install from this source"*).
4. Enjoy a distraction-free, 100% offline study companion!

---

### 💡 Core Features Recap
- **Natural Date & Time Extraction**: Understands English, Hinglish (`kal 10 baje DBMS quiz`, `parso shaam`), and Devanagari.
- **Swipe-Based Actions**:
  - 👉 **Swipe Right**: Create Calendar event (`.ics` export with alarms).
  - 👈 **Swipe Left**: Save to Notes with interactive checklist items.
  - 👆 **Long Press**: Schedule on-device notifications with snooze (+15m, +1h, +1d).
- **Authentic WhatsApp Dark Theme**: Custom dark mode layout (`#0B141A`), emerald accents (`#25D366`), and Inter typography.
- **Data Sovereignty**: Zero tracking, zero ads, no login required. Backup and restore your database as a local JSON file at any time.
