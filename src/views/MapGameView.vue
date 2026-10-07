<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import confetti from 'canvas-confetti';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';
import { useMapScores } from '../composables/useMapScores';
import { fetchWorldGeoJSON, generateMapQuestions, UZ_COUNTRIES, REGIONS_CONFIG, getRegionBounds } from '../services/mapQuizService';

const router = useRouter();
const route = useRoute();
const { deviceMode } = useDeviceMode();
const { updateScore } = useMapScores();

const regionId = route.query.region || 'world';
const currentRegion = REGIONS_CONFIG.find(r => r.id === regionId);

const isLoading = ref(true);
const geoJsonData = ref(null);

const game = ref({
  status: 'in_progress',
  currentQuestionIndex: 0,
  roundEnded: false,
  questions: [],
  p1Questions: [],
  p2Questions: [],
  p1: { name: '1-O\'yinchi', score: 0, answeredCurrent: false, isCorrect: null, clickedName: null },
  p2: { name: '2-O\'yinchi', score: 0, answeredCurrent: false, isCorrect: null, clickedName: null }
});

const timeLeft = ref(20);
const isTimerRunning = ref(false);
let timerInterval = null;
let autoAdvanceTimer = null;
const soundEnabled = ref(true);

const p1MapContainer = ref(null);
const p2MapContainer = ref(null);
let p1Map = null;
let p2Map = null;
let p1GeoLayer = null;
let p2GeoLayer = null;

// Track layers by country name for quick highlighting
const p1Layers = {};
const p2Layers = {};

const p1CurrentQuestion = computed(() => game.value.p1Questions[game.value.currentQuestionIndex] || null);
const p2CurrentQuestion = computed(() => game.value.p2Questions[game.value.currentQuestionIndex] || null);
const totalQuestions = computed(() => game.value.questions.length);
const isGameOver = computed(() => game.value.status === 'finished' || (game.value.currentQuestionIndex >= totalQuestions.value && totalQuestions.value > 0));

const winner = computed(() => {
  if (game.value.p1.score > game.value.p2.score) return { name: game.value.p1.name, player: 'p1', score: game.value.p1.score };
  if (game.value.p2.score > game.value.p1.score) return { name: game.value.p2.name, player: 'p2', score: game.value.p2.score };
  return { name: "Durang!", player: 'tie', score: game.value.p1.score };
});

function toggleAudio() {
  soundEnabled.value = sound.toggleSound();
}

function exitToLobby() {
  if (!isGameOver.value) {
    if (!confirm("O'yinni rostan ham to'xtatib, hududlarga qaytmoqchimisiz?")) return;
  }
  router.push('/maps');
}

async function initGame() {
  if (!currentRegion) {
    router.replace('/maps');
    return;
  }

  isLoading.value = true;
  geoJsonData.value = await fetchWorldGeoJSON();
  if (!geoJsonData.value) {
    alert("Xarita yuklanmadi. Internetni tekshiring.");
    router.push('/maps');
    return;
  }

  const questionLimit = parseInt(route.query.limit) || 10;
  const baseQuestions = generateMapQuestions(geoJsonData.value.features, questionLimit, regionId);
  if (baseQuestions.length === 0) {
    alert("Bu hududda savollar yetarli emas.");
    router.push('/maps');
    return;
  }

  game.value.questions = baseQuestions;
  game.value.p1Questions = [...baseQuestions].sort(() => Math.random() - 0.5);
  game.value.p2Questions = [...baseQuestions].sort(() => Math.random() - 0.5);

  isLoading.value = false;
  
  await nextTick();
  initMaps();
  startTimer(20);
}

function initMaps() {
  const mapOptions = {
    attributionControl: false,
    zoomControl: false, // will handle via touch/scroll
    minZoom: 1,
    maxZoom: 6,
    maxBounds: [[-90, -180], [90, 180]]
  };

  const bounds = getRegionBounds(geoJsonData.value, regionId);

  if (p1MapContainer.value && !p1Map) {
    p1Map = L.map(p1MapContainer.value, mapOptions);
    if (bounds) p1Map.fitBounds(bounds, { padding: [10, 10] });
    else p1Map.setView([20, 0], 2);

    p1GeoLayer = L.geoJSON(geoJsonData.value, {
      style: getBaseStyle,
      onEachFeature: (f, l) => {
        p1Layers[f.properties.name] = l;
        l.on('click', () => handleMapClick('p1', f));
      }
    }).addTo(p1Map);
  }

  if (p2MapContainer.value && !p2Map) {
    p2Map = L.map(p2MapContainer.value, mapOptions);
    if (bounds) p2Map.fitBounds(bounds, { padding: [10, 10] });
    else p2Map.setView([20, 0], 2);

    p2GeoLayer = L.geoJSON(geoJsonData.value, {
      style: getBaseStyle,
      onEachFeature: (f, l) => {
        p2Layers[f.properties.name] = l;
        l.on('click', () => handleMapClick('p2', f));
      }
    }).addTo(p2Map);
  }
}

