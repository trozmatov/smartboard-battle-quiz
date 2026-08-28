<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';

const router = useRouter();
const route = useRoute();
const soundOn = ref(true);
const { deviceMode, toggleMode } = useDeviceMode();

function toggleSound() {
  soundOn.value = sound.toggleSound();
}

function handleToggleMode() {
  toggleMode();
  sound.playTick();
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark border-bottom border-secondary border-opacity-30 px-3 py-2" style="background-color: #0B1120;">
    <div class="container-fluid">
      <router-link to="/" class="navbar-brand d-flex align-items-center gap-2">
        <span class="fs-3">⚡</span>
        <span class="fw-bold tracking-wide" style="font-family: var(--font-display); background: linear-gradient(135deg, #FF6B35, #00BCD4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          Smartboard Quiz Battle
        </span>
      </router-link>

      <div class="d-flex align-items-center gap-2 ms-auto flex-wrap">
        
        <!-- UI / UX Mode Switcher Toggle -->
        <div class="btn-group btn-group-sm rounded-pill p-1 border border-secondary border-opacity-50" style="background-color: #1E293B;">
          <button 
            @click="handleToggleMode" 
            class="btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 transition-all"
            :class="deviceMode === 'smartboard' ? 'btn-warning text-dark fw-bold shadow' : 'btn-dark text-secondary'"
            title="Dars vaqtida katta sensorli doska uchun moslashtirilgan ko'rinish"
          >
            <span>📺</span>
            <span class="fw-bold">Smartboard</span>
          </button>
          
          <button 
            @click="handleToggleMode" 
            class="btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 transition-all"
            :class="deviceMode === 'laptop' ? 'btn-primary text-white fw-bold shadow' : 'btn-dark text-secondary'"
            title="Ustoz testlarni noutbuk/kompyuterda qulay tuzishi uchun moslashtirilgan ko'rinish"
          >
            <span>💻</span>
            <span class="fw-bold">Laptop</span>
          </button>
        </div>

        <!-- Sound Toggle -->
        <button 
          @click="toggleSound" 
          class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3 py-1 d-flex align-items-center gap-1"
          :title="soundOn ? 'Ovozni o\'chirish' : 'Ovozni yoqish'"
        >
          <span>{{ soundOn ? '🔊' : '🔇' }}</span>
          <span class="d-none d-md-inline small">{{ soundOn ? 'Ovoz Yoniq' : 'Ovoz O\'chiq' }}</span>
        </button>

        <!-- Navigation Links -->
        <router-link 
          to="/" 
          class="btn btn-sm rounded-pill px-3"
          :class="route.path === '/' ? 'btn-primary' : 'btn-outline-light'"
        >
          <span>🎮 O'yin</span>
        </router-link>

        <router-link 
          to="/teacher" 
          class="btn btn-sm rounded-pill px-3"
          :class="route.path === '/teacher' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning'"
        >
          <span>⚙️ Ustoz Paneli</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>
