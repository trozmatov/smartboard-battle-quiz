<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import confetti from 'canvas-confetti';
import { 
  subscribeToGame, 
  submitPlayerAnswer, 
  advanceToNextQuestion, 
  restartGame 
} from '../firebase/gameService';
import { DEFAULT_QUIZZES } from '../firebase/quizService';
import { sound } from '../utils/sound';
import { shuffleQuestionsAndOptions } from '../utils/helpers';
import ChronologyQuestionPlay from '../components/ChronologyQuestionPlay.vue';

const route = useRoute();
const router = useRouter();

// Query Parameters
const gameId = ref(route.query.gameId || '');
const userRole = ref(route.query.role || 'board'); // 'board' (smartboard), 'p1', 'p2', 'spectator'
const initialPin = ref(route.query.pin || '');

// Local Game State with Anti-Cheat Independent Question Shuffling
let localQuiz = null;
try {
  const stored = sessionStorage.getItem('localQuizData');
  if (stored) localQuiz = JSON.parse(stored);
} catch (e) {
  console.error('Local quiz parse error', e);
}

const initialBaseQuestions = localQuiz?.questions?.length ? localQuiz.questions : DEFAULT_QUIZZES[0].questions;
const game = ref({
  id: gameId.value || 'local-game',
  pin: initialPin.value || '123456',
  quizTitle: localQuiz?.title || 'Live Quiz Battle',
  status: 'in_progress',
  currentQuestionIndex: 0,
  roundEnded: false,
  questions: initialBaseQuestions,
  p1Questions: shuffleQuestionsAndOptions(initialBaseQuestions),
  p2Questions: shuffleQuestionsAndOptions(initialBaseQuestions),
  p1: {
    name: 'Player 1',
    score: 0,
    answeredCurrent: false,
    selectedAnswer: null,
    isCorrect: null,
    lastPointsWon: 0
  },
  p2: {
    name: 'Player 2',
    score: 0,
    answeredCurrent: false,
    selectedAnswer: null,
    isCorrect: null,
    lastPointsWon: 0
  }
});

// Timer State
const timeLeft = ref(15);
const isTimerRunning = ref(false);
let timerInterval = null;
let unsubscribeFirestore = null;
let autoAdvanceTimer = null;

// Sound toggle
const soundEnabled = ref(true);

// Computed Independent Questions for Player 1 and Player 2
const p1CurrentQuestion = computed(() => {
  const list = game.value.p1Questions || game.value.questions || [];
  if (list.length === 0) return null;
  return list[game.value.currentQuestionIndex] || null;
});

const p2CurrentQuestion = computed(() => {
  const list = game.value.p2Questions || game.value.questions || [];
  if (list.length === 0) return null;
  return list[game.value.currentQuestionIndex] || null;
});

const currentQuestion = computed(() => {
  return p1CurrentQuestion.value || p2CurrentQuestion.value;
});

const totalQuestions = computed(() => {
  return game.value.questions ? game.value.questions.length : 0;
});

const isGameOver = computed(() => {
  return game.value.status === 'finished' || (game.value.currentQuestionIndex >= totalQuestions.value && totalQuestions.value > 0);
});

const winner = computed(() => {
  if (game.value.p1.score > game.value.p2.score) {
    return { name: game.value.p1.name || 'Player 1', player: 'p1', score: game.value.p1.score };
  } else if (game.value.p2.score > game.value.p1.score) {
    return { name: game.value.p2.name || 'Player 2', player: 'p2', score: game.value.p2.score };
  }
  return { name: "It's a Tie!", player: 'tie', score: game.value.p1.score };
});

// Start Countdown Timer
function startTimer(duration) {
  stopTimer();
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  timeLeft.value = duration || 15;
  isTimerRunning.value = true;

  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
      if (timeLeft.value <= 5 && timeLeft.value > 0) {
        sound.playTick();
      }
    } else {
      stopTimer();
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning.value = false;
}

// Timeout reached: Auto-advance after showing correct answer
function handleTimeOut() {
  sound.playWrong();
  game.value.roundEnded = true;

  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(() => {
    handleNextQuestion();
  }, 2200);
}