function getBaseStyle() {
  return { 
    color: '#64748B', // Lighter slate for clear borders
    weight: 1.5,      // Slightly thicker border for readability
    fillColor: '#1E293B', // Slate-800 for land (contrasts with Slate-950 background)
    fillOpacity: 1 
  };
}

function resetMapStyles() {
  if (p1GeoLayer) p1GeoLayer.setStyle(getBaseStyle);
  if (p2GeoLayer) p2GeoLayer.setStyle(getBaseStyle);
}

function startTimer(duration) {
  stopTimer();
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  timeLeft.value = duration || 20;
  isTimerRunning.value = true;

  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
      if (timeLeft.value <= 5 && timeLeft.value > 0) sound.playTick();
    } else {
      stopTimer();
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  isTimerRunning.value = false;
}

function handleTimeOut() {
  sound.playWrong();
  game.value.roundEnded = true;

  // Highlight correct answers if they didn't answer
  if (!game.value.p1.answeredCurrent && p1CurrentQuestion.value) {
    highlightCountry('p1', p1CurrentQuestion.value.targetCountryName, '#10B981'); // Green
  }
  if (!game.value.p2.answeredCurrent && p2CurrentQuestion.value) {
    highlightCountry('p2', p2CurrentQuestion.value.targetCountryName, '#10B981');
  }

  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(handleNextQuestion, 2500);
}

function highlightCountry(playerKey, countryName, color) {
  const layers = playerKey === 'p1' ? p1Layers : p2Layers;
  if (layers[countryName]) {
    layers[countryName].setStyle({ fillColor: color });
  }
}

function handleMapClick(playerKey, feature) {
  if (isGameOver.value || game.value.roundEnded) return;
  const player = game.value[playerKey];
  if (player.answeredCurrent) return;

  const question = playerKey === 'p1' ? p1CurrentQuestion.value : p2CurrentQuestion.value;
  if (!question) return;

  const clickedName = feature.properties.name;
  const targetName = question.targetCountryName;
  const isCorrect = clickedName === targetName;
  
  player.answeredCurrent = true;
  player.isCorrect = isCorrect;
  player.clickedName = UZ_COUNTRIES[clickedName]?.uz || clickedName;
  
  if (isCorrect) {
    player.score += question.points;
    sound.playCorrect();
    highlightCountry(playerKey, clickedName, '#10B981'); // Green
  } else {
    sound.playWrong();
    highlightCountry(playerKey, clickedName, '#EF4444'); // Red
    highlightCountry(playerKey, targetName, '#10B981'); // Show correct in green
  }

  const otherKey = playerKey === 'p1' ? 'p2' : 'p1';
  if (game.value[otherKey].answeredCurrent) {
    stopTimer();
    game.value.roundEnded = true;
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(handleNextQuestion, 2500);
  }
}

function handleNextQuestion() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  const nextIdx = game.value.currentQuestionIndex + 1;
  if (nextIdx >= totalQuestions.value) {
    game.value.status = 'finished';
    
    // Save highest score for local achievement
    const topScore = Math.max(game.value.p1.score, game.value.p2.score);
    updateScore(regionId, topScore);
    
    triggerConfetti();
    sound.playFanfare();
    return;
  }

  game.value.currentQuestionIndex = nextIdx;
  game.value.roundEnded = false;
  game.value.p1.answeredCurrent = false;
  game.value.p1.isCorrect = null;
  game.value.p1.clickedName = null;
  game.value.p2.answeredCurrent = false;
  game.value.p2.isCorrect = null;
  game.value.p2.clickedName = null;

  resetMapStyles();
  startTimer(20);
}

function triggerConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function restartGame() {
  game.value.status = 'in_progress';
  game.value.currentQuestionIndex = 0;
  game.value.roundEnded = false;
  game.value.p1.score = 0;
  game.value.p2.score = 0;
  game.value.p1.answeredCurrent = false;
  game.value.p2.answeredCurrent = false;
  
  // Reshuffle questions
  game.value.p1Questions = [...game.value.questions].sort(() => Math.random() - 0.5);
  game.value.p2Questions = [...game.value.questions].sort(() => Math.random() - 0.5);
  
  resetMapStyles();
  startTimer(20);
}

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  stopTimer();
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  if (p1Map) p1Map.remove();
  if (p2Map) p2Map.remove();
});
</script>

<template>
  <div class="game-viewport bg-slate-950">
    <!-- Loading State -->
    <div v-if="isLoading" class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-white" style="background: radial-gradient(circle at bottom right, #0F172A 0%, #020617 100%);">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
      <h3 class="mt-3 brand-font">Xarita yuklanmoqda...</h3>
    </div>

    <template v-else>
      <!-- Top HUD Header -->
      <header class="hud-header border-bottom border-secondary border-opacity-30 p-2" style="background-color: #0B1120;">
        <div class="hud-player">
          <div class="hud-avatar" style="background-color: #FF5722;"><i class="bi bi-person-fill"></i></div>
          <div>
            <div class="fw-bold text-white fs-6">{{ game.p1.name }}</div>
            <div class="text-warning fw-bold">{{ game.p1.score }} pts</div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-3">
          <div class="d-flex flex-column align-items-center d-none d-md-flex">
            <span class="badge" :style="`background-color: ${currentRegion?.bg}; color: #fff;`">
              {{ currentRegion?.icon }} {{ currentRegion?.name }}
            </span>
            <div class="badge bg-secondary bg-opacity-40 text-light px-3 py-1 mt-1 rounded-pill">
              Savol {{ game.currentQuestionIndex + 1 }} / {{ totalQuestions }}
            </div>
          </div>
          
          <div class="hud-timer-badge px-3 py-1 bg-dark text-white rounded-pill border border-secondary" :class="{ 'text-danger border-danger': timeLeft <= 5 && timeLeft > 0 }">
            <i class="bi bi-stopwatch me-1"></i> {{ timeLeft }}s
          </div>
          
          <div class="d-flex gap-2">
            <button @click="handleNextQuestion" class="btn btn-sm btn-outline-light rounded-pill px-3" :disabled="isGameOver" aria-label="Keyingisi">Keyingisi <i class="bi bi-chevron-right"></i></button>
            <button @click="toggleAudio" class="btn btn-sm btn-outline-secondary rounded-circle text-light"><i :class="soundEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill'"></i></button>
            <button @click="exitToLobby" class="btn btn-sm btn-outline-danger rounded-circle text-light" title="Hududlarga qaytish"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>

        <div class="hud-player justify-content-end text-end">
          <div>
            <div class="fw-bold text-white fs-6">{{ game.p2.name }}</div>
            <div class="text-info fw-bold">{{ game.p2.score }} pts</div>
          </div>
          <div class="hud-avatar" style="background-color: #0288D1;"><i class="bi bi-person-fill"></i></div>
        </div>
      </header>

      <!-- Main Split-Screen Arena -->
      <main v-if="!isGameOver" class="split-arena d-flex flex-column flex-md-row" style="height: calc(100dvh - 60px);">
        
        <!-- PLAYER 1 (Left/Top) -->
        <section class="player-half flex-grow-1 position-relative border-end border-secondary border-opacity-50" style="background-color: #020617;">
          <div class="position-absolute top-0 start-50 translate-middle-x mt-3 z-3 w-75 text-center" style="pointer-events: none;">
            <div class="glass-card px-4 py-2 rounded-pill border border-warning shadow-lg d-inline-block" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);">
              <span class="text-warning small text-uppercase fw-bold d-block mb-1">Topishingiz kerak:</span>
              <h3 class="text-white mb-0 px-3">{{ p1CurrentQuestion?.targetCountryUz }}</h3>
            </div>
            
            <div v-if="game.p1.answeredCurrent" class="mt-2 animate__animated animate__fadeIn">
              <span v-if="game.p1.isCorrect" class="badge bg-success fs-6 py-2 px-3 shadow"><i class="bi bi-check-circle-fill"></i> To'g'ri! (+{{ p1CurrentQuestion.points }})</span>
              <span v-else class="badge bg-danger fs-6 py-2 px-3 shadow"><i class="bi bi-x-circle-fill"></i> Xato! Bu {{ game.p1.clickedName }} edi</span>
            </div>
          </div>
          <div ref="p1MapContainer" class="w-100 h-100" style="z-index: 1;"></div>
        </section>

        <!-- PLAYER 2 (Right/Bottom) -->
        <section class="player-half flex-grow-1 position-relative" style="background-color: #020617;">
          <div class="position-absolute top-0 start-50 translate-middle-x mt-3 z-3 w-75 text-center" style="pointer-events: none;">
            <div class="glass-card px-4 py-2 rounded-pill border border-info shadow-lg d-inline-block" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);">
              <span class="text-info small text-uppercase fw-bold d-block mb-1">Topishingiz kerak:</span>
              <h3 class="text-white mb-0 px-3">{{ p2CurrentQuestion?.targetCountryUz }}</h3>
            </div>
            
            <div v-if="game.p2.answeredCurrent" class="mt-2 animate__animated animate__fadeIn">
              <span v-if="game.p2.isCorrect" class="badge bg-success fs-6 py-2 px-3 shadow"><i class="bi bi-check-circle-fill"></i> To'g'ri! (+{{ p2CurrentQuestion.points }})</span>
              <span v-else class="badge bg-danger fs-6 py-2 px-3 shadow"><i class="bi bi-x-circle-fill"></i> Xato! Bu {{ game.p2.clickedName }} edi</span>
            </div>
          </div>
          <div ref="p2MapContainer" class="w-100 h-100" style="z-index: 1;"></div>
        </section>
      </main>

      <!-- Game Over -->
      <div v-if="isGameOver" class="flex-grow-1 d-flex align-items-center justify-content-center p-4" style="height: calc(100dvh - 60px); background: radial-gradient(circle, #1E293B 0%, #0B1120 100%);">
        <div class="card bg-slate-900 border border-secondary border-opacity-50 text-white rounded-5 shadow-2xl p-5 text-center" style="max-width: 750px; background-color: #1E293B;">
          <div class="mb-3 animate__animated animate__bounceIn"><span class="display-1">🏆</span></div>
          <h1 class="display-4 fw-bold brand-font mb-2" :style="`color: ${currentRegion?.bg || '#FFD700'};`">
            {{ winner.player === 'tie' ? "DURANG!" : `${winner.name} G'OLIB!` }}
          </h1>
          <p class="fs-5 text-secondary mb-4">
            <span class="badge fs-6 me-2" :style="`background-color: ${currentRegion?.bg}; color: #fff;`">{{ currentRegion?.name }}</span>
            bo'yicha ajoyib natija!
          </p>

          <div class="row g-4 justify-content-center mb-5">
            <div class="col-sm-5">
              <div class="p-4 rounded-4 border text-center transition-all" :class="winner.player === 'p1' ? 'border-warning bg-warning bg-opacity-10 shadow-lg' : 'border-secondary border-opacity-25 bg-dark'">
                <h4 class="fw-bold text-white">{{ game.p1.name }}</h4>
                <div class="display-5 fw-bold text-warning mt-2">{{ game.p1.score }} <span class="fs-6 text-secondary">pts</span></div>
              </div>
            </div>
            <div class="col-sm-5">
              <div class="p-4 rounded-4 border text-center transition-all" :class="winner.player === 'p2' ? 'border-info bg-info bg-opacity-10 shadow-lg' : 'border-secondary border-opacity-25 bg-dark'">
                <h4 class="fw-bold text-white">{{ game.p2.name }}</h4>
                <div class="display-5 fw-bold text-info mt-2">{{ game.p2.score }} <span class="fs-6 text-secondary">pts</span></div>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-3 justify-content-center">
            <button @click="restartGame" class="btn btn-lg rounded-pill px-5 py-3 fw-bold shadow-lg" :style="`background-color: ${currentRegion?.bg || '#FFD700'}; color: #fff; border: none;`">
              <i class="bi bi-arrow-repeat fs-4 me-2"></i> Qayta o'ynash
            </button>
            <button @click="exitToLobby" class="btn btn-lg btn-outline-light rounded-pill px-5 py-3 fw-semibold">
              <i class="bi bi-map fs-5 me-2"></i> Boshqa hududni tanlash
            </button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.z-3 {
  z-index: 1000 !important; /* Above Leaflet controls */
}
</style>
