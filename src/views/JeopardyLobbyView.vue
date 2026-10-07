<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getJeopardyGames } from '../firebase/jeopardyService';
import { sound } from '../utils/sound';

const router = useRouter();
const games = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    games.value = await getJeopardyGames();
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
});

function launchGame(id) {
  sound.playCorrect();
  router.push({
    path: '/jeopardy/play',
    query: { id }
  });
}
</script>

<template>
  <div class="min-vh-100 bg-slate-950 text-light py-5" style="background: radial-gradient(circle at top, #312e81 0%, #0F172A 100%);">
    <div class="container">
      
      <!-- Top Header -->
      <div class="text-center mb-5">
        <h1 class="display-4 fw-extrabold text-white mb-3 text-shadow">
          Sinf uchun <span class="text-warning">Jeopardy!</span>
        </h1>
        <p class="fs-5 text-secondary">
          Mavjud Jeopardy o'yinlari ro'yxati. O'zingizga ma'qulini tanlang va sinfni guruhlarga bo'lib o'ynang!
        </p>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-secondary">O'yinlar yuklanmoqda...</p>
      </div>

      <div v-else class="row g-4 justify-content-center">
        <div 
          v-for="(game, idx) in games" 
          :key="game.id" 
          class="col-md-6 col-lg-4 animate__animated animate__zoomIn"
          :style="{ animationDelay: (idx * 0.1) + 's' }"
        >
          <div 
            class="card h-100 bg-dark text-white border-0 rounded-4 shadow-lg cursor-pointer jeopardy-card position-relative overflow-hidden"
            @click="launchGame(game.id)"
          >
            <!-- Decorative Accent -->
            <div class="position-absolute top-0 start-0 w-100" style="height: 4px; background: linear-gradient(90deg, #F59E0B, #EF4444);"></div>

            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="p-2 rounded-circle bg-warning bg-opacity-20 text-warning d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                  <i class="bi bi-grid-3x3-gap-fill fs-3"></i>
                </div>
                <span v-if="game.isTemplate" class="badge bg-secondary rounded-pill">Namuna</span>
              </div>
              
              <h4 class="fw-bold mb-3 flex-grow-1">{{ game.title }}</h4>
              
              <div class="d-flex justify-content-between align-items-center mt-auto">
                <span class="text-secondary small">
                  <i class="bi bi-tags-fill me-1 text-warning"></i> {{ game.categories?.length || 0 }} ta Kategoriya
                </span>
                <button class="btn btn-warning text-dark rounded-pill btn-sm fw-bold shadow-sm px-3">
                  O'ynash <i class="bi bi-play-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="games.length === 0 && !loading" class="col-12 text-center text-secondary">
          <p>Hozircha saqlangan Jeopardy o'yinlar yo'q. Ustoz panelidan yarating.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.jeopardy-card {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background-color: #1E293B !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
}
.jeopardy-card:hover {
  transform: translateY(-8px);
  border-color: #F59E0B !important;
  box-shadow: 0 15px 30px rgba(245, 158, 11, 0.2) !important;
}
</style>
