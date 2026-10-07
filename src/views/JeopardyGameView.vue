<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import confetti from 'canvas-confetti';
import { getJeopardyGameById, DEFAULT_JEOPARDY_GAMES } from '../firebase/jeopardyService';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';

const route = useRoute();
const router = useRouter();
const { deviceMode } = useDeviceMode();

const gameId = ref(route.query.id || '');
const isFullscreen = ref(false);

// Active Jeopardy Game State
const game = ref({
  id: 'starter-jeopardy-world-history',
  title: 'World History & Civilizations Jeopardy',
  categories: JSON.parse(JSON.stringify(DEFAULT_JEOPARDY_GAMES[0].categories))
});

// Board tracking: map of answered cells (e.g. 'catIdx-qIdx' -> true)
const answeredCells = reactive({});

// Active Question Modal State
const activeModal = ref({
  show: false,
  categoryName: '',
  categoryIndex: 0,
  questionIndex: 0,
  points: 100,
  question: '',
  answer: '',
  showAnswer: false
});

// Teams / Players Scoreboard
const teams = ref([
  { id: 1, name: '1-Jamoa (Qizil)', color: '#EF4444', score: 0 },
  { id: 2, name: '2-Jamoa (Ko\'k)', color: '#3B82F6', score: 0 },
  { id: 3, name: '3-Jamoa (Sariq)', color: '#F59E0B', score: 0 }
]);

// Question Countdown Timer
const timerSeconds = ref(30);
const initialTimerDuration = ref(30);
const isTimerRunning = ref(false);
let timerInterval = null;

// Game Over state
const isGameOver = ref(false);

// Computed stats
const totalCells = computed(() => {
  return game.value.categories.reduce((sum, c) => sum + (c.questions ? c.questions.length : 0), 0);
});

const answeredCount = computed(() => {
  return Object.keys(answeredCells).filter(k => answeredCells[k]).length;
});

const winningTeam = computed(() => {
  const sorted = [...teams.value].sort((a, b) => b.score - a.score);
  return sorted[0];
});

// Load game data
async function loadGame() {
  if (gameId.value) {
    try {
      const loaded = await getJeopardyGameById(gameId.value);
      if (loaded) {
        game.value = loaded;
      }
    } catch (err) {
      console.warn('Could not load game by ID, using default starter game:', err);
    }
  }
}

// Open Question Modal
function openQuestion(catIdx, qIdx) {
  const cellKey = `${catIdx}-${qIdx}`;
  if (answeredCells[cellKey]) return; // Already answered

  const category = game.value.categories[catIdx];
  const questionItem = category?.questions?.[qIdx] || {};

  const qText = questionItem.question || questionItem.questionText || questionItem.prompt || questionItem.savol || 'Savol kiritilmagan';
  const aText = questionItem.answer || questionItem.correctAnswer || questionItem.correct_answer || questionItem.javob || questionItem.to_gri_javob || questionItem.solution || '';

  activeModal.value = {
    show: true,
    categoryName: category?.name || `Kategoriya #${catIdx + 1}`,
    categoryIndex: catIdx,
    questionIndex: qIdx,
    points: Number(questionItem.points) || ((qIdx + 1) * 100),
    question: qText,
    answer: aText,
    showAnswer: false
  };

  sound.playCorrect();
  startTimer(30);
}

// Reveal Answer
function revealAnswer() {
  activeModal.value.showAnswer = true;
  stopTimer();
  sound.playFanfare();
}

// Award Points to a Team
function awardPoints(team, isCorrect = true) {
  const pts = activeModal.value.points;
  if (isCorrect) {
    team.score += pts;
    sound.playCorrect();
  } else {
    team.score -= pts;
    sound.playWrong();
  }
}

// Add Custom Team
function addTeam() {
  if (teams.value.length >= 6) return;
  const num = teams.value.length + 1;
  const colors = ['#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  teams.value.push({
    id: Date.now(),
    name: `${num}-Jamoa`,
    color: colors[(num - 4) % colors.length] || '#10B981',
    score: 0
  });
  sound.playTick();
}

