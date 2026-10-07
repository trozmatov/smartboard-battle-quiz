<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { REGIONS_CONFIG } from '../services/mapQuizService';
import { useMapScores } from '../composables/useMapScores';

const { getBestScore } = useMapScores();
const router = useRouter();

const selectedRegion = ref(null);
const selectedSubRegion = ref('all');
const questionLimit = ref(10); // default 10

function openConfigModal(region) {
  selectedRegion.value = region;
  selectedSubRegion.value = 'all'; // default to all
}

function cancelConfig() {
  selectedRegion.value = null;
}

function startGame() {
  if (!selectedRegion.value) return;
  router.push({ 
    path: '/map-game', 
    query: { 
      region: selectedRegion.value.id,
      subRegion: selectedSubRegion.value,
      limit: questionLimit.value
    } 
  });
}
</script>

<template>
  <div class="maps-lobby-container p-4 min-vh-100 pb-5 position-relative overflow-hidden" style="background: #020617;">
    <!-- Abstract Background Elements -->
    <div class="position-absolute top-0 start-0 w-100 h-100 z-0" style="opacity: 0.4;">
      <div class="position-absolute rounded-circle" style="width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); top: -200px; left: -200px;"></div>
      <div class="position-absolute rounded-circle" style="width: 800px; height: 800px; background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%); bottom: -300px; right: -200px;"></div>
    </div>

    <div class="container py-4 position-relative z-1">
      
      <div class="text-center mb-5 animate__animated animate__fadeInDown">
        <h1 class="display-4 fw-bold brand-font text-white mb-3" style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">Interaktiv Xaritalar 🌍</h1>
        <p class="lead text-secondary mx-auto fs-5" style="max-width: 650px;">
          Jahon va qit'alar xaritasida davlatlar joylashuvini o'rganing. 1v1 split-screen orqali do'stingiz bilan bellashing!
        </p>
      </div>

      <div class="row g-4 justify-content-center">
        <!-- Loop over regions to create cards -->
        <div 
          v-for="(region, index) in REGIONS_CONFIG" 
          :key="region.id"
          class="col-12 col-md-6 col-xl-4 animate__animated animate__fadeInUp"
          :style="`animation-delay: ${index * 0.1}s;`"
        >
          <div 
            class="card h-100 region-card border-0 rounded-4 overflow-hidden position-relative shadow-lg text-white"
            @click="openConfigModal(region)"
          >
            <!-- Glowing background gradient -->
            <div class="card-bg-glow position-absolute top-0 start-0 w-100 h-100" :style="`background: radial-gradient(circle at top right, ${region.bg}22 0%, #1E293B 80%);`"></div>
            
            <!-- Top Gradient Border -->
            <div class="position-absolute top-0 start-0 w-100" :style="`height: 4px; background: linear-gradient(90deg, ${region.bg}, transparent);`"></div>
            
            <div class="card-body p-4 d-flex flex-column position-relative z-1">
              
              <div class="d-flex justify-content-between align-items-start mb-4">
                <div class="region-icon shadow d-flex align-items-center justify-content-center rounded-4 fs-1" :style="`background: linear-gradient(135deg, #1E293B 0%, ${region.bg}44 100%); border: 1px solid ${region.bg}44; width: 72px; height: 72px;`">
                  {{ region.icon }}
                </div>
                <div class="text-end">
                  <span class="badge rounded-pill px-3 py-2 fw-semibold shadow-sm" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                    <i class="bi bi-pin-map-fill me-1" :style="`color: ${region.bg};`"></i>
                    {{ region.total }} davlat
                  </span>
                </div>
              </div>

              <h3 class="card-title fw-bold mb-2" style="letter-spacing: -0.5px;">{{ region.name }}</h3>
              <p class="text-secondary mb-4 flex-grow-1" style="font-size: 0.95rem; line-height: 1.5;">
                {{ region.desc }}
              </p>

              <!-- Best Score Section -->
              <div class="best-score-box d-flex align-items-center justify-content-between mt-auto p-3 rounded-3" style="background: rgba(2, 6, 23, 0.4); border: 1px solid rgba(255,255,255,0.05);">
                <div class="d-flex align-items-center gap-2">
                  <div class="trophy-icon rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; background: rgba(255, 215, 0, 0.15);">
                    <i class="bi bi-trophy-fill text-warning fs-6"></i>
                  </div>
                  <span class="fw-semibold text-secondary fs-7 text-uppercase tracking-wide">Eng yaxshi</span>
                </div>
                <div class="fs-4 fw-bold" :style="`color: ${region.bg}; text-shadow: 0 0 10px ${region.bg}44;`">
                  {{ getBestScore(region.id) }} <span class="fs-7 text-secondary fw-normal">pts</span>
                </div>
              </div>

              <!-- Start Hover Overlay Button (visible on hover) -->
              <div class="start-btn-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); opacity: 0; transition: all 0.3s ease;">
                <button class="btn btn-lg rounded-pill px-4 py-2 fw-bold shadow-lg d-flex align-items-center gap-2" :style="`background-color: ${region.bg}; color: #fff; border: none; transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);`">
                  <i class="bi bi-play-circle-fill fs-4"></i> <span>O'yinni Boshlash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Config Modal Overlay -->
      <div v-if="selectedRegion" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.8); z-index: 1050; backdrop-filter: blur(5px);">
        <div class="card bg-dark text-white border-info border-opacity-50 rounded-4 p-4 shadow-2xl animate__animated animate__zoomIn" style="max-width: 400px; width: 90%;">
          
          <div class="text-center mb-4">
            <div class="fs-1 mb-2">{{ selectedRegion.icon }}</div>
            <h4 class="fw-bold">{{ selectedRegion.name }}</h4>
            <p class="text-secondary small mb-0">Test uchun savollar sonini tanlang</p>
          </div>

          <div class="mb-4" v-if="selectedRegion.subRegions && selectedRegion.subRegions.length > 1">
            <label class="form-label text-warning fw-bold">Mintaqani tanlang</label>
            <select v-model="selectedSubRegion" class="form-select form-select-lg bg-slate-900 text-white border-warning mb-3">
              <option v-for="sub in selectedRegion.subRegions" :key="sub.id" :value="sub.id">
                {{ sub.name }}
              </option>
            </select>
          </div>

          <div class="mb-4">
            <label class="form-label text-info fw-bold">Topshiriqlar soni</label>
            <select v-model="questionLimit" class="form-select form-select-lg bg-slate-900 text-white border-secondary">
              <option :value="10">10 ta savol</option>
              <option :value="15">15 ta savol</option>
              <option :value="20">20 ta savol</option>
              <option :value="'all'">Barchasi</option>
            </select>
          </div>

          <div class="d-flex gap-2">
            <button @click="cancelConfig" class="btn btn-outline-secondary w-50 rounded-pill fw-bold">Bekor qilish</button>
            <button @click="startGame" class="btn btn-info w-50 rounded-pill fw-bold text-dark">Boshlash</button>
          </div>
          
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.region-card {
  background-color: #1E293B;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255,255,255,0.05) !important;
}

.region-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255,255,255,0.05) !important;
  border-color: rgba(255,255,255,0.1) !important;
}

.region-icon {
  transition: transform 0.3s ease;
}

.region-card:hover .region-icon {
  transform: scale(1.1) rotate(-5deg);
}

.region-card:hover .start-btn-overlay {
  opacity: 1 !important;
}

.region-card:hover .start-btn-overlay button {
  transform: scale(1) !important;
}

.tracking-wide {
  letter-spacing: 0.05rem;
}
.fs-7 {
  font-size: 0.85rem;
}
</style>
