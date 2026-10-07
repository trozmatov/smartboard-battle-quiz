<script setup>
import { useRouter } from 'vue-router';
import { useDeviceMode } from '../composables/useDeviceMode';

const router = useRouter();
const { isSmartboard } = useDeviceMode();

const portals = [
  {
    id: 'quiz',
    title: 'Quiz Battle',
    desc: 'Talabalar o\'rtasida klassik testlar bo\'yicha 1v1 musobaqa.',
    icon: 'bi-controller',
    route: '/quiz-lobby',
    bg: '#3B82F6', // Blue
    imgPlaceholder: 'linear-gradient(135deg, #1E3A8A, #3B82F6)'
  },
  {
    id: 'jeopardy',
    title: 'Jeopardy',
    desc: 'Sinf uchun ochiq savollar doskasi. Guruhlarga bo\'linib o\'ynang!',
    icon: 'bi-grid-3x3-gap-fill',
    route: '/jeopardy-lobby', // Actually, wait, Jeopardy needs to load a board. Let's send them to a Jeopardy Lobby or directly to play if there's a default. Let's use /jeopardy-lobby for now or create a lobby later.
    bg: '#8B5CF6', // Purple
    imgPlaceholder: 'linear-gradient(135deg, #4C1D95, #8B5CF6)'
  },
  {
    id: 'maps',
    title: 'Interaktiv Xaritalar',
    desc: 'Geografik joylashuv va qit\'alar xaritasi bo\'yicha bellashuv.',
    icon: 'bi-globe-americas',
    route: '/maps',
    bg: '#10B981', // Green
    imgPlaceholder: 'linear-gradient(135deg, #064E3B, #10B981)'
  }
];

function navigateTo(routePath) {
  router.push(routePath);
}
</script>

<template>
  <div class="main-hub d-flex flex-column min-vh-100" style="background: #020617;">
    
    <!-- Abstract Background -->
    <div class="position-absolute top-0 start-0 w-100 h-100 z-0 overflow-hidden" style="opacity: 0.3; pointer-events: none;">
      <div class="position-absolute rounded-circle" style="width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); top: -20%; left: -10%;"></div>
      <div class="position-absolute rounded-circle" style="width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%); bottom: -20%; right: -10%;"></div>
    </div>

    <!-- Main Content -->
    <main class="flex-grow-1 container d-flex flex-column justify-content-center position-relative z-1 py-5">
      
      <div class="text-center mb-5 animate__animated animate__fadeInDown">
        <div class="d-inline-block px-4 py-2 rounded-pill mb-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
          <span class="text-info fw-bold letter-spacing-wide text-uppercase" style="font-size: 0.85rem;"><i class="bi bi-stars me-1"></i> HistoryPro Battle</span>
        </div>
        <h1 class="display-3 fw-bold text-white mb-3 text-shadow">O'yin rejimini tanlang</h1>
        <p class="lead text-secondary mx-auto" style="max-width: 600px;">
          Darsni qiziqarli o'tkazish uchun ta'limiy o'yinlardan birini tanlang.
        </p>
      </div>

      <div class="row g-4 justify-content-center align-items-stretch">
        <div 
          v-for="(portal, index) in portals" 
          :key="portal.id" 
          class="col-12 col-md-6 col-lg-4 animate__animated animate__zoomIn"
          :style="`animation-delay: ${index * 0.15}s;`"
        >
          <div 
            class="card portal-card h-100 border-0 rounded-4 overflow-hidden shadow-lg text-white text-center cursor-pointer"
            @click="navigateTo(portal.route)"
          >
            <!-- Top visual area -->
            <div class="portal-visual w-100 d-flex align-items-center justify-content-center" :style="`height: 180px; background: ${portal.imgPlaceholder};`">
               <i :class="`bi ${portal.icon} text-white`" style="font-size: 5rem; opacity: 0.9; text-shadow: 0 10px 20px rgba(0,0,0,0.3);"></i>
            </div>
            
            <div class="card-body p-4 d-flex flex-column bg-slate-900 position-relative">
               <!-- Accent line -->
               <div class="position-absolute top-0 start-0 w-100" :style="`height: 4px; background-color: ${portal.bg};`"></div>
               
               <h3 class="fw-bold mb-3">{{ portal.title }}</h3>
               <p class="text-secondary mb-4 flex-grow-1">{{ portal.desc }}</p>
               
               <button class="btn rounded-pill fw-bold w-100 mt-auto portal-btn shadow" :style="`background-color: rgba(255,255,255,0.05); color: ${portal.bg}; border: 1px solid rgba(255,255,255,0.1);`">
                  Kirish <i class="bi bi-arrow-right ms-1"></i>
               </button>
            </div>
          </div>
        </div>
      </div>

    </main>

  </div>
</template>

<style scoped>
.bg-slate-900 {
  background-color: #0F172A;
}

.portal-card {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background-color: transparent;
}

.portal-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6) !important;
}

.portal-visual i {
  transition: transform 0.4s ease;
}
.portal-card:hover .portal-visual i {
  transform: scale(1.15) translateY(-5px);
}

.portal-btn {
  transition: all 0.3s ease;
}
.portal-card:hover .portal-btn {
  background-color: #1E293B !important;
  color: #fff !important;
  border-color: rgba(255,255,255,0.2) !important;
}

.text-shadow {
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.letter-spacing-wide {
  letter-spacing: 1px;
}
</style>
