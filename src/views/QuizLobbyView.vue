<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getQuizzes } from '../firebase/quizService';
import { createGameSession } from '../firebase/gameService';
import { sound } from '../utils/sound';

const router = useRouter();
const quizzes = ref([]);
const loading = ref(true);

const selectedQuiz = ref(null);
const p1Name = ref('1-O\'yinchi');
const p2Name = ref('2-O\'yinchi');
const startingGame = ref(false);

onMounted(async () => {
  try {
    quizzes.value = await getQuizzes();
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
});

function selectQuiz(quiz) {
  sound.playTick();
  
  // Store quiz locally to avoid Firebase hanging for Smartboard mode
  sessionStorage.setItem('localQuizData', JSON.stringify(quiz));
  
  router.push({
    path: '/game',
    query: {
      local: 'true',
      role: 'board',
      mode: 'smartboard'
    }
  });
}
</script>

<template>
  <div class="min-vh-100 bg-slate-950 text-light py-5" style="background: radial-gradient(circle at top, #1E293B 0%, #0F172A 100%);">
    <div class="container">
      
      <!-- Top Header -->
      <div class="text-center mb-5">
        <h1 class="display-4 fw-extrabold text-white mb-3 text-shadow">
          1v1 <span class="text-info">Quiz Battle</span>
        </h1>
        <p class="fs-5 text-secondary">
          Barcha mavjud testlar. O'zingizga kerakli testni tanlang va raqibingiz bilan kuch sinashing!
        </p>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-info" role="status"></div>
        <p class="mt-3 text-secondary">Testlar yuklanmoqda...</p>
      </div>

      <div class="row g-4">
        <div 
          v-for="(quiz, idx) in quizzes" 
          :key="quiz.id" 
          class="col-md-6 col-lg-4 animate__animated animate__fadeInUp"
          :style="{ animationDelay: (idx * 0.1) + 's' }"
        >
          <div 
            class="card h-100 bg-dark text-white border-0 rounded-4 shadow-lg cursor-pointer quiz-card"
            @click="selectQuiz(quiz)"
          >
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-center gap-2 mb-3">
                <span class="fs-2">{{ quiz.isAiGenerated ? '🤖' : '📝' }}</span>
                <span v-if="quiz.isAiGenerated" class="badge bg-warning text-dark rounded-pill fs-8">AI Test</span>
                <span v-else class="badge bg-primary rounded-pill fs-8">Maxsus</span>
              </div>
              <h4 class="fw-bold mb-3 flex-grow-1">{{ quiz.title }}</h4>
              <div class="d-flex justify-content-between align-items-center mt-auto">
                <span class="text-secondary small">
                  <i class="bi bi-ui-checks-grid me-1"></i> {{ quiz.questions?.length || 0 }} ta savol
                </span>
                <button class="btn btn-outline-info rounded-pill btn-sm fw-bold">Tanlash</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- The Name Form was here, removed per user request -->

    </div>
  </div>
</template>

<style scoped>
.quiz-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(255,255,255,0.1) !important;
}
.quiz-card:hover {
  transform: translateY(-5px);
  border-color: #0dcaf0 !important;
  box-shadow: 0 10px 25px rgba(13, 202, 240, 0.2) !important;
}
.bg-slate-900 {
  background-color: #0F172A;
}
</style>
