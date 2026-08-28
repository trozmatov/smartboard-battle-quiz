# ⚡ Smartboard Quiz Battle (Dual-Player Split-Screen)

An interactive, real-time dual-player quiz application built specifically for smartboards and touch-enabled displays in classrooms.

---

## 🌟 Key Features

- **Split-Screen Smartboard UI**: High-contrast, touch-optimized dual-player interface (Orange Player 1 side, Blue Player 2 side).
- **Teacher Admin Dashboard**: Live quiz authoring workspace with sidebar question navigation, rich question settings (time limit, points, 4 color-coded choices, radio selector for correct answer).
- **Saved Quizzes Modal**: Browse, load, edit, delete, and 1-click launch saved quiz templates.
- **PIN-Based Live Matchmaking**: 6-digit PIN code generation and automatic student assignment to `p1` or `p2`.
- **Realtime Firestore Sync**: `onSnapshot` subscriptions sync player answers, scores, timers, and round transitions seamlessly.
- **Proxy Safety**: Built-in `toFirestoreData()` sanitizer ensures Vue 3 reactive proxies are safely serialized without Firestore errors.
- **Web Audio Sound Synthesizer**: Built-in sound effects (ticks, correct chimes, buzzers, victory fanfare) via Web Audio API without external audio files.
- **Confetti Victory Podium**: Celebrate student wins with celebration animations and instant replay options.

---

## 🛠️ Tech Stack

- **Frontend**: Vue 3 (`<script setup>`, Composition API), Vite, Vue Router 4
- **Styling**: Bootstrap 5, Bootstrap Icons, Custom Smartboard CSS
- **Backend / Database**: Firebase Firestore (Modular SDK v10/v11)
- **Effects**: Canvas Confetti, Web Audio API

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Create a **Cloud Firestore** database in test mode or production mode.
3. Copy `.env.example` to `.env` and fill in your Firebase configuration keys:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

*(Note: The application includes offline fallbacks and sample quizzes so you can preview the UI immediately even before configuring Firebase!)*

### 3. Run Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
```

---

## 📊 Database Collections Schema

### `quizzes`
```json
{
  "title": "Science & Solar System Blitz",
  "questions": [
    {
      "questionText": "Which planet is known as the Red Planet?",
      "options": ["Venus", "Mars", "Jupiter", "Saturn"],
      "correctIndex": 1,
      "timeLimit": 15,
      "points": 100
    }
  ],
  "updatedAt": "2026-08-28T16:00:00.000Z"
}
```

### `active_games`
```json
{
  "pin": "482915",
  "quizId": "quiz_doc_id",
  "quizTitle": "Science & Solar System Blitz",
  "status": "in_progress",
  "currentQuestionIndex": 0,
  "roundEnded": false,
  "questions": [...],
  "p1": {
    "name": "Alex",
    "score": 250,
    "answeredCurrent": true,
    "selectedAnswer": 1,
    "isCorrect": true,
    "lastPointsWon": 100
  },
  "p2": {
    "name": "Jordan",
    "score": 150,
    "answeredCurrent": false,
    "selectedAnswer": null,
    "isCorrect": null,
    "lastPointsWon": 0
  },
  "createdAt": "2026-08-28T16:05:00.000Z"
}
```
