# ⚡ Habit Pro — Systemic Discipline & Habit Tracker Platform

A modern, ultra-dark, high-performance habit tracker web application built with Vanilla JavaScript, HTML5, CSS3, Firebase (Auth & Firestore), Chart.js analytics, OpenRouter AI insights, and PWA Service Worker caching.

---

## 🌟 Key Features

- **Standalone Hero Landing Page (`main.html`)**: Interactive intro landing view with animated mesh glow orbs, live preview cards, and Google Auth sign-in triggers.
- **Habit Tracker Dashboard (`index.html`)**: Active metrics grid, category filter pills, habit feeds, Create Habit modal with custom start dates, repeat intervals, and infinite deadlines.
- **Behavioral Analytics & AI Coach (`analys.html`)**: 7-day completion velocity charts, category doughnut breakdown, 28-day activity heatmap, and OpenRouter AI behavioral synthesizer (supporting preset & custom AI model IDs).
- **Dedicated Habit Detail & Reflection Notes (`habit.html`)**: Multi-month calendar history navigation (`← Prev Month / Next Month →`), scheduled interval skipping, and date-by-date reflection note editor.
- **Ultra-Minimal Mobile UX**: Instagram/YouTube hybrid responsive navigation bar, iOS safe-area inset compatibility, 44px+ touch targets, and mobile bottom sheet modals.
- **PWA Service Worker Engine (`sw.js`)**: 0ms offline asset caching via Service Worker.

---

## 🚀 Getting Started

### 1. Run Locally
Open `main.html` or `index.html` in any web browser!

Or serve with any static web server:
```bash
npx serve .
```

### 2. Firebase Configuration
Firebase Firestore and Google Authentication are initialized in `js/firebase-config.js`.

---

## 📁 Architecture & File Structure

```text
Habit_pro/
├── index.html              # Main Dashboard (Habit List, Create Habit Modal, Settings Modal)
├── main.html               # Standalone Hero Landing Intro Page
├── analys.html             # Analytics & OpenRouter AI Coach Page
├── habit.html              # Dedicated Habit Detail & Multi-Month Reflection Note Editor
├── sw.js                   # PWA Service Worker Cache Engine
├── styles/
│   ├── main.css            # Design System, Glassmorphism Tokens, Double-Bezel Cards
│   ├── animations.css      # Spring Keyframe Animations, Glow Accents, Skeleton Loaders
│   ├── responsive.css      # Desktop Sidebar (280px), Mobile Bottom Bar (72px), Mobile Sheets
│   └── hero.css            # Hero Landing Mesh Glow Orbs & Shimmer CTA Styles
└── js/
    ├── main.js             # Application Controller & Event Bindings
    ├── habits.js           # CRUD Logic, Interval Calculator, Streak Algorithm, Optimistic UI Cache
    ├── auth.js             # Google Auth Provider & Route Protection Engine
    ├── charts.js           # Chart.js Visual Renderers & Heatmap
    ├── ai-analyzer.js      # OpenRouter API Caller & Custom Model Config
    └── firebase-config.js  # Firebase v10 Web SDK ESM Initialization
```
"# habit-pro" 
