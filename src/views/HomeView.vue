<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { joinGameByPin } from '../firebase/gameService';
import { seedDefaultQuizzes, saveQuiz, DEFAULT_QUIZZES } from '../firebase/quizService';
import { createGameSession } from '../firebase/gameService';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';

const router = useRouter();
const { deviceMode, isSmartboard } = useDeviceMode();

const playerName = ref('');
const gamePin = ref('');
const loading = ref(false);
const quickLoading = ref(false);
const errorMessage = ref('');

// Smartboard on-screen numeric keypad input
function appendPin(digit) {
  if (gamePin.value.length < 6) {
    gamePin.value += digit.toString();
    sound.playTick();
  }
}

function clearPin() {
  gamePin.value = '';
}

function backspacePin() {
  gamePin.value = gamePin.value.slice(0, -1);
}

// Join via 6-digit Game PIN
async function handleJoinGame() {
  errorMessage.value = '';
  
  if (!playerName.value.trim()) {
    errorMessage.value = 'Please enter your name!';
    return;
  }

  if (!gamePin.value || gamePin.value.length < 6) {
    errorMessage.value = 'Please enter a valid 6-digit Game PIN.';
    return;
  }

  loading.value = true;
  try {
    const result = await joinGameByPin(gamePin.value.trim(), playerName.value.trim());
    sound.playCorrect();
    // Navigate to Game View with assigned role
    router.push({
      path: '/game',
      query: {
        gameId: result.gameId,
        role: result.role,
        name: playerName.value.trim()
      }
    });
  } catch (err) {
    errorMessage.value = err.message || 'Failed to join game session.';
    sound.playWrong();
  } finally {
    loading.value = false;
  }
}

// Quick Start: Instant 1v1 Split-Screen on this Smartboard
async function handleQuickLaunch() {
  quickLoading.value = true;
  errorMessage.value = '';
  try {
    const starterQuiz = DEFAULT_QUIZZES[0];
    const session = await createGameSession(starterQuiz);
    sound.playCorrect();
    router.push({
      path: '/game',
      query: {
        gameId: session.id,
        role: 'board', // Smartboard dual local touch mode
        mode: 'smartboard'
      }
    });
  } catch (err) {
    console.error('Quick launch error:', err);
    errorMessage.value = 'Could not launch quick game. Check Firebase setup.';
  } finally {
    quickLoading.value = false;
  }
}
</script>

