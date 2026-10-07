<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';

const route = useRoute();

// Game views require fullscreen, so we hide the navbar
const hideNavbar = computed(() => {
  const gameRoutes = ['GameView', 'JeopardyGameView', 'MapGameView'];
  return gameRoutes.includes(route.name);
});
</script>

<template>
  <div id="app-root">
    <Navbar v-if="!hideNavbar" />
    <router-view class="flex-grow-1" />
  </div>
</template>

<style>
#app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
