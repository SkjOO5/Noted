# Contributing to Noted 🚀

Thank you for your interest in contributing to **Noted**! Whether you're here for **Hacktoberfest**, fixing a bug, adding support for regional slang, or improving performance, your contributions are warmly welcomed.

---

## 🎃 Hacktoberfest Participation

Noted proudly participates in **Hacktoberfest**! 
- Please make quality contributions that adhere to the guidelines.
- Spam PRs (whitespace edits, AI-generated trivial comments, copy-pasting docs) will be labeled `invalid` or `spam`.
- Look out for issues tagged [`good first issue`](https://github.com/SkjOO5/Noted/labels/good%20first%20issue) or [`hacktoberfest`](https://github.com/SkjOO5/Noted/labels/hacktoberfest).

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js** (v18 or v20+)
- **npm** (v9+)
- *(Optional for Android APK builds)*: Android Studio & JDK 17
- *(Optional for ML / Cloud development)*: Python 3.11+

### Quickstart

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Noted.git
   cd Noted
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Validation

Before submitting a Pull Request, make sure all quality checks pass locally:

```bash
# 1. Run unit & parser test suites (100% passing)
npm run test

# 2. Type-check TypeScript codebase
npm run typecheck

# 3. Verify zero secrets or API keys are leaked
npm run check:secrets

# 4. Verify production web build
npm run build
```

If you modify the Python cloud planner or validator fixtures:
```bash
python -m pytest cloud/test_cloud.py
```

---

## 💡 Ways to Contribute

### 1. Improve the Message & Date Parser (Great First Issue!)
College students communicate in diverse dialects, abbreviations, and Hinglish. If you see a message format Noted fails to parse:
- Add a new test case in [`tests/parser.test.ts`](tests/parser.test.ts).
- Update regex patterns in [`src/lib/parser/`](src/lib/parser/).
- Ensure `npm run test` passes without breaking existing test fixtures.

### 2. UI / UX & Dark Mode Enhancements
- Accessibility improvements (screen reader labels, ARIA landmarks).
- Micro-interactions and swipe haptics.
- Localization (adding localized strings for Indian languages).

### 3. Study Planner & Timetable Rules
- Test the Greedy Study Planner with diverse course loads.
- Contribute edge-case validation scenarios in [`tests/fixtures/planner_test_cases.json`](tests/fixtures/planner_test_cases.json).

---

## 📝 Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names like `fix/hinglish-date-parsing` or `feat/calendar-agenda-filter`.
2. **Commit Messages**: Write concise, conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`, `test: ...`).
3. **Secret Security**: **Never** commit API keys or `.env` files. Our automated pre-commit hook runs `check:secrets` to reject any commits containing secrets.
4. **Issue Linking**: Link your PR to the issue it resolves (e.g., `Closes #12`).

Thank you for helping make college notice tracking effortless for students everywhere! 💚
