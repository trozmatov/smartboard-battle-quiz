<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import SavedQuizzesModal from '../components/SavedQuizzesModal.vue';
import AiQuizModal from '../components/AiQuizModal.vue';
import { getQuizzes, saveQuiz, updateQuiz, deleteQuiz, seedDefaultQuizzes, DEFAULT_QUIZZES } from '../firebase/quizService';
import { createGameSession } from '../firebase/gameService';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';

const router = useRouter();
const { deviceMode, isSmartboard, isLaptop } = useDeviceMode();

// ==================== AUTHENTICATION STATE ====================
const isAuthenticated = ref(sessionStorage.getItem('teacher_auth') === 'true' || localStorage.getItem('teacher_auth') === 'true');
const loginUsername = ref('');
const loginPassword = ref('');
const showPassword = ref(false);
const rememberMe = ref(true);
const authError = ref('');
const authLoading = ref(false);

// ==================== VIEW MODES: 'hub' (Dashboard Hub) | 'editor' (Workspace) ====================
const viewMode = ref('hub'); // 'hub' | 'editor'

// Quizzes Library State
const allQuizzes = ref([]);
const libraryLoading = ref(false);
const librarySearch = ref('');
const libraryFilter = ref('all'); // 'all' | 'ai' | 'custom' | 'templates'
const previewQuizId = ref(null);

// AI Modal State
const showAiModal = ref(false);
const showSavedModal = ref(false);

// ==================== QUIZ EDITOR STATE ====================
const currentQuiz = reactive({
  id: null,
  title: '🚀 Science & Solar System Blitz',
  isAiGenerated: false,
  questions: JSON.parse(JSON.stringify(DEFAULT_QUIZZES[0].questions))
});

const selectedQuestionIndex = ref(0);
const isSaving = ref(false);
const isStarting = ref(false);
const saveSuccessToast = ref(false);
const errorMessage = ref('');

// Computed active question in editor
const activeQuestion = computed(() => {
  if (!currentQuiz.questions || currentQuiz.questions.length === 0) return null;
  return currentQuiz.questions[selectedQuestionIndex.value];
});

// Fetch Library Quizzes
async function fetchLibraryQuizzes() {
  libraryLoading.value = true;
  try {
    const list = await getQuizzes();
    allQuizzes.value = list;
  } catch (err) {
    console.warn('Could not load library quizzes:', err);
  } finally {
    libraryLoading.value = false;
  }
}

// Filtered Library Quizzes
const filteredLibraryQuizzes = computed(() => {
  let list = allQuizzes.value;

  if (libraryFilter.value === 'ai') {
    list = list.filter(q => q.isAiGenerated);
  } else if (libraryFilter.value === 'custom') {
    list = list.filter(q => !q.isAiGenerated && !q.isTemplate);
  } else if (libraryFilter.value === 'templates') {
    list = list.filter(q => q.isTemplate);
  }

  if (librarySearch.value.trim()) {
    const query = librarySearch.value.toLowerCase().trim();
    list = list.filter(q => 
      (q.title && q.title.toLowerCase().includes(query)) ||
      (q.questions && q.questions.some(item => item.questionText && item.questionText.toLowerCase().includes(query)))
    );
  }

  return list;
});

// Stats for Header
const totalQuestionsCount = computed(() => {
  return allQuizzes.value.reduce((sum, q) => sum + (q.questions ? q.questions.length : 0), 0);
});

const aiQuizzesCount = computed(() => {
  return allQuizzes.value.filter(q => q.isAiGenerated).length;
});

// ==================== AUTH METHODS ====================
function handleLogin() {
  authError.value = '';
  authLoading.value = true;

  setTimeout(() => {
    const user = loginUsername.value.trim().toLowerCase();
    const pass = loginPassword.value.trim();

    if ((user === 'admin' || user === 'teacher' || user === 'ustoz') && (pass === 'admin' || pass === 'teacher123' || pass === '123456' || pass === 'admin123')) {
      isAuthenticated.value = true;
      if (rememberMe.value) {
        localStorage.setItem('teacher_auth', 'true');
      }
      sessionStorage.setItem('teacher_auth', 'true');
      sound.playCorrect();
      fetchLibraryQuizzes();
    } else {
      authError.value = 'Noto\'g\'ri Login yoki Parol! (Standart: teacher / teacher123)';
      sound.playWrong();
    }
    authLoading.value = false;
  }, 300);
}

function handleLogout() {
  if (confirm('Teacher paneldan chiqishni xohlaysizmi?')) {
    isAuthenticated.value = false;
    sessionStorage.removeItem('teacher_auth');
    localStorage.removeItem('teacher_auth');
    loginPassword.value = '';
    viewMode.value = 'hub';
    sound.playTick();
  }
}

// ==================== QUIZ WORKFLOW METHODS ====================
function openManualCreator() {
  currentQuiz.id = null;
  currentQuiz.title = 'Yangi Maxsus Test';
  currentQuiz.isAiGenerated = false;
  currentQuiz.questions = [
    {
      questionText: '1-savol matnini bu yerga yozing...',
      options: ['Variant A', 'Variant B', 'Variant C', 'Variant D'],
      correctIndex: 0,
      timeLimit: 15,
      points: 100
    }
  ];
  selectedQuestionIndex.value = 0;
  viewMode.value = 'editor';
  sound.playTick();
}

