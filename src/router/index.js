import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import QuizLobbyView from '../views/QuizLobbyView.vue';
import TeacherDashboard from '../views/TeacherDashboard.vue';
import GameView from '../views/GameView.vue';
import JeopardyCreator from '../views/JeopardyCreator.vue';
import JeopardyGameView from '../views/JeopardyGameView.vue';
import MapsView from '../views/MapsView.vue';
import MapGameView from '../views/MapGameView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import JeopardyLobbyView from '../views/JeopardyLobbyView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'Bosh Sahifa - Portal' }
  },
  {
    path: '/quiz-lobby',
    name: 'QuizLobby',
    component: QuizLobbyView,
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
    path: '/jeopardy-lobby',
    name: 'JeopardyLobby',
    component: JeopardyLobbyView,
    meta: { title: 'Jeopardy O\'yinlari' }
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
    path: '/maps',
    name: 'MapsView',
    component: MapsView,
    meta: { title: 'Xaritalar - Geo Quiz' }
  },
  {
    path: '/map-game',
    name: 'MapGameView',
    component: MapGameView,
    meta: { title: '1v1 Xarita O\'yini' }
  },
  {
    // Catch-all route for 404 Not Found
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: 'Sahifa Topilmadi' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} | HistoryPro Battle`;
  }
  next();
});

export default router;