// Remove Team
function removeTeam(idx) {
  if (teams.value.length <= 2) return;
  teams.value.splice(idx, 1);
  sound.playTick();
}

// Close Modal and mark cell as answered
function closeQuestionModal() {
  const cellKey = `${activeModal.value.categoryIndex}-${activeModal.value.questionIndex}`;
  answeredCells[cellKey] = true;
  activeModal.value.show = false;
  stopTimer();

  // Check if all cells are answered
  if (answeredCount.value >= totalCells.value) {
    triggerGameOver();
  }
}

// Timer Controls
function startTimer(duration) {
  stopTimer();
  timerSeconds.value = duration || 30;
  initialTimerDuration.value = timerSeconds.value;
  isTimerRunning.value = true;

  timerInterval = setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--;
      if (timerSeconds.value <= 5 && timerSeconds.value > 0) {
        sound.playTick();
      }
    } else {
      stopTimer();
      sound.playWrong();
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

// Fullscreen Toggle
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.warn);
    isFullscreen.value = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(console.warn);
      isFullscreen.value = false;
    }
  }
}

// Finish / Game Over Celebration
function triggerGameOver() {
  isGameOver.value = true;
  sound.playFanfare();
  
  // Confetti burst
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.4 }
    });
  }, 1200);
}

// Reset / Play Again
function resetGame() {
  Object.keys(answeredCells).forEach(k => delete answeredCells[k]);
  teams.value.forEach(t => t.score = 0);
  isGameOver.value = false;
  sound.playCorrect();
}

onMounted(() => {
  loadGame();
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});

onUnmounted(() => {
  stopTimer();
});
</script>