function openAiGeneratorModal() {
  showAiModal.value = true;
  sound.playTick();
}

function handleAiQuizGenerated(aiQuiz) {
  currentQuiz.id = null;
  currentQuiz.title = aiQuiz.title || '🤖 AI Generatsiya Test';
  currentQuiz.isAiGenerated = true;
  currentQuiz.questions = JSON.parse(JSON.stringify(aiQuiz.questions || []));
  selectedQuestionIndex.value = 0;
  viewMode.value = 'editor';
  sound.playCorrect();
}

function openQuizInEditor(quiz) {
  currentQuiz.id = quiz.id;
  currentQuiz.title = quiz.title;
  currentQuiz.isAiGenerated = !!quiz.isAiGenerated;
  currentQuiz.questions = JSON.parse(JSON.stringify(quiz.questions || []));
  selectedQuestionIndex.value = 0;
  viewMode.value = 'editor';
  sound.playTick();
}

async function handleDeleteQuiz(quiz) {
  if (quiz.isTemplate) {
    alert('Starter namunalar faqat o\'qish uchun. Uni tahrirlab o\'zingizning alohida testingiz qilib saqlashingiz mumkin.');
    return;
  }
  if (confirm(`"${quiz.title}" testini o'chirmoqchimisiz?`)) {
    try {
      await deleteQuiz(quiz.id);
      allQuizzes.value = allQuizzes.value.filter(q => q.id !== quiz.id);
      sound.playTick();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  }
}

function togglePreview(id) {
  previewQuizId.value = previewQuizId.value === id ? null : id;
  sound.playTick();
}

// Editor Controls
function selectQuestion(idx) {
  selectedQuestionIndex.value = idx;
  sound.playTick();
}

function addQuestion() {
  currentQuiz.questions.push({
    questionText: 'Yangi savol matni',
    options: ['Variant A', 'Variant B', 'Variant C', 'Variant D'],
    correctIndex: 0,
    timeLimit: 15,
    points: 100
  });
  selectedQuestionIndex.value = currentQuiz.questions.length - 1;
  sound.playTick();
}

function duplicateQuestion(idx) {
  const cloned = JSON.parse(JSON.stringify(currentQuiz.questions[idx]));
  cloned.questionText += ' (Nusxa)';
  currentQuiz.questions.splice(idx + 1, 0, cloned);
  selectedQuestionIndex.value = idx + 1;
  sound.playTick();
}

function removeQuestion(idx) {
  if (currentQuiz.questions.length <= 1) {
    alert('Testda kamida 1 ta savol bo\'lishi shart.');
    return;
  }
  currentQuiz.questions.splice(idx, 1);
  if (selectedQuestionIndex.value >= currentQuiz.questions.length) {
    selectedQuestionIndex.value = currentQuiz.questions.length - 1;
  }
  sound.playTick();
}

async function handleSaveQuiz() {
  isSaving.value = true;
  errorMessage.value = '';
  try {
    const payload = {
      title: currentQuiz.title,
      isAiGenerated: !!currentQuiz.isAiGenerated,
      questions: currentQuiz.questions
    };

    if (currentQuiz.id && !currentQuiz.id.startsWith('template-')) {
      await updateQuiz(currentQuiz.id, payload);
    } else {
      const res = await saveQuiz(payload);
      currentQuiz.id = res.id;
    }
    
    saveSuccessToast.value = true;
    sound.playCorrect();
    fetchLibraryQuizzes();
    
    setTimeout(() => {
      saveSuccessToast.value = false;
    }, 3000);
  } catch (err) {
    console.error('Error saving quiz:', err);
    errorMessage.value = 'Saqlashda xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isSaving.value = false;
  }
}

async function handleStartGame(quizToStart = null) {
  isStarting.value = true;
  errorMessage.value = '';
  try {
    const targetQuiz = quizToStart || currentQuiz;
    const gameSession = await createGameSession(targetQuiz);
    sound.playCorrect();

    router.push({
      path: '/game',
      query: {
        gameId: gameSession.id,
        pin: gameSession.pin,
        role: 'board'
      }
    });
  } catch (err) {
    console.error('Error launching game:', err);
    errorMessage.value = 'O\'yinni boshlashda xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isStarting.value = false;
  }
}

onMounted(() => {
  seedDefaultQuizzes().catch(console.warn);
  if (isAuthenticated.value) {
    fetchLibraryQuizzes();
  }
});
</script>

<template>
  <div class="min-vh-100 d-flex flex-column bg-slate-950 text-light" style="background-color: #0F172A;">
    <Navbar />

    <!-- ==================== 1. TEACHER LOGIN SCREEN ==================== -->
    <div v-if="!isAuthenticated" class="flex-grow-1 d-flex align-items-center justify-content-center p-4">
      <div class="card border border-secondary border-opacity-40 text-white rounded-5 shadow-2xl p-4 p-sm-5 w-100" style="max-width: 460px; background-color: #1E293B;">
        
        <div class="text-center mb-4">
          <div class="p-3 rounded-circle bg-warning bg-opacity-20 text-warning d-inline-flex align-items-center justify-content-center mb-3" style="width: 70px; height: 70px;">
            <i class="bi bi-shield-lock-fill display-6"></i>
          </div>
          <h3 class="brand-font text-white mb-1">Ustozlar Paneli</h3>
          <p class="text-secondary small mb-0">Testlarni boshqarish va yaratish uchun tizimga kiring.</p>
        </div>

        <div v-if="authError" class="alert alert-danger py-2 small d-flex align-items-center gap-2 rounded-3 mb-3">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <span>{{ authError }}</span>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label small text-secondary fw-semibold">Login</label>
            <div class="input-group">
              <span class="input-group-text bg-dark border-secondary border-opacity-50 text-secondary">
                <i class="bi bi-person-badge-fill"></i>
              </span>
              <input 
                v-model="loginUsername" 
                type="text" 
                class="form-control form-control-lg text-white border-secondary border-opacity-50"
                placeholder="teacher yoki admin"
                style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                required
              />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-secondary fw-semibold">Parol</label>
            <div class="input-group">
              <span class="input-group-text bg-dark border-secondary border-opacity-50 text-secondary">
                <i class="bi bi-key-fill"></i>
              </span>
              <input 
                v-model="loginPassword" 
                :type="showPassword ? 'text' : 'password'" 
                class="form-control form-control-lg text-white border-secondary border-opacity-50"
                placeholder="••••••••"
                style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                required
              />
              <button 
                type="button" 
                class="btn btn-dark border-secondary border-opacity-50 text-secondary"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
              </button>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between mb-4 small text-secondary">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" v-model="rememberMe" id="remCheck">
              <label class="form-check-label text-light" for="remCheck">Eslab qolish</label>
            </div>
            <span class="text-warning fw-semibold cursor-pointer" title="Standart: teacher / teacher123">
              <i class="bi bi-info-circle me-1"></i> Standart: teacher123
            </span>
          </div>

          <button 
            type="submit" 
            class="btn btn-warning btn-lg w-100 rounded-pill py-3 fw-bold text-dark shadow d-flex align-items-center justify-content-center gap-2"
            :disabled="authLoading"
          >
            <i class="bi bi-unlock-fill fs-5"></i>
            <span>{{ authLoading ? 'Tekshirilmoqda...' : 'Kirish' }}</span>
          </button>
        </form>

      </div>
    </div>

    <!-- ==================== 2. MAIN TEACHER DASHBOARD HUB (Boshqaruv Sahifasi) ==================== -->
    <div v-else-if="viewMode === 'hub'" class="flex-grow-1 d-flex flex-column">
      
      <!-- Hub Top Bar -->
      <div class="border-bottom border-secondary border-opacity-30 px-4 py-3 bg-slate-900 d-flex align-items-center justify-content-between flex-wrap gap-3" style="background-color: #1E293B;">
        <div class="d-flex align-items-center gap-3">
          <div class="p-2 rounded-circle bg-warning bg-opacity-25 text-warning fs-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 50px; height: 50px;">
            <span>🎓</span>
          </div>
          <div>
            <h4 class="brand-font text-white mb-0 d-flex align-items-center gap-2">
              Ustozlar Studiyasi (Teacher Hub)
              <span v-if="deviceMode === 'smartboard'" class="badge bg-warning text-dark fw-bold rounded-pill px-2 py-1 fs-8">
                📺 Smartboard
              </span>
              <span v-else class="badge bg-primary text-white fw-bold rounded-pill px-2 py-1 fs-8">
                💻 Laptop
              </span>
            </h4>
            <p class="text-secondary small mb-0">Testlar kutubxonasi, PDF AI generator va interaktiv smartboard boshqaruvi.</p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-dark border border-secondary border-opacity-50 text-success px-3 py-2 rounded-pill small d-flex align-items-center gap-1">
            <span>✅</span> Tizimga kirilgan
          </span>
          <button @click="handleLogout" class="btn btn-sm btn-outline-danger rounded-pill px-3 d-flex align-items-center gap-1">
            <span>🚪</span> Chiqish
          </button>
        </div>
      </div>

      <div class="container py-4 flex-grow-1" :class="{ 'px-lg-5': deviceMode === 'smartboard' }">
        
        <!-- Hero Cards: Action Buttons (Both Balanced with Glassmorphism) -->
        <div class="row g-4 mb-5">
          
          <!-- Card 1: Manual Quiz Creator -->
          <div class="col-md-6">
            <div 
              @click="openManualCreator"
              class="card h-100 p-4 rounded-4 border border-primary border-opacity-40 action-hero-card cursor-pointer shadow-lg transition-all"
              style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);"
            >
              <div class="d-flex align-items-start gap-3">
                <div class="p-3 rounded-4 bg-primary bg-opacity-25 text-primary fs-1 d-flex align-items-center justify-content-center shadow-sm" style="width: 68px; height: 68px;">
                  <span>✍️</span>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <h4 class="fw-bold text-white mb-0">Yangi Test Yaratish</h4>
                    <span class="badge bg-primary bg-opacity-30 text-info border border-primary border-opacity-40 rounded-pill px-2 py-0 fs-8">Qo'lda</span>
                  </div>
                  <p class="text-secondary small mb-3">
                    Savollarni qo'lda kiritish, variantlarni belgilash, vaqt va ballarni moslashtirish.
                  </p>
                  <button class="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white shadow-sm" :class="{ 'btn-lg w-100': deviceMode === 'smartboard' }">
                    <span>Yaratish Oynasiga O'tish ➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: AI Quiz Generator (PDF & Documents) -->
          <div class="col-md-6">
            <div 
              @click="openAiGeneratorModal"
              class="card h-100 p-4 rounded-4 border border-warning border-opacity-40 action-hero-card cursor-pointer shadow-lg transition-all"
              style="background: linear-gradient(135deg, rgba(42, 31, 12, 0.85) 0%, rgba(30, 41, 59, 0.95) 100%);"
            >
              <div class="d-flex align-items-start gap-3">
                <div class="p-3 rounded-4 bg-warning bg-opacity-25 text-warning fs-1 d-flex align-items-center justify-content-center shadow-sm" style="width: 68px; height: 68px;">
                  <span>🤖</span>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <h4 class="fw-bold text-white mb-0">PDF dan AI Test Yaratish</h4>
                    <span class="badge bg-warning text-dark fw-bold rounded-pill px-2 py-0 fs-8">Gemini AI</span>
                  </div>
                  <p class="text-secondary small mb-3">
                    PDF kitob yoki darslikni yuklang. Google Embedding va Gemini avtomatik test tuzadi.
                  </p>
                  <button class="btn btn-warning rounded-pill px-4 py-2 fw-bold text-dark shadow-sm" :class="{ 'btn-lg w-100': deviceMode === 'smartboard' }">
                    <span>✨ AI Test Generatsiya Qilish</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Section Header: Saqlangan Quizlar Ro'yxati -->
        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom border-secondary border-opacity-25">
          <div>
            <h4 class="brand-font text-white mb-1 d-flex align-items-center gap-2">
              <span>📚</span>
              Barcha Quizlar Kutubxonasi
              <span class="badge bg-secondary bg-opacity-50 text-light fs-7 rounded-pill px-2 py-1">
                {{ allQuizzes.length }} ta
              </span>
            </h4>
            <p class="text-secondary small mb-0">Barcha saqlangan, AI yaratgan va namunaviy quizlar.</p>
          </div>

          <!-- Search & Filter Controls -->
          <div class="d-flex align-items-center gap-2 flex-wrap">
            
            <!-- Search Box -->
            <div class="input-group input-group-sm" style="max-width: 240px;">
              <span class="input-group-text bg-dark border-secondary border-opacity-50 text-secondary">
                🔍
              </span>
              <input 
                v-model="librarySearch" 
                type="text" 
                class="form-control text-white border-secondary border-opacity-50" 
                placeholder="Qidiruv..."
                style="background-color: #0F172A !important; color: #FFFFFF !important;"
              />
            </div>

            <!-- Filter Pills -->
            <div class="btn-group btn-group-sm rounded-pill p-1 bg-dark border border-secondary border-opacity-50">
              <button 
                @click="libraryFilter = 'all'" 
                class="btn btn-sm rounded-pill px-3"
                :class="libraryFilter === 'all' ? 'btn-primary text-white fw-bold' : 'btn-dark text-secondary'"
              >
                Barchasi
              </button>
              <button 
                @click="libraryFilter = 'ai'" 
                class="btn btn-sm rounded-pill px-3"
                :class="libraryFilter === 'ai' ? 'btn-warning text-dark fw-bold' : 'btn-dark text-secondary'"
              >
                🤖 AI Quizlar
              </button>
              <button 
                @click="libraryFilter = 'custom'" 
                class="btn btn-sm rounded-pill px-3"
                :class="libraryFilter === 'custom' ? 'btn-info text-dark fw-bold' : 'btn-dark text-secondary'"
              >
                Maxsus
              </button>
              <button 
                @click="libraryFilter = 'templates'" 
                class="btn btn-sm rounded-pill px-3"
                :class="libraryFilter === 'templates' ? 'btn-light text-dark fw-bold' : 'btn-dark text-secondary'"
              >
                Namunalar
              </button>
            </div>

          </div>
        </div>

        <!-- Quizzes Grid -->
        <div v-if="libraryLoading" class="text-center py-5">
          <div class="spinner-border text-warning" role="status"></div>
          <p class="text-secondary mt-2 small">Yuklanmoqda...</p>
        </div>

        <div v-else-if="filteredLibraryQuizzes.length === 0" class="text-center py-5">
          <div class="fs-1 mb-2">📂</div>
          <h5 class="mt-2 text-white">Hech Qanday Quiz Topilmadi</h5>
          <p class="text-secondary small">Yangi test yarating yoki PDF orqali AI bilan generatsiya qiling.</p>
        </div>

        <div v-else class="row g-3">
          <div 
            v-for="quiz in filteredLibraryQuizzes" 
            :key="quiz.id" 
            class="col-12"
          >
            <div class="card border border-secondary border-opacity-30 rounded-4 shadow-sm p-3 transition-all quiz-row-card" style="background-color: #1E293B;">
              
              <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                
                <div class="d-flex align-items-start gap-3">
                  <div 
                    class="p-3 rounded-4 fs-2 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                    :class="quiz.isAiGenerated ? 'bg-warning bg-opacity-20 text-warning' : 'bg-primary bg-opacity-20 text-primary'"
                    style="width: 54px; height: 54px;"
                  >
                    <span>{{ quiz.isAiGenerated ? '🤖' : (quiz.isTemplate ? '🌟' : '📚') }}</span>
                  </div>

                  <div>
                    <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h5 class="fw-bold text-white mb-0">{{ quiz.title || 'Nomsiz Quiz' }}</h5>
                      
                      <!-- Crisp Clear Badges (Fixed Clipping) -->
                      <span v-if="quiz.isAiGenerated" class="badge bg-warning text-dark fw-bold rounded-pill px-3 py-1 fs-8">
                        🤖 AI Generated
                      </span>
                      <span v-else-if="quiz.isTemplate" class="badge bg-info text-dark fw-bold rounded-pill px-3 py-1 fs-8">
                        🌟 Starter Template
                      </span>
                      <span v-else class="badge bg-success bg-opacity-30 text-success border border-success border-opacity-50 rounded-pill px-3 py-1 fs-8">
                        ☁️ Saqlangan
                      </span>
                    </div>

                    <div class="d-flex align-items-center gap-3 text-secondary small flex-wrap">
                      <span>❓ <strong>{{ quiz.questions ? quiz.questions.length : 0 }}</strong> ta savol</span>
                      <span>•</span>
                      <span>⭐ <strong>{{ quiz.questions ? quiz.questions.reduce((sum, q) => sum + (q.points || 100), 0) : 0 }}</strong> ball</span>
                    </div>
                  </div>
                </div>

                <!-- Action Controls (Thicker, clear touch buttons for Smartboard & Laptop) -->
                <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                  
                  <button 
                    @click="togglePreview(quiz.id)" 
                    class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3 d-flex align-items-center gap-1"
                    :title="previewQuizId === quiz.id ? 'Yashirish' : 'Savollarni ko\'rish'"
                  >
                    <span>{{ previewQuizId === quiz.id ? '🔼' : '👁️' }}</span>
                    <span>{{ previewQuizId === quiz.id ? 'Yashirish' : 'Savollar' }}</span>
                  </button>

                  <button 
                    @click="openQuizInEditor(quiz)" 
                    class="btn btn-sm btn-outline-info rounded-pill px-3 d-flex align-items-center gap-1"
                    title="Tahrirlash oynasida ochish"
                  >
                    <span>✏️</span>
                    <span>Tahrirlash</span>
                  </button>

                  <button 
                    @click="handleStartGame(quiz)" 
                    class="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow d-flex align-items-center gap-2"
                    :class="deviceMode === 'smartboard' ? 'btn-lg' : 'btn-sm'"
                    title="Smartboardda jonli o'yinni boshlash"
                  >
                    <span class="fs-5">🚀</span>
                    <span>O'yinni Boshlash</span>
                  </button>

                  <button 
                    v-if="!quiz.isTemplate"
                    @click="handleDeleteQuiz(quiz)" 
                    class="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center"
                    style="width: 36px; height: 36px;"
                    title="O'chirish"
                  >
                    <span>🗑️</span>
                  </button>

                </div>

              </div>

              <!-- Question Preview Drawer -->
              <div v-if="previewQuizId === quiz.id" class="border-top border-secondary border-opacity-25 mt-3 pt-3">
                <h6 class="text-warning small fw-bold mb-2">Savollar ro'yxati:</h6>
                <div class="row g-2">
                  <div v-for="(q, qIdx) in quiz.questions" :key="qIdx" class="col-md-6">
                    <div class="p-2 rounded-3 small border border-secondary border-opacity-25" style="background-color: #0F172A;">
                      <div class="d-flex justify-content-between text-white fw-semibold mb-1">
                        <span>#{{ qIdx + 1 }}. {{ q.questionText }}</span>
                        <span class="badge bg-secondary rounded-pill">{{ q.timeLimit }}s</span>
                      </div>
                      <div class="row g-1">
                        <div v-for="(opt, optIdx) in q.options" :key="optIdx" class="col-6">
                          <span 
                            class="d-block text-truncate px-2 rounded fs-8"
                            :class="optIdx === q.correctIndex ? 'bg-success bg-opacity-25 text-success fw-bold' : 'text-secondary'"
                          >
                            {{ String.fromCharCode(65 + optIdx) }}: {{ opt }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- ==================== 3. QUIZ EDITOR WORKSPACE (Tahrirlash va Yaratish Oynasi) ==================== -->
    <div v-else-if="viewMode === 'editor'" class="d-flex flex-column flex-grow-1">
      
      <!-- Editor Top Bar -->
      <header class="border-bottom border-secondary border-opacity-30 px-4 py-3 sticky-top" style="background-color: #1E293B;">
        <div class="container-fluid d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          
          <!-- Back to Hub Button & Quiz Title -->
          <div class="d-flex align-items-center gap-3 flex-grow-1">
            <button 
              @click="viewMode = 'hub'; fetchLibraryQuizzes()" 
              class="btn btn-outline-light btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
              title="Kutubxonaga qaytish"
            >
              <i class="bi bi-arrow-left"></i>
              <span>Kutubxona</span>
            </button>

            <div class="input-group" style="max-width: 480px;">
              <span class="input-group-text bg-dark border-secondary border-opacity-50 text-warning">
                <i class="bi bi-pencil-square"></i>
              </span>
              <input 
                v-model="currentQuiz.title" 
                type="text" 
                class="form-control text-white border-secondary border-opacity-50 fw-bold fs-5" 
                placeholder="Quiz sarlavhasini kiriting..."
                style="background-color: #0F172A !important; color: #FFFFFF !important;"
              />
            </div>

            <!-- AI or Cloud Badge -->
            <span v-if="currentQuiz.isAiGenerated" class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 d-none d-lg-inline-block">
              🤖 AI Generated Draft
            </span>
            <span v-else-if="currentQuiz.id && !currentQuiz.id.startsWith('template-')" class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 d-none d-lg-inline-block">
              <i class="bi bi-cloud-check me-1"></i> Cloud Saved
            </span>
          </div>

          <!-- Action Controls -->
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <button @click="openAiGeneratorModal" class="btn btn-outline-warning btn-sm rounded-pill px-3">
              <i class="bi bi-robot me-1"></i> AI dan Yangilash
            </button>

            <button 
              @click="handleSaveQuiz" 
              class="btn btn-primary btn-sm rounded-pill px-4 fw-semibold"
              :disabled="isSaving"
            >
              <i class="bi bi-cloud-arrow-up-fill me-1"></i>
              {{ isSaving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>

            <button 
              @click="handleStartGame()" 
              class="btn btn-warning btn-sm rounded-pill px-4 fw-bold text-dark shadow d-flex align-items-center gap-1"
              :disabled="isStarting"
            >
              <i class="bi bi-play-circle-fill fs-6"></i>
              <span>{{ isStarting ? 'Boshlanmoqda...' : '🚀 Start Game' }}</span>
            </button>
          </div>
        </div>

        <!-- Success Toast -->
        <div v-if="saveSuccessToast" class="alert alert-success mt-2 mb-0 py-2 small d-flex align-items-center gap-2 rounded-3 shadow">
          <i class="bi bi-check-circle-fill text-success fs-5"></i>
          <span>Quiz muvaffaqiyatli saqlandi!</span>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="alert alert-danger mt-2 mb-0 py-2 small d-flex align-items-center gap-2 rounded-3 shadow">
          <i class="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </header>

      <!-- Main Workspace -->
      <div class="container-fluid flex-grow-1 p-4">
        <div class="row g-4">
          
          <!-- Sidebar: Questions List -->
          <aside class="col-lg-4 col-xl-3">
            <div class="card border-secondary border-opacity-30 rounded-4 shadow h-100" style="background-color: #1E293B;">
              
              <div class="card-header border-secondary border-opacity-25 bg-transparent p-3 d-flex align-items-center justify-content-between">
                <h6 class="mb-0 brand-font text-white d-flex align-items-center gap-2">
                  <i class="bi bi-list-ol text-warning"></i>
                  Savollar ({{ currentQuiz.questions.length }})
                </h6>
                <button 
                  @click="addQuestion" 
                  class="btn btn-sm btn-outline-warning rounded-pill px-2 py-0 fw-bold"
                  title="Yangi savol qo'shish"
                >
                  <i class="bi bi-plus-lg"></i> Qo'shish
                </button>
              </div>

              <!-- Scrollable Questions List -->
              <div class="card-body p-2 overflow-auto" style="max-height: calc(100vh - 270px);">
                <div 
                  v-for="(q, idx) in currentQuiz.questions" 
                  :key="idx"
                  @click="selectQuestion(idx)"
                  class="p-3 mb-2 rounded-3 cursor-pointer d-flex align-items-start justify-content-between transition-all"
                  :class="selectedQuestionIndex === idx ? 'bg-primary text-white shadow-md' : 'text-light border border-secondary border-opacity-25 hover-item'"
                  :style="selectedQuestionIndex !== idx ? 'background-color: #0F172A;' : ''"
                >
                  <div class="d-flex align-items-start gap-2 flex-grow-1 pe-2 overflow-hidden">
                    <span 
                      class="badge rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      :class="selectedQuestionIndex === idx ? 'bg-white text-primary fw-bold' : 'bg-secondary text-white'"
                      style="width: 26px; height: 26px; font-size: 0.8rem;"
                    >
                      {{ idx + 1 }}
                    </span>
                    <div class="text-truncate">
                      <p class="mb-1 fw-semibold text-truncate small">
                        {{ q.questionText || 'Bo\'sh savol...' }}
                      </p>
                      <div class="d-flex align-items-center gap-2 small opacity-75 fs-8">
                        <span><i class="bi bi-stopwatch me-1"></i>{{ q.timeLimit }}s</span>
                        <span>•</span>
                        <span><i class="bi bi-star-fill text-warning me-1"></i>{{ q.points }} ball</span>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="d-flex align-items-center gap-1">
                    <button 
                      @click.stop="duplicateQuestion(idx)" 
                      class="btn btn-sm p-1 text-light opacity-75 hover-opacity-100" 
                      title="Nusxa olish"
                    >
                      <i class="bi bi-files"></i>
                    </button>
                    <button 
                      @click.stop="removeQuestion(idx)" 
                      class="btn btn-sm p-1 text-danger opacity-75 hover-opacity-100" 
                      title="O'chirish"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <button 
                  @click="addQuestion" 
                  class="btn btn-outline-secondary w-100 py-3 rounded-3 border-dashed mt-2 text-white d-flex align-items-center justify-content-center gap-2"
                >
                  <i class="bi bi-plus-circle-fill text-warning"></i>
                  <span class="fw-semibold">Yangi Savol Qo'shish</span>
                </button>
              </div>

            </div>
          </aside>

          <!-- Main Question Editor Workspace -->
          <main class="col-lg-8 col-xl-9">
            <div v-if="activeQuestion" class="card border-secondary border-opacity-30 rounded-4 shadow p-4" style="background-color: #1E293B;">
              
              <!-- Header -->
              <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom border-secondary border-opacity-25 pb-3 mb-4 gap-3">
                <div>
                  <span class="badge bg-warning text-dark fw-bold px-3 py-1 mb-1">
                    Savol #{{ selectedQuestionIndex + 1 }}
                  </span>
                  <h4 class="brand-font text-white mb-0">Savol va Javoblarni Tahrirlash</h4>
                </div>

                <div class="d-flex align-items-center gap-3">
                  <!-- Time Limit -->
                  <div>
                    <label class="form-label text-secondary small mb-1 fw-semibold">
                      <i class="bi bi-stopwatch text-info me-1"></i> Vaqt
                    </label>
                    <select 
                      v-model.number="activeQuestion.timeLimit" 
                      class="form-select form-select-sm text-white border-secondary border-opacity-50 rounded-pill"
                      style="background-color: #0F172A !important; color: #FFFFFF !important;"
                    >
                      <option :value="5">5 soniya</option>
                      <option :value="10">10 soniya</option>
                      <option :value="15">15 soniya</option>
                      <option :value="20">20 soniya</option>
                      <option :value="30">30 soniya</option>
                      <option :value="60">60 soniya</option>
                    </select>
                  </div>

                  <!-- Points -->
                  <div>
                    <label class="form-label text-secondary small mb-1 fw-semibold">
                      <i class="bi bi-star-fill text-warning me-1"></i> Ball
                    </label>
                    <select 
                      v-model.number="activeQuestion.points" 
                      class="form-select form-select-sm text-white border-secondary border-opacity-50 rounded-pill"
                      style="background-color: #0F172A !important; color: #FFFFFF !important;"
                    >
                      <option :value="50">50 ball</option>
                      <option :value="100">100 ball</option>
                      <option :value="150">150 ball</option>
                      <option :value="200">200 ball</option>
                      <option :value="300">300 ball</option>
                      <option :value="500">500 ball</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Question Text -->
              <div class="mb-4">
                <label class="form-label text-light fw-bold fs-5 mb-2">
                  Savol Matni
                </label>
                <textarea 
                  v-model="activeQuestion.questionText" 
                  rows="3" 
                  class="form-control form-control-lg text-white border-secondary border-opacity-50 rounded-3 shadow-inner"
                  placeholder="Savol matnini bu yerga yozing..."
                  style="background-color: #0F172A !important; color: #FFFFFF !important; font-size: 1.2rem;"
                ></textarea>
              </div>

              <!-- Options -->
              <div>
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <label class="form-label text-light fw-bold fs-5 mb-0">
                    Javob Variantlari va To'g'ri Javob
                  </label>
                  <small class="text-secondary">
                    <i class="bi bi-info-circle me-1"></i> To'g'ri javobga mos radio tugmani belgilang.
                  </small>
                </div>

                <div class="row g-3">
                  
                  <!-- Option A -->
                  <div class="col-md-6">
                    <div 
                      class="p-3 rounded-4 border transition-all"
                      :class="activeQuestion.correctIndex === 0 ? 'border-success bg-success bg-opacity-10 shadow' : 'border-secondary border-opacity-25'"
                      style="background-color: #162032;"
                    >
                      <div class="d-flex align-items-center justify-content-between mb-2">
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge rounded-circle p-2 bg-danger text-white fs-6 fw-bold" style="width: 32px; height: 32px;">A</span>
                          <span class="fw-semibold text-white">Variant A</span>
                        </div>
                        <div class="form-check form-check-inline m-0">
                          <input 
                            class="form-check-input fs-5" 
                            type="radio" 
                            :name="'correct-opt-' + selectedQuestionIndex" 
                            :value="0" 
                            v-model="activeQuestion.correctIndex" 
                            id="opt-0"
                          />
                          <label class="form-check-label text-success fw-bold small ms-1" for="opt-0">To'g'ri</label>
                        </div>
                      </div>
                      <input 
                        v-model="activeQuestion.options[0]" 
                        type="text" 
                        class="form-control text-white border-secondary border-opacity-50 rounded-3" 
                        placeholder="Variant A matni..."
                        style="background-color: #0B1120 !important; color: #FFFFFF !important; font-weight: 500; font-size: 1.05rem;"
                      />
                    </div>
                  </div>

                  <!-- Option B -->
                  <div class="col-md-6">
                    <div 
                      class="p-3 rounded-4 border transition-all"
                      :class="activeQuestion.correctIndex === 1 ? 'border-success bg-success bg-opacity-10 shadow' : 'border-secondary border-opacity-25'"
                      style="background-color: #162032;"
                    >
                      <div class="d-flex align-items-center justify-content-between mb-2">
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge rounded-circle p-2 bg-primary text-white fs-6 fw-bold" style="width: 32px; height: 32px;">B</span>
                          <span class="fw-semibold text-white">Variant B</span>
                        </div>
                        <div class="form-check form-check-inline m-0">
                          <input 
                            class="form-check-input fs-5" 
                            type="radio" 
                            :name="'correct-opt-' + selectedQuestionIndex" 
                            :value="1" 
                            v-model="activeQuestion.correctIndex" 
                            id="opt-1"
                          />
                          <label class="form-check-label text-success fw-bold small ms-1" for="opt-1">To'g'ri</label>
                        </div>
                      </div>
                      <input 
                        v-model="activeQuestion.options[1]" 
                        type="text" 
                        class="form-control text-white border-secondary border-opacity-50 rounded-3" 
                        placeholder="Variant B matni..."
                        style="background-color: #0B1120 !important; color: #FFFFFF !important; font-weight: 500; font-size: 1.05rem;"
                      />
                    </div>
                  </div>

                  <!-- Option C -->
                  <div class="col-md-6">
                    <div 
                      class="p-3 rounded-4 border transition-all"
                      :class="activeQuestion.correctIndex === 2 ? 'border-success bg-success bg-opacity-10 shadow' : 'border-secondary border-opacity-25'"
                      style="background-color: #162032;"
                    >
                      <div class="d-flex align-items-center justify-content-between mb-2">
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge rounded-circle p-2 bg-warning text-dark fs-6 fw-bold" style="width: 32px; height: 32px;">C</span>
                          <span class="fw-semibold text-white">Variant C</span>
                        </div>
                        <div class="form-check form-check-inline m-0">
                          <input 
                            class="form-check-input fs-5" 
                            type="radio" 
                            :name="'correct-opt-' + selectedQuestionIndex" 
                            :value="2" 
                            v-model="activeQuestion.correctIndex" 
                            id="opt-2"
                          />
                          <label class="form-check-label text-success fw-bold small ms-1" for="opt-2">To'g'ri</label>
                        </div>
                      </div>
                      <input 
                        v-model="activeQuestion.options[2]" 
                        type="text" 
                        class="form-control text-white border-secondary border-opacity-50 rounded-3" 
                        placeholder="Variant C matni..."
                        style="background-color: #0B1120 !important; color: #FFFFFF !important; font-weight: 500; font-size: 1.05rem;"
                      />
                    </div>
                  </div>

                  <!-- Option D -->
                  <div class="col-md-6">
                    <div 
                      class="p-3 rounded-4 border transition-all"
                      :class="activeQuestion.correctIndex === 3 ? 'border-success bg-success bg-opacity-10 shadow' : 'border-secondary border-opacity-25'"
                      style="background-color: #162032;"
                    >
                      <div class="d-flex align-items-center justify-content-between mb-2">
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge rounded-circle p-2 bg-success text-white fs-6 fw-bold" style="width: 32px; height: 32px;">D</span>
                          <span class="fw-semibold text-white">Variant D</span>
                        </div>
                        <div class="form-check form-check-inline m-0">
                          <input 
                            class="form-check-input fs-5" 
                            type="radio" 
                            :name="'correct-opt-' + selectedQuestionIndex" 
                            :value="3" 
                            v-model="activeQuestion.correctIndex" 
                            id="opt-3"
                          />
                          <label class="form-check-label text-success fw-bold small ms-1" for="opt-3">To'g'ri</label>
                        </div>
                      </div>
                      <input 
                        v-model="activeQuestion.options[3]" 
                        type="text" 
                        class="form-control text-white border-secondary border-opacity-50 rounded-3" 
                        placeholder="Variant D matni..."
                        style="background-color: #0B1120 !important; color: #FFFFFF !important; font-weight: 500; font-size: 1.05rem;"
                      />
                    </div>
                  </div>

                </div>

                <!-- Scientific / Pedagogical Explanation (Izoh) -->
                <div class="mt-4 pt-3 border-top border-secondary border-opacity-25">
                  <label class="form-label text-light fw-bold small d-flex align-items-center gap-2 mb-2">
                    <i class="bi bi-lightbulb-fill text-warning"></i>
                    <span>Ilmiy Asos & Izoh (Pedagogik izoh)</span>
                    <span class="text-secondary fw-normal small">(To'g'ri javob nima uchun to'g'riligi va retraktorlar tahlili)</span>
                  </label>
                  <textarea 
                    v-model="activeQuestion.explanation" 
                    rows="2" 
                    class="form-control text-white border-secondary border-opacity-50 rounded-3 small"
                    placeholder="To'g'ri javobning ilmiy asosi va izohi..."
                    style="background-color: #0F172A !important; color: #FFFFFF !important;"
                  ></textarea>
                </div>

              </div>

            </div>
          </main>

        </div>
      </div>

    </div>

    <!-- AI Quiz Generator Modal -->
    <AiQuizModal 
      :show="showAiModal" 
      @close="showAiModal = false"
      @quiz-generated="handleAiQuizGenerated"
    />

    <!-- Saved Quizzes Modal -->
    <SavedQuizzesModal 
      :show="showSavedModal" 
      @close="showSavedModal = false"
      @select-quiz="openQuizInEditor"
      @start-game="handleStartGame"
      @create-new="openManualCreator"
    />
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.action-hero-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 193, 7, 0.7) !important;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5) !important;
}
.quiz-row-card:hover {
  border-color: rgba(56, 189, 248, 0.5) !important;
  transform: translateY(-2px);
}
.hover-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}
.border-dashed {
  border-style: dashed !important;
  border-width: 2px !important;
}
.fs-7 {
  font-size: 0.75rem;
}
.fs-8 {
  font-size: 0.7rem;
}
</style>