<template>
  <div class="min-vh-100 d-flex flex-column bg-slate-950 text-light" style="background: radial-gradient(circle at top, #1E293B 0%, #0F172A 100%);">
    <Navbar />

    <main class="container my-auto py-5">
      <div class="row align-items-center justify-content-center g-5">
        
        <!-- Left Banner: Smartboard Visual & Features -->
        <div class="col-lg-6 text-center text-lg-start">
          <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary bg-opacity-20 border border-primary border-opacity-30 text-primary mb-3">
            <i class="bi bi-display-fill fs-5"></i>
            <span class="fw-semibold small">Interactive Smartboard Ready</span>
          </div>

          <h1 class="display-4 fw-extrabold brand-font text-white mb-3 leading-tight">
            Dual-Player <br />
            <span style="background: linear-gradient(135deg, #FF6B35 0%, #00BCD4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Split-Screen Quiz
            </span>
          </h1>

          <p class="fs-5 text-secondary mb-4">
            Two players. One smartboard. Real-time split-screen battle with live scores, timers, and instant feedback!
          </p>

          <div class="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
            <button 
              @click="handleQuickLaunch" 
              class="btn btn-lg btn-warning rounded-pill px-4 py-3 fw-bold shadow-lg d-flex align-items-center gap-2 text-dark"
              :disabled="quickLoading"
            >
              <i class="bi bi-lightning-charge-fill fs-4"></i>
              <span>{{ quickLoading ? 'Starting Arena...' : 'Instant Smartboard 1v1 Battle' }}</span>
            </button>

            <router-link 
              to="/teacher" 
              class="btn btn-lg btn-outline-light rounded-pill px-4 py-3 fw-semibold d-flex align-items-center gap-2"
            >
              <i class="bi bi-gear fs-5"></i>
              Teacher Dashboard
            </router-link>
          </div>
        </div>

        <!-- Right: Join PIN Card with Touch Keypad -->
        <div class="col-lg-5 col-md-8">
          <div class="card bg-dark text-light border border-secondary border-opacity-30 shadow-2xl rounded-4 p-4" style="background-color: #1E293B;">
            
            <div class="text-center mb-4">
              <h3 class="fw-bold brand-font text-white mb-1">
                <i class="bi bi-person-plus-fill text-info me-2"></i> Join Game
              </h3>
              <p class="text-secondary small mb-0">Enter your name & 6-digit Game PIN</p>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="alert alert-danger py-2 small d-flex align-items-center gap-2 rounded-3 mb-3">
              <i class="bi bi-exclamation-circle-fill"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <form @submit.prevent="handleJoinGame">
              <!-- Name Input -->
              <div class="mb-3">
                <label class="form-label small text-secondary fw-semibold">Your Name</label>
                <div class="input-group">
                  <span class="input-group-text bg-slate-900 border-secondary border-opacity-50 text-secondary">
                    <i class="bi bi-person-fill"></i>
                  </span>
                  <input 
                    v-model="playerName" 
                    type="text" 
                    class="form-control form-control-lg bg-dark text-white border-secondary border-opacity-50"
                    placeholder="e.g. Alex" 
                    maxlength="20"
                    required
                  />
                </div>
              </div>

              <!-- PIN Input -->
              <div class="mb-4">
                <label class="form-label small text-secondary fw-semibold">6-Digit PIN</label>
                <div class="input-group">
                  <span class="input-group-text bg-slate-900 border-secondary border-opacity-50 text-secondary">
                    <i class="bi bi-key-fill"></i>
                  </span>
                  <input 
                    v-model="gamePin" 
                    type="text" 
                    class="form-control form-control-lg bg-dark text-center text-warning fw-bold fs-3 letter-spacing border-secondary border-opacity-50"
                    placeholder="______" 
                    maxlength="6"
                    required
                  />
                </div>
              </div>

              <!-- On-Screen Numeric Keypad for Interactive Smartboards -->
              <div class="mb-4 d-none d-sm-block">
                <div class="row g-2 justify-content-center">
                  <div v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="n" class="col-4">
                    <button 
                      type="button" 
                      @click="appendPin(n)" 
                      class="btn btn-outline-secondary text-white w-100 py-2 fs-5 fw-bold rounded-3 keypad-btn"
                    >
                      {{ n }}
                    </button>
                  </div>
                  <div class="col-4">
                    <button 
                      type="button" 
                      @click="clearPin" 
                      class="btn btn-outline-danger text-danger w-100 py-2 fs-6 fw-bold rounded-3"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div class="col-4">
                    <button 
                      type="button" 
                      @click="appendPin(0)" 
                      class="btn btn-outline-secondary text-white w-100 py-2 fs-5 fw-bold rounded-3 keypad-btn"
                    >
                      0
                    </button>
                  </div>
                  <div class="col-4">
                    <button 
                      type="button" 
                      @click="backspacePin" 
                      class="btn btn-outline-warning text-warning w-100 py-2 fs-5 fw-bold rounded-3"
                    >
                      <i class="bi bi-backspace-fill"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <button 
                type="submit" 
                class="btn btn-primary btn-lg w-100 rounded-pill py-3 fw-bold fs-5 shadow-lg d-flex align-items-center justify-content-center gap-2"
                :disabled="loading"
              >
                <i class="bi bi-box-arrow-in-right fs-4"></i>
                <span>{{ loading ? 'Connecting...' : 'Join Game Arena' }}</span>
              </button>
            </form>

          </div>
        </div>

      </div>
    </main>

    <footer class="text-center text-secondary py-3 small border-top border-secondary border-opacity-25">
      Dual-Player Interactive Smartboard Application • Built with Vue 3 & Firebase Firestore
    </footer>
  </div>
</template>

<style scoped>
.letter-spacing {
  letter-spacing: 0.35rem;
}
.keypad-btn {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transition: all 0.1s ease;
}
.keypad-btn:active {
  background-color: rgba(56, 189, 248, 0.3);
  transform: scale(0.95);
}
</style>
