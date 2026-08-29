import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TeacherDashboard from '../views/TeacherDashboard.vue';
import GameView from '../views/GameView.vue';
import JeopardyCreator from '../views/JeopardyCreator.vue';
import JeopardyGameView from '../views/JeopardyGameView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'Join Quiz Battle' }
  },
  {
    path: '/teacher',
    name: 'TeacherDashboard',
    component: TeacherDashboard,
    meta: { title: 'Teacher Admin Dashboard' }
  },
  {
    path: '/jeopardy',
    name: 'JeopardyCreator',
    component: JeopardyCreator,
    meta: { title: 'Jeopardy Game Creator' }
  },
  {
    path: '/jeopardy/play',
    name: 'JeopardyGameView',
    component: JeopardyGameView,
    meta: { title: 'Live Jeopardy Game Arena' }
  },
  {
    path: '/game',
    name: 'GameView',
    component: GameView,
    meta: { title: 'Dual-Player Split-Screen Game' }
  },
  {
    // Catch-all redirect to Home
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} | Smartboard Battle`;
  }
  next();
});

export default router;