// Submit Answer Handler for either Player
async function handlePlayerSelect(playerKey, optionIndex) {
  if (isGameOver.value) return;
  
  const player = game.value[playerKey];
  if (player.answeredCurrent) return; // Prevent double answering

  const targetQuestion = playerKey === 'p1' ? p1CurrentQuestion.value : p2CurrentQuestion.value;
  if (!targetQuestion) return;

  const isCorrect = optionIndex === targetQuestion.correctIndex;
  const points = isCorrect ? (targetQuestion.points || 100) : 0;

  // Immediate Local UI Update
  player.answeredCurrent = true;
  player.selectedAnswer = optionIndex;
  player.isCorrect = isCorrect;
  player.lastPointsWon = points;
  player.score += points;

  // Sound cue
  if (isCorrect) {
    sound.playCorrect();
  } else {
    sound.playWrong();
  }

  // Check if both players have now answered
  const otherKey = playerKey === 'p1' ? 'p2' : 'p1';
  if (game.value[otherKey].answeredCurrent) {
    stopTimer();
    game.value.roundEnded = true;

    // Auto-advance to next question after 1.8 seconds so players can see their result
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      handleNextQuestion();
    }, 1800);
  }

  // Sync with Firestore if active session exists
  if (gameId.value) {
    try {
      await submitPlayerAnswer(gameId.value, playerKey, optionIndex, isCorrect, points);
    } catch (err) {
      console.warn('Could not sync answer to Firestore (running locally):', err);
    }
  }
}

async function handleChronologySelect(playerKey, submittedOrderIds) {
  if (isGameOver.value) return;
  
  const player = game.value[playerKey];
  if (player.answeredCurrent) return; // Prevent double answering

  const targetQuestion = playerKey === 'p1' ? p1CurrentQuestion.value : p2CurrentQuestion.value;
  if (!targetQuestion || targetQuestion.type !== 'chronology') return;

  const correctOrderIds = targetQuestion.items.map(i => i.id);
  const isCorrect = JSON.stringify(submittedOrderIds) === JSON.stringify(correctOrderIds);
  const points = isCorrect ? (targetQuestion.points || 100) : 0;

  // Immediate Local UI Update
  player.answeredCurrent = true;
  player.selectedAnswer = submittedOrderIds;
  player.isCorrect = isCorrect;
  player.lastPointsWon = points;
  player.score += points;

  // Sound cue
  if (isCorrect) {
    sound.playCorrect();
  } else {
    sound.playWrong();
  }

  // Check if both players have now answered
  const otherKey = playerKey === 'p1' ? 'p2' : 'p1';
  if (game.value[otherKey].answeredCurrent) {
    stopTimer();
    game.value.roundEnded = true;

    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      handleNextQuestion();
    }, 2800); // slightly longer to review puzzle correctly
  }

  // Sync with Firestore if active session exists
  if (gameId.value) {
    try {
      await submitPlayerAnswer(gameId.value, playerKey, submittedOrderIds, isCorrect, points);
    } catch (err) {
      console.warn('Could not sync answer to Firestore:', err);
    }
  }
}

// Next Question Handler
async function handleNextQuestion() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  const nextIdx = game.value.currentQuestionIndex + 1;
  
  if (nextIdx >= totalQuestions.value) {
    // Finish Game
    game.value.status = 'finished';
    triggerConfetti();
    sound.playFanfare();
    
    if (gameId.value) {
      advanceToNextQuestion(gameId.value, nextIdx, totalQuestions.value).catch(console.warn);
    }
    return;
  }

  // Advance state locally
  game.value.currentQuestionIndex = nextIdx;
  game.value.roundEnded = false;
  game.value.p1.answeredCurrent = false;
  game.value.p1.selectedAnswer = null;
  game.value.p1.isCorrect = null;
  game.value.p1.lastPointsWon = 0;

  game.value.p2.answeredCurrent = false;
  game.value.p2.selectedAnswer = null;
  game.value.p2.isCorrect = null;
  game.value.p2.lastPointsWon = 0;

  if (gameId.value) {
    advanceToNextQuestion(gameId.value, nextIdx, totalQuestions.value).catch(console.warn);
  }

  const currentDuration = Math.max(
    p1CurrentQuestion.value?.timeLimit || 15,
    p2CurrentQuestion.value?.timeLimit || 15
  );
  startTimer(currentDuration);
}