<template>
  <div class="min-vh-100 d-flex flex-column text-light jeopardy-game-arena" style="background: radial-gradient(circle at center, #0B1936 0%, #030712 100%);">
    
    <!-- Top HUD Header -->
    <header class="border-bottom border-secondary border-opacity-30 px-3 py-2 d-flex align-items-center justify-content-between flex-wrap gap-2" style="background: rgba(11, 25, 54, 0.85); backdrop-filter: blur(10px); z-index: 50;">
      
      <div class="d-flex align-items-center gap-3">
        <button 
          @click="router.push('/jeopardy')" 
          class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3 d-flex align-items-center gap-1"
          title="Tahrirlash oynasiga qaytish"
        >
          <span>←</span>
          <span>Chiqish</span>
        </button>

        <h4 class="brand-font text-white mb-0 d-flex align-items-center gap-2">
          <span>🎯</span>
          <span>{{ game.title }}</span>
        </h4>
      </div>

      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-dark border border-secondary border-opacity-50 text-warning px-3 py-2 rounded-pill fw-bold">
          Javob berildi: {{ answeredCount }} / {{ totalCells }}
        </span>

        <button 
          @click="toggleFullscreen" 
          class="btn btn-sm btn-outline-warning rounded-pill px-3 d-flex align-items-center gap-1 fw-bold"
          title="To'liq ekranga o'tkazish"
        >
          <span>{{ isFullscreen ? '🗗 Oynaga qaytish' : '⛶ Fullscreen' }}</span>
        </button>

        <button 
          @click="triggerGameOver" 
          class="btn btn-sm btn-danger rounded-pill px-3 fw-bold shadow-sm"
          title="O'yinni yakunlash va g'olibni aniqlash"
        >
          🏆 Yakunlash
        </button>
      </div>

    </header>

    <!-- Main Jeopardy Interactive Board -->
    <main class="flex-grow-1 p-3 p-md-4 d-flex flex-column justify-content-center">
      
      <div class="jeopardy-main-board mx-auto w-100 shadow-2xl rounded-4 p-3 border border-warning border-opacity-40" style="background-color: #050B17; max-width: 1400px;">
        
        <div 
          class="jeopardy-arena-grid" 
          :style="{ gridTemplateColumns: `repeat(${game.categories.length}, 1fr)` }"
        >
          <!-- Category Headers -->
          <div 
            v-for="(cat, cIdx) in game.categories" 
            :key="cIdx" 
            class="arena-category-card p-3 rounded-4 text-center d-flex align-items-center justify-content-center shadow-lg border border-primary border-opacity-50"
            style="background: linear-gradient(180deg, #1E3A8A 0%, #0C1A3A 100%);"
          >
            <h5 class="fw-black brand-font text-white mb-0 text-uppercase tracking-wider">
              {{ cat.name }}
            </h5>
          </div>

          <!-- 5 Rows of Point Cards -->
          <template v-for="rowIdx in [0, 1, 2, 3, 4]" :key="rowIdx">
            <div 
              v-for="(cat, catIdx) in game.categories" 
              :key="`${catIdx}-${rowIdx}`"
              @click="openQuestion(catIdx, rowIdx)"
              class="arena-point-card p-4 rounded-4 text-center d-flex align-items-center justify-content-center cursor-pointer transition-all shadow"
              :class="{
                'is-answered': answeredCells[`${catIdx}-${rowIdx}`],
                'hover-gold': !answeredCells[`${catIdx}-${rowIdx}`]
              }"
            >
              <span v-if="!answeredCells[`${catIdx}-${rowIdx}`]" class="display-5 fw-black brand-font text-warning tracking-wide point-text">
                ${{ cat.questions[rowIdx]?.points || ((rowIdx + 1) * 100) }}
              </span>
              <span v-else class="fs-4 text-secondary opacity-25">
                ✓
              </span>
            </div>
          </template>

        </div>

      </div>

    </main>

    <!-- Bottom Teams Scoreboard (Smartboard Touch Control) -->
    <footer class="border-top border-secondary border-opacity-30 p-3 bg-slate-950" style="background-color: #070D1E;">
      <div class="container-fluid d-flex align-items-center justify-content-between flex-wrap gap-3">
        
        <!-- Teams List -->
        <div class="d-flex align-items-center gap-3 flex-wrap flex-grow-1">
          <div 
            v-for="(team, tIdx) in teams" 
            :key="team.id"
            class="team-score-card px-3 py-2 rounded-4 border d-flex align-items-center gap-3 shadow-lg"
            :style="{ borderColor: team.color, background: 'rgba(15, 23, 42, 0.9)' }"
          >
            <div class="d-flex align-items-center gap-2">
              <span class="rounded-circle p-1" :style="{ backgroundColor: team.color, width: '12px', height: '12px' }"></span>
              <input 
                v-model="team.name" 
                class="form-control form-control-sm text-white fw-bold border-0 bg-transparent p-0" 
                style="width: 130px;"
              />
            </div>

            <div class="fs-4 fw-black brand-font text-warning">
              {{ team.score }}
            </div>

            <div class="d-flex align-items-center gap-1">
              <button 
                @click="team.score += 100" 
                class="btn btn-sm btn-outline-success rounded-circle p-0 d-flex align-items-center justify-content-center"
                style="width: 28px; height: 28px; font-weight: bold;"
                title="+100 ball qo'shish"
              >
                +
              </button>
              <button 
                @click="team.score -= 100" 
                class="btn btn-sm btn-outline-danger rounded-circle p-0 d-flex align-items-center justify-content-center"
                style="width: 28px; height: 28px; font-weight: bold;"
                title="-100 ball ayirish"
              >
                -
              </button>
              <button 
                v-if="teams.length > 2"
                @click="removeTeam(tIdx)" 
                class="btn btn-sm text-secondary p-0 ms-1 opacity-50 hover-opacity-100"
                title="Jamoani o'chirish"
              >
                ✕
              </button>
            </div>
          </div>

          <button 
            @click="addTeam" 
            class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3 fw-semibold"
            :disabled="teams.length >= 6"
          >
            + Jamoa Qo'shish
          </button>
        </div>

      </div>
    </footer>

    <!-- ==================== FULLSCREEN QUESTION MODAL ==================== -->
    <div v-if="activeModal.show" class="modal-backdrop fade show jeopardy-modal-backdrop"></div>

    <div v-if="activeModal.show" class="modal fade show d-block jeopardy-modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="jeopardyModalTitle">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content text-light border-2 border-warning border-opacity-50 shadow-2xl rounded-5 overflow-hidden jeopardy-modal-content">
          
          <!-- Header -->
          <div class="modal-header border-secondary border-opacity-25 px-5 py-4 d-flex align-items-center justify-content-between jeopardy-modal-header">
            <div>
              <span class="badge bg-warning text-dark fw-black fs-5 px-4 py-2 rounded-pill shadow">
                ${{ activeModal.points }} Ballik Savol
              </span>
              <h4 id="jeopardyModalTitle" class="brand-font text-white mt-2 mb-0">
                {{ activeModal.categoryName }}
              </h4>
            </div>

            <!-- Countdown Timer -->
            <div class="d-flex align-items-center gap-3">
              <div 
                class="hud-timer-badge px-4 py-2 fs-3 fw-bold rounded-pill border"
                :class="timerSeconds <= 5 ? 'border-danger text-danger timer-urgent' : 'border-info text-info'"
              >
                <span>⏱️</span>
                <span>{{ timerSeconds }}s</span>
              </div>

              <button type="button" class="btn-close btn-close-white fs-4" @click="closeQuestionModal"></button>
            </div>
          </div>

          <!-- Question & Answer Body -->
          <div class="modal-body p-5 text-center">
            
            <!-- Question Box -->
            <div class="py-4">
              <p class="display-6 fw-bold text-white leading-relaxed question-text-massive">
                {{ activeModal.question }}
              </p>
            </div>

            <!-- Answer Box (Revealed with High Contrast) -->
            <div v-if="activeModal.showAnswer" class="mt-4 p-4 rounded-4 shadow-xl border border-success animate__animated animate__fadeInUp jeopardy-answer-box">
              <h5 class="fw-bold mb-2" style="color: #FBBF24 !important;">💡 To'g'ri Javob:</h5>
              <p class="display-6 fw-black mb-0" style="color: #FFFFFF !important; font-size: 2.2rem; line-height: 1.3; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);">
                {{ activeModal.answer || 'Javob kiritilmagan' }}
              </p>
            </div>

            <!-- Action: Reveal Answer Button -->
            <div v-else class="mt-4">
              <button 
                @click="revealAnswer" 
                class="btn btn-lg btn-warning rounded-pill px-5 py-3 fw-black text-dark fs-4 shadow-2xl"
              >
                <span>💡 Javobni Ko'rsatish</span>
              </button>
            </div>

            <!-- Points Allocation to Teams -->
            <div v-if="activeModal.showAnswer" class="mt-5 pt-4 border-top border-secondary border-opacity-30">
              <h6 class="text-secondary small fw-bold mb-3">Ballni qaysi jamoaga qo'shish kerak?</h6>
              
              <div class="d-flex justify-content-center gap-3 flex-wrap">
                <div v-for="team in teams" :key="team.id" class="d-flex align-items-center gap-1">
                  <button 
                    @click="awardPoints(team, true)" 
                    class="btn btn-lg rounded-pill px-4 fw-bold shadow-lg"
                    :style="{ backgroundColor: team.color, color: '#FFF' }"
                  >
                    +{{ activeModal.points }} {{ team.name }}
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="modal-footer border-secondary border-opacity-25 px-5 py-3 justify-content-between">
            <small class="text-secondary">Savol tugagach yopish tugmasini bosing.</small>
            <button type="button" class="btn btn-secondary rounded-pill px-5 py-2 fw-bold" @click="closeQuestionModal">
              Katakchani Yopish
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ==================== GAME OVER / VICTORY PODIUM MODAL ==================== -->
    <div v-if="isGameOver" class="modal-backdrop fade show game-over-modal-backdrop"></div>

    <div v-if="isGameOver" class="modal fade show d-block game-over-modal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="gameOverModalTitle">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content text-light border-2 border-warning border-opacity-60 shadow-2xl rounded-5 text-center p-5 game-over-modal-content">
          
          <div class="display-1 mb-2">🏆</div>
          <h1 id="gameOverModalTitle" class="brand-font display-4 text-warning mb-2">Jeopardy G'olibi!</h1>
          
          <div class="my-4 p-4 rounded-4 border-2 border-warning bg-warning bg-opacity-10 d-inline-block px-5">
            <h2 class="display-5 fw-black text-white mb-1" :style="{ color: winningTeam.color }">
              {{ winningTeam.name }}
            </h2>
            <h3 class="display-6 fw-bold text-warning mb-0">
              {{ winningTeam.score }} Ball
            </h3>
          </div>

          <!-- Final Scoreboard -->
          <div class="row g-3 justify-content-center my-3">
            <div v-for="team in teams" :key="team.id" class="col-md-4">
              <div class="p-3 rounded-4 border border-secondary border-opacity-40 bg-dark shadow">
                <h6 class="text-white fw-bold mb-1">{{ team.name }}</h6>
                <span class="fs-4 fw-black text-warning">{{ team.score }} ball</span>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-center gap-3 mt-4">
            <button @click="resetGame" class="btn btn-lg btn-warning rounded-pill px-5 py-3 fw-bold text-dark shadow-lg">
              🔄 Qaytadan O'ynash
            </button>
            <button @click="router.push('/jeopardy')" class="btn btn-lg btn-outline-light rounded-pill px-5 py-3 fw-semibold">
              Jeopardy Studiyasiga Qaytish
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.jeopardy-game-arena {
  user-select: none;
}

