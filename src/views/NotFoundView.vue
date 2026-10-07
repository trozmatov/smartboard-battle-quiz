<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="not-found-container d-flex align-items-center justify-content-center text-center">
    <div class="glass-card p-5 rounded-5 border-danger border-opacity-50">
      <h1 class="display-1 fw-bold text-danger mb-0">404</h1>
      <h2 class="brand-font text-white mb-4">Sahifa topilmadi</h2>
      <p class="text-secondary mb-5">Siz qidirayotgan sahifa mavjud emas yoki o'chirilgan.</p>
      
      <button @click="goHome" class="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-lg">
        <i class="bi bi-house-door me-2"></i> Bosh sahifaga qaytish
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  min-height: calc(100vh - 70px);
  background: radial-gradient(circle at center, #0F172A 0%, #020617 100%);
}
</style>