// Rematch / Restart Game
async function handleRestartGame() {
  const baseQuestions = game.value.questions || DEFAULT_QUIZZES[0].questions;
  
  game.value.status = 'in_progress';
  game.value.currentQuestionIndex = 0;
  game.value.roundEnded = false;
  game.value.p1Questions = shuffleQuestionsAndOptions(baseQuestions);
  game.value.p2Questions = shuffleQuestionsAndOptions(baseQuestions);
  
  game.value.p1.score = 0;
  game.value.p1.answeredCurrent = false;
  game.value.p1.selectedAnswer = null;
  game.value.p1.isCorrect = null;

  game.value.p2.score = 0;
  game.value.p2.answeredCurrent = false;
  game.value.p2.selectedAnswer = null;
  game.value.p2.isCorrect = null;

  if (gameId.value) {
    restartGame(gameId.value).catch(console.warn);
  }

  const currentDuration = Math.max(
    p1CurrentQuestion.value?.timeLimit || 15,
    p2CurrentQuestion.value?.timeLimit || 15
  );
  startTimer(currentDuration);
}

// Confetti Celebration
function triggerConfetti() {
  const duration = 3 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

// Sound toggle
function toggleAudio() {
  soundEnabled.value = sound.toggleSound();
}

// Initialize and Listen to Firestore
onMounted(() => {
  // If student joined with custom name via query
  if (route.query.name) {
    if (userRole.value === 'p2') {
      game.value.p2.name = route.query.name;
    } else if (userRole.value === 'p1') {
      game.value.p1.name = route.query.name;
    }
  }

  if (gameId.value && !gameId.value.startsWith('demo-session-')) {
    unsubscribeFirestore = subscribeToGame(gameId.value, (remoteGame) => {
      if (remoteGame) {
        const prevIndex = game.value.currentQuestionIndex;
        game.value = { ...game.value, ...remoteGame };
        
        // If question advanced by teacher, restart timer
        if (remoteGame.currentQuestionIndex !== prevIndex && !isGameOver.value) {
          startTimer(currentQuestion.value?.timeLimit || 15);
        }

        if (remoteGame.status === 'finished') {
          stopTimer();
          triggerConfetti();
          sound.playFanfare();
        }
      }
    });
  }

  // Initial Question Timer Start
  if (currentQuestion.value) {
    startTimer(currentQuestion.value.timeLimit || 15);
  }
});

onUnmounted(() => {
  stopTimer();
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
  }
});
</script>