.jeopardy-arena-grid {
  display: grid;
  gap: 0.85rem;
}

.arena-category-card {
  min-height: 85px;
}

.arena-point-card {
  min-height: 115px;
  background: linear-gradient(180deg, #0D1C3D 0%, #071024 100%);
  border: 2px solid rgba(59, 130, 246, 0.4);
}

.arena-point-card.hover-gold:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: #F59E0B !important;
  background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%) !important;
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.35) !important;
}

.arena-point-card.is-answered {
  background: #060B16 !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
  cursor: default;
  opacity: 0.4;
}

.question-text-massive {
  font-size: 2.2rem;
  line-height: 1.4;
}

.point-text {
  text-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
}

@media (max-width: 900px) {
  .arena-point-card {
    min-height: 80px;
    padding: 1rem !important;
  }
  .display-5 {
    font-size: 1.5rem !important;
  }
  .question-text-massive {
    font-size: 1.4rem !important;
  }
}

/* Modals specific classes */
.jeopardy-modal-backdrop { background-color: rgba(3, 7, 18, 0.95); backdrop-filter: blur(15px); z-index: 1060; }
.jeopardy-modal { z-index: 1065; }
.jeopardy-modal-content { background: radial-gradient(circle at top, #1E293B 0%, #070D1E 100%); }
.jeopardy-modal-header { background: linear-gradient(180deg, #1E3A8A 0%, #0F172A 100%); }
.jeopardy-answer-box { background: linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 47, 46, 0.98) 100%); border-color: #10B981 !important; }
.game-over-modal-backdrop { background-color: rgba(3, 7, 18, 0.95); backdrop-filter: blur(15px); z-index: 1070; }
.game-over-modal { z-index: 1075; }
.game-over-modal-content { background: radial-gradient(circle at center, #1E293B 0%, #070D1E 100%); }
</style>