<template>
  <div class="game-viewport">
    
    <!-- Top HUD Header (Scores, Timer & Teacher Controls) -->
    <header class="hud-header">
      
      <!-- Player 1 Score HUD (Left) -->
      <div class="hud-player">
        <div class="hud-avatar p1-avatar">
          <i class="bi bi-person-fill"></i>
        </div>
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold text-white fs-5">{{ game.p1.name || 'Player 1' }}</span>
            <span class="badge bg-warning text-dark px-2 py-0 fw-bold small">P1</span>
          </div>
          <div class="hud-score p1-score-text">
            {{ game.p1.score }} <span class="fs-6 text-secondary fw-normal">pts</span>
          </div>
        </div>
      </div>

      <!-- Center HUD: Timer, Question Counter & Controls -->
      <div class="d-flex align-items-center gap-3">
        
        <!-- Question Badge -->
        <div class="text-center d-none d-md-block">
          <div class="badge bg-secondary bg-opacity-40 text-light px-3 py-1 rounded-pill mb-1">
            Question {{ game.currentQuestionIndex + 1 }} of {{ totalQuestions }}
          </div>
          <div class="small text-secondary fw-semibold">
            PIN: <span class="text-warning fw-bold tracking-wider">{{ game.pin }}</span>
          </div>
        </div>

        <!-- Animated Countdown Timer -->
        <div 
          class="hud-timer-badge"
          :class="{ 'timer-urgent': timeLeft <= 5 && timeLeft > 0 }"
        >
          <i class="bi bi-stopwatch"></i>
          <span>{{ timeLeft }}s</span>
        </div>

        <!-- View Mode Switcher (Smartboard vs Student Perspective) -->
        <div class="btn-group btn-group-sm rounded-pill bg-dark border border-secondary border-opacity-50 p-1 d-none d-sm-inline-flex">
          <button 
            @click="userRole = 'board'" 
            class="btn btn-sm rounded-pill px-2 py-0 small fw-semibold"
            :class="userRole === 'board' ? 'btn-light text-dark shadow-sm' : 'btn-dark text-secondary'"
            title="Smartboard Split Screen"
          >
            🖥️ Split
          </button>
          <button 
            @click="userRole = 'p1'" 
            class="btn btn-sm rounded-pill px-2 py-0 small fw-semibold"
            :class="userRole === 'p1' ? 'btn-warning text-dark shadow-sm' : 'btn-dark text-secondary'"
            title="Student 1 (Orange)"
          >
            🟧 Student 1
          </button>
          <button 
            @click="userRole = 'p2'" 
            class="btn btn-sm rounded-pill px-2 py-0 small fw-semibold"
            :class="userRole === 'p2' ? 'btn-info text-dark shadow-sm' : 'btn-dark text-secondary'"
            title="Student 2 (Blue)"
          >
            🟦 Student 2
          </button>
        </div>

        <!-- Teacher / Host Quick Action Controls -->
        <div class="d-flex align-items-center gap-2">
          <button 
            @click="handleNextQuestion" 
            class="btn btn-sm btn-light rounded-pill px-3 fw-bold d-flex align-items-center gap-1 shadow"
            :disabled="isGameOver"
            title="Advance to next question"
          >
            <span>Next</span>
            <i class="bi bi-chevron-right"></i>
          </button>

          <button 
            @click="toggleAudio" 
            class="btn btn-sm btn-outline-secondary rounded-circle text-light"
            style="width: 36px; height: 36px;"
            :title="soundEnabled ? 'Mute Audio' : 'Unmute Audio'"
          >
            <i :class="soundEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill'"></i>
          </button>

          <router-link 
            to="/teacher" 
            class="btn btn-sm btn-outline-secondary rounded-circle text-light"
            style="width: 36px; height: 36px;"
            title="Exit to Dashboard"
          >
            <i class="bi bi-x-lg"></i>
          </router-link>
        </div>

      </div>

      <!-- Player 2 Score HUD (Right) -->
      <div class="hud-player justify-content-end text-end">
        <div>
          <div class="d-flex align-items-center gap-2 justify-content-end">
            <span class="badge bg-info text-dark px-2 py-0 fw-bold small">P2</span>
            <span class="fw-bold text-white fs-5">{{ game.p2.name || 'Player 2' }}</span>
          </div>
          <div class="hud-score p2-score-text">
            {{ game.p2.score }} <span class="fs-6 text-secondary fw-normal">pts</span>
          </div>
        </div>
        <div class="hud-avatar p2-avatar">
          <i class="bi bi-person-fill"></i>
        </div>
      </div>

    </header>

    <!-- Auto-Advance Round Indicator Bar -->
    <div 
      v-if="game.roundEnded && !isGameOver" 
      class="bg-warning text-dark text-center py-2 px-3 fw-bold small shadow d-flex align-items-center justify-content-center gap-2 animate__animated animate__fadeInDown"
      style="background: linear-gradient(90deg, #FF9800, #FFC107); z-index: 20;"
    >
      <i class="bi bi-lightning-charge-fill fs-6"></i>
      <span>Answers locked! Auto-advancing to next question in a moment...</span>
      <button @click="handleNextQuestion" class="btn btn-dark btn-sm rounded-pill py-0 px-2 ms-2 fw-bold text-warning" style="font-size: 0.75rem;">
        Skip <i class="bi bi-chevron-right"></i>
      </button>
    </div>

    <!-- Main Split-Screen Arena -->
    <main v-if="!isGameOver && (p1CurrentQuestion || p2CurrentQuestion)" class="split-arena">
      
      <!-- ==================== LEFT HALF: PLAYER 1 (ORANGE) ==================== -->
      <section 
        v-show="userRole === 'board' || userRole === 'p1'"
        class="player-half p1-arena"
        :class="{ 'border-0': userRole === 'p1' }"
      >
        
        <!-- P1 Header Tag -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="badge rounded-pill px-3 py-2 fs-6 fw-bold shadow-sm" style="background-color: #FF5722; color: #FFF;">
            <i class="bi bi-person-fill me-1"></i> {{ game.p1.name || 'Player 1' }}'s Side
            <span v-if="userRole === 'p1'" class="ms-1 badge bg-dark text-warning">(Your Screen)</span>
          </span>
          <span class="badge bg-dark border border-secondary text-warning px-3 py-1">
            +{{ p1CurrentQuestion?.points || 100 }} pts
          </span>
        </div>

        <!-- P1 Question Card -->
        <div v-if="p1CurrentQuestion" class="question-display-box border-warning border-opacity-30">
          <p class="mb-0 text-white">
            {{ p1CurrentQuestion.questionText }}
          </p>
        </div>

        <!-- P1 Instant Answer Feedback Overlay / Status -->
        <div v-if="game.p1.answeredCurrent" class="text-center py-2 mb-2 animate__animated animate__fadeIn">
          <span 
            v-if="game.p1.isCorrect" 
            class="badge bg-success bg-opacity-75 fs-5 px-4 py-2 rounded-pill shadow-lg"
          >
            <i class="bi bi-check-circle-fill me-2"></i> Correct! (+{{ game.p1.lastPointsWon }} pts)
          </span>
          <span 
            v-else 
            class="badge bg-danger bg-opacity-75 fs-5 px-4 py-2 rounded-pill shadow-lg"
          >
            <i class="bi bi-x-circle-fill me-2"></i> Incorrect!
          </span>
        </div>

        <!-- P1 4 Touch Buttons Grid -->
        <div v-if="p1CurrentQuestion && (!p1CurrentQuestion.type || p1CurrentQuestion.type === 'multiple_choice')" class="answers-grid">
          
          <button 
            @click="handlePlayerSelect('p1', 0)"
            class="answer-btn btn-a"
            :class="{
              'is-correct': game.p1.answeredCurrent && p1CurrentQuestion.correctIndex === 0,
              'is-wrong': game.p1.answeredCurrent && game.p1.selectedAnswer === 0 && !game.p1.isCorrect,
              'is-dimmed': game.p1.answeredCurrent && game.p1.selectedAnswer !== 0 && p1CurrentQuestion.correctIndex !== 0
            }"
            :disabled="game.p1.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">A</span>
            <span>{{ p1CurrentQuestion.options[0] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p1', 1)"
            class="answer-btn btn-b"
            :class="{
              'is-correct': game.p1.answeredCurrent && p1CurrentQuestion.correctIndex === 1,
              'is-wrong': game.p1.answeredCurrent && game.p1.selectedAnswer === 1 && !game.p1.isCorrect,
              'is-dimmed': game.p1.answeredCurrent && game.p1.selectedAnswer !== 1 && p1CurrentQuestion.correctIndex !== 1
            }"
            :disabled="game.p1.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">B</span>
            <span>{{ p1CurrentQuestion.options[1] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p1', 2)"
            class="answer-btn btn-c"
            :class="{
              'is-correct': game.p1.answeredCurrent && p1CurrentQuestion.correctIndex === 2,
              'is-wrong': game.p1.answeredCurrent && game.p1.selectedAnswer === 2 && !game.p1.isCorrect,
              'is-dimmed': game.p1.answeredCurrent && game.p1.selectedAnswer !== 2 && p1CurrentQuestion.correctIndex !== 2
            }"
            :disabled="game.p1.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">C</span>
            <span>{{ p1CurrentQuestion.options[2] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p1', 3)"
            class="answer-btn btn-d"
            :class="{
              'is-correct': game.p1.answeredCurrent && p1CurrentQuestion.correctIndex === 3,
              'is-wrong': game.p1.answeredCurrent && game.p1.selectedAnswer === 3 && !game.p1.isCorrect,
              'is-dimmed': game.p1.answeredCurrent && game.p1.selectedAnswer !== 3 && p1CurrentQuestion.correctIndex !== 3
            }"
            :disabled="game.p1.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">D</span>
            <span>{{ p1CurrentQuestion.options[3] }}</span>
          </button>

        </div>

        <!-- P1 Chronology Game UI -->
        <div v-else-if="p1CurrentQuestion && p1CurrentQuestion.type === 'chronology'" class="flex-grow-1 p-3">
          <ChronologyQuestionPlay 
            :question="p1CurrentQuestion"
            :playerKey="'p1'"
            :game="game"
            :timeLeft="timeLeft"
            @submit="handleChronologySelect"
          />
        </div>

      </section>

      <!-- ==================== RIGHT HALF: PLAYER 2 (BLUE) ==================== -->
      <section 
        v-show="userRole === 'board' || userRole === 'p2'"
        class="player-half p2-arena"
        :class="{ 'border-0': userRole === 'p2' }"
      >
        
        <!-- P2 Header Tag -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="badge rounded-pill px-3 py-2 fs-6 fw-bold shadow-sm" style="background-color: #0288D1; color: #FFF;">
            <i class="bi bi-person-fill me-1"></i> {{ game.p2.name || 'Player 2' }}'s Side
            <span v-if="userRole === 'p2'" class="ms-1 badge bg-dark text-info">(Your Screen)</span>
          </span>
          <span class="badge bg-dark border border-secondary text-info px-3 py-1">
            +{{ p2CurrentQuestion?.points || 100 }} pts
          </span>
        </div>

        <!-- P2 Question Card -->
        <div v-if="p2CurrentQuestion" class="question-display-box border-info border-opacity-30">
          <p class="mb-0 text-white">
            {{ p2CurrentQuestion.questionText }}
          </p>
        </div>

        <!-- P2 Instant Answer Feedback Overlay / Status -->
        <div v-if="game.p2.answeredCurrent" class="text-center py-2 mb-2 animate__animated animate__fadeIn">
          <span 
            v-if="game.p2.isCorrect" 
            class="badge bg-success bg-opacity-75 fs-5 px-4 py-2 rounded-pill shadow-lg"
          >
            <i class="bi bi-check-circle-fill me-2"></i> Correct! (+{{ game.p2.lastPointsWon }} pts)
          </span>
          <span 
            v-else 
            class="badge bg-danger bg-opacity-75 fs-5 px-4 py-2 rounded-pill shadow-lg"
          >
            <i class="bi bi-x-circle-fill me-2"></i> Incorrect!
          </span>
        </div>

        <!-- P2 4 Touch Buttons Grid -->
        <div v-if="p2CurrentQuestion && (!p2CurrentQuestion.type || p2CurrentQuestion.type === 'multiple_choice')" class="answers-grid">
          
          <button 
            @click="handlePlayerSelect('p2', 0)"
            class="answer-btn btn-a"
            :class="{
              'is-correct': game.p2.answeredCurrent && p2CurrentQuestion.correctIndex === 0,
              'is-wrong': game.p2.answeredCurrent && game.p2.selectedAnswer === 0 && !game.p2.isCorrect,
              'is-dimmed': game.p2.answeredCurrent && game.p2.selectedAnswer !== 0 && p2CurrentQuestion.correctIndex !== 0
            }"
            :disabled="game.p2.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">A</span>
            <span>{{ p2CurrentQuestion.options[0] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p2', 1)"
            class="answer-btn btn-b"
            :class="{
              'is-correct': game.p2.answeredCurrent && p2CurrentQuestion.correctIndex === 1,
              'is-wrong': game.p2.answeredCurrent && game.p2.selectedAnswer === 1 && !game.p2.isCorrect,
              'is-dimmed': game.p2.answeredCurrent && game.p2.selectedAnswer !== 1 && p2CurrentQuestion.correctIndex !== 1
            }"
            :disabled="game.p2.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">B</span>
            <span>{{ p2CurrentQuestion.options[1] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p2', 2)"
            class="answer-btn btn-c"
            :class="{
              'is-correct': game.p2.answeredCurrent && p2CurrentQuestion.correctIndex === 2,
              'is-wrong': game.p2.answeredCurrent && game.p2.selectedAnswer === 2 && !game.p2.isCorrect,
              'is-dimmed': game.p2.answeredCurrent && game.p2.selectedAnswer !== 2 && p2CurrentQuestion.correctIndex !== 2
            }"
            :disabled="game.p2.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">C</span>
            <span>{{ p2CurrentQuestion.options[2] }}</span>
          </button>

          <button 
            @click="handlePlayerSelect('p2', 3)"
            class="answer-btn btn-d"
            :class="{
              'is-correct': game.p2.answeredCurrent && p2CurrentQuestion.correctIndex === 3,
              'is-wrong': game.p2.answeredCurrent && game.p2.selectedAnswer === 3 && !game.p2.isCorrect,
              'is-dimmed': game.p2.answeredCurrent && game.p2.selectedAnswer !== 3 && p2CurrentQuestion.correctIndex !== 3
            }"
            :disabled="game.p2.answeredCurrent || timeLeft === 0"
          >
            <span class="option-badge">D</span>
            <span>{{ p2CurrentQuestion.options[3] }}</span>
          </button>

        </div>

        <!-- P2 Chronology Game UI -->
        <div v-else-if="p2CurrentQuestion && p2CurrentQuestion.type === 'chronology'" class="flex-grow-1 p-3">
          <ChronologyQuestionPlay 
            :question="p2CurrentQuestion"
            :playerKey="'p2'"
            :game="game"
            :timeLeft="timeLeft"
            @submit="handleChronologySelect"
          />
        </div>

      </section>

    </main>

    <!-- ==================== GAME OVER / VICTORY PODIUM ==================== -->
    <div v-if="isGameOver" class="flex-grow-1 d-flex align-items-center justify-content-center p-4" style="background: radial-gradient(circle, #1E293B 0%, #0B1120 100%);">
      <div class="card bg-slate-900 border border-secondary border-opacity-50 text-white rounded-5 shadow-2xl p-5 text-center" style="max-width: 750px; background-color: #1E293B;">
        
        <!-- Trophy Icon -->
        <div class="mb-3 animate__animated animate__bounceIn">
          <span class="display-1">🏆</span>
        </div>

        <h1 class="display-4 fw-extrabold brand-font mb-2" style="background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          {{ winner.player === 'tie' ? "IT'S A DRAW!" : `${winner.name} WINS!` }}
        </h1>

        <p class="fs-5 text-secondary mb-4">
          Great job by both contestants in this Smartboard Quiz Battle!
        </p>

        <!-- Final Score Comparison -->
        <div class="row g-4 justify-content-center mb-5">
          
          <!-- P1 Final Score Card -->
          <div class="col-sm-5">
            <div 
              class="p-4 rounded-4 border text-center transition-all"
              :class="winner.player === 'p1' ? 'border-warning bg-warning bg-opacity-10 shadow-lg' : 'border-secondary border-opacity-25 bg-dark'"
            >
              <span class="badge bg-warning text-dark px-3 py-1 rounded-pill mb-2 fw-bold">PLAYER 1</span>
              <h4 class="fw-bold text-white">{{ game.p1.name || 'Player 1' }}</h4>
              <div class="display-5 fw-bold p1-score-text mt-2">
                {{ game.p1.score }} <span class="fs-6 text-secondary">pts</span>
              </div>
            </div>
          </div>

          <!-- P2 Final Score Card -->
          <div class="col-sm-5">
            <div 
              class="p-4 rounded-4 border text-center transition-all"
              :class="winner.player === 'p2' ? 'border-info bg-info bg-opacity-10 shadow-lg' : 'border-secondary border-opacity-25 bg-dark'"
            >
              <span class="badge bg-info text-dark px-3 py-1 rounded-pill mb-2 fw-bold">PLAYER 2</span>
              <h4 class="fw-bold text-white">{{ game.p2.name || 'Player 2' }}</h4>
              <div class="display-5 fw-bold p2-score-text mt-2">
                {{ game.p2.score }} <span class="fs-6 text-secondary">pts</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Action Buttons -->
        <div class="d-flex flex-wrap gap-3 justify-content-center">
          <button 
            @click="handleRestartGame" 
            class="btn btn-lg btn-warning rounded-pill px-5 py-3 fw-bold text-dark shadow-lg d-flex align-items-center gap-2"
          >
            <i class="bi bi-arrow-repeat fs-4"></i>
            <span>Play Again</span>
          </button>

          <router-link 
            to="/teacher" 
            class="btn btn-lg btn-outline-light rounded-pill px-5 py-3 fw-semibold d-flex align-items-center gap-2"
          >
            <i class="bi bi-gear-fill fs-5"></i>
            <span>Teacher Dashboard</span>
          </router-link>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.tracking-wider {
  letter-spacing: 0.15rem;
}
</style>
