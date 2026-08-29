<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { 
  saveJeopardyGame, 
  getJeopardyGames, 
  updateJeopardyGame, 
  deleteJeopardyGame, 
  DEFAULT_JEOPARDY_GAMES 
} from '../firebase/jeopardyService';
import { extractTextFromFile, chunkDocumentText } from '../services/aiQuizService';
import { generateJeopardyGameFromPdf } from '../services/aiJeopardyService';
import { sound } from '../utils/sound';
import { useDeviceMode } from '../composables/useDeviceMode';

const router = useRouter();
const { deviceMode, isSmartboard } = useDeviceMode();

// Active Tab: 'manual' | 'ai'
const activeTab = ref('manual');

// Jeopardy Game State
const currentGame = reactive({
  id: null,
  title: 'Middle School History & Science Jeopardy',
  isAiGenerated: false,
  categories: JSON.parse(JSON.stringify(DEFAULT_JEOPARDY_GAMES[0].categories))
});

// Selected cell for focused editing
const selectedCell = ref({
  categoryIndex: 0,
  questionIndex: 0
});

// Saved Games Library State
const savedGames = ref([]);
const isLibraryLoading = ref(false);
const showSavedModal = ref(false);

// AI Generation State
const selectedPdfFile = ref(null);
const extractedPdfText = ref('');
const pdfChunks = ref([]);
const totalPdfPages = ref(0);
const customAiInstructions = ref('');
const aiCategoryCount = ref(5);
const aiLanguage = ref('uz');

// Loading & Notification State
const isSaving = ref(false);
const isGeneratingAi = ref(false);
const aiProgressStep = ref('');
const errorMessage = ref('');
const successToast = ref('');

// Computed values
const totalQuestionsCount = computed(() => {
  return currentGame.categories.reduce((sum, cat) => sum + (cat.questions ? cat.questions.length : 0), 0);
});

const totalPointsPossible = computed(() => {
  return currentGame.categories.reduce((sum, cat) => {
    return sum + (cat.questions ? cat.questions.reduce((qSum, q) => qSum + (q.points || 0), 0) : 0);
  }, 0);
});

const activeQuestionItem = computed(() => {
  const cat = currentGame.categories[selectedCell.value.categoryIndex];
  if (!cat || !cat.questions) return null;
  return cat.questions[selectedCell.value.questionIndex] || null;
});

// Fetch saved Jeopardy games
async function fetchSavedGames() {
  isLibraryLoading.value = true;
  try {
    const list = await getJeopardyGames();
    savedGames.value = list;
  } catch (err) {
    console.warn('Could not load saved Jeopardy games:', err);
  } finally {
    isLibraryLoading.value = false;
  }
}

// Select cell to edit in drawer
function selectQuestionCell(catIdx, qIdx) {
  selectedCell.value = {
    categoryIndex: catIdx,
    questionIndex: qIdx
  };
  sound.playTick();
}

// Add new category
function addCategory() {
  if (currentGame.categories.length >= 6) {
    alert('Maksimal 6 ta kategoriya kiritish mumkin.');
    return;
  }
  const nextNum = currentGame.categories.length + 1;
  currentGame.categories.push({
    name: `Yangi Kategoriya #${nextNum}`,
    questions: [100, 200, 300, 400, 500].map(pt => ({
      points: pt,
      question: `${pt} ballik savol matni...`,
      answer: `${pt} ballik to'g'ri javob`
    }))
  });
  sound.playTick();
}

// Remove category
function removeCategory(catIdx) {
  if (currentGame.categories.length <= 2) {
    alert('Kamida 2 ta kategoriya bo\'lishi shart.');
    return;
  }
  if (confirm(`"${currentGame.categories[catIdx].name}" kategoriyasini o'chirmoqchimisiz?`)) {
    currentGame.categories.splice(catIdx, 1);
    if (selectedCell.value.categoryIndex >= currentGame.categories.length) {
      selectedCell.value.categoryIndex = currentGame.categories.length - 1;
    }
    sound.playTick();
  }
}

// Save Jeopardy Game to Firestore
async function handleSaveGame() {
  if (!currentGame.title.trim()) {
    errorMessage.value = 'Iltimos, Jeopardy o\'yini sarlavhasini kiriting!';
    sound.playWrong();
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';
  try {
    const payload = {
      title: currentGame.title.trim(),
      isAiGenerated: !!currentGame.isAiGenerated,
      categories: currentGame.categories
    };

    if (currentGame.id && !currentGame.id.startsWith('starter-')) {
      await updateJeopardyGame(currentGame.id, payload);
    } else {
      const res = await saveJeopardyGame(payload);
      currentGame.id = res.id;
    }

    successToast.value = 'Jeopardy o\'yini muvaffaqiyatli saqlandi!';
    sound.playCorrect();
    fetchSavedGames();

    setTimeout(() => {
      successToast.value = '';
    }, 3500);
  } catch (err) {
    console.error('Error saving Jeopardy game:', err);
    errorMessage.value = 'Saqlashda xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isSaving.value = false;
  }
}

// Load game into editor
function loadGameToEditor(game) {
  currentGame.id = game.id;
  currentGame.title = game.title;
  currentGame.isAiGenerated = !!game.isAiGenerated;
  currentGame.categories = JSON.parse(JSON.stringify(game.categories || []));
  selectedCell.value = { categoryIndex: 0, questionIndex: 0 };
  showSavedModal.value = false;
  activeTab.value = 'manual';
  sound.playTick();
}

// Delete game
async function handleDeleteGame(game) {
  if (game.isTemplate) {
    alert('Namunaviy o\'yinlarni o\'chirib bo\'lmaydi.');
    return;
  }
  if (confirm(`"${game.title}" o'yinini o'chirmoqchimisiz?`)) {
    try {
      await deleteJeopardyGame(game.id);
      savedGames.value = savedGames.value.filter(g => g.id !== game.id);
      sound.playTick();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  }
}

// ==================== AI GENERATION FROM PDF ====================
async function handlePdfSelect(e) {
  const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
    errorMessage.value = 'Iltimos, faqat PDF yoki matnli fayl yuklang.';
    return;
  }

  selectedPdfFile.value = file;
  errorMessage.value = '';
  isGeneratingAi.value = true;
  aiProgressStep.value = 'PDF o\'qilmoqda va matn ajratilmoqda...';

  try {
    const text = await extractTextFromFile(file, (page, total) => {
      totalPdfPages.value = total;
      aiProgressStep.value = `PDF sahifalari tahlil qilinmoqda: ${page} / ${total}...`;
    });

    extractedPdfText.value = text;
    pdfChunks.value = chunkDocumentText(text, 1500, 200);
    sound.playTick();
  } catch (err) {
    errorMessage.value = 'Faylni o\'qishda xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isGeneratingAi.value = false;
  }
}

async function handleGenerateJeopardyAi() {
  if (!extractedPdfText.value) {
    errorMessage.value = 'Iltimos, avval PDF fayl yuklang!';
    sound.playWrong();
    return;
  }

  isGeneratingAi.value = true;
  errorMessage.value = '';
  aiProgressStep.value = 'Google Embedding & Gemini AI orqali Jeopardy kategoriyalari va savollari tuzilmoqda...';

  try {
    const aiResult = await generateJeopardyGameFromPdf({
      rawText: extractedPdfText.value,
      chunks: pdfChunks.value,
      customInstructions: customAiInstructions.value.trim(),
      categoryCount: aiCategoryCount.value,
      language: aiLanguage.value
    });

    // Populate the Manual Creator with generated game
    currentGame.id = null;
    currentGame.title = aiResult.title || `🤖 AI Jeopardy (${selectedPdfFile.value?.name || 'PDF'})`;
    currentGame.isAiGenerated = true;
    currentGame.categories = JSON.parse(JSON.stringify(aiResult.categories || []));
    selectedCell.value = { categoryIndex: 0, questionIndex: 0 };

    // Switch to manual review tab
    activeTab.value = 'manual';
    successToast.value = 'AI Jeopardy o\'yini muvaffaqiyatli tuzildi! Endi tahrirlab saqlashingiz mumkin.';
    sound.playFanfare();

    setTimeout(() => {
      successToast.value = '';
    }, 4000);
  } catch (err) {
    console.error('AI Jeopardy generation failed:', err);
    errorMessage.value = 'AI Generatsiyada xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isGeneratingAi.value = false;
  }
}

// Launch Live Jeopardy Game
async function handlePlayCurrentGame() {
  if (!currentGame.id) {
    try {
      await handleSaveGame();
    } catch (e) {
      console.warn('Could not auto-save before play:', e);
    }
  }
  sound.playCorrect();
  router.push({
    path: '/jeopardy/play',
    query: { id: currentGame.id || 'starter-jeopardy-world-history' }
  });
}

function handlePlaySavedGame(game) {
  sound.playCorrect();
  router.push({
    path: '/jeopardy/play',
    query: { id: game.id }
  });
}

onMounted(() => {
  fetchSavedGames();
});
</script>

<template>
  <div class="min-vh-100 d-flex flex-column bg-slate-950 text-light" style="background-color: #0B1120;">
    <Navbar />

    <!-- Top Action Bar -->
    <header class="border-bottom border-secondary border-opacity-30 px-4 py-3 sticky-top" style="background-color: #1E293B; z-index: 100;">
      <div class="container-fluid d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        
        <!-- Title & Mode Info -->
        <div class="d-flex align-items-center gap-3 flex-grow-1">
          <button 
            @click="router.push('/teacher')" 
            class="btn btn-outline-light btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
            title="Ustozlar paneliga qaytish"
          >
            <span>←</span>
            <span>Ustoz Paneli</span>
          </button>

          <div class="input-group" style="max-width: 460px;">
            <span class="input-group-text bg-dark border-secondary border-opacity-50 text-warning">
              <span>🎯</span>
            </span>
            <input 
              v-model="currentGame.title" 
              type="text" 
              class="form-control text-white border-secondary border-opacity-50 fw-bold fs-5" 
              placeholder="Jeopardy o'yini sarlavhasi..."
              style="background-color: #0F172A !important; color: #FFFFFF !important;"
            />
          </div>

          <span v-if="currentGame.isAiGenerated" class="badge bg-warning text-dark fw-bold rounded-pill px-3 py-1 fs-8 d-none d-lg-inline-block">
            🤖 AI Generated
          </span>
        </div>

        <!-- Mode Tabs & Save Actions -->
        <div class="d-flex align-items-center gap-2 flex-wrap">
          
          <!-- Mode Tabs (Manual vs AI) -->
          <div class="btn-group btn-group-sm rounded-pill p-1 border border-secondary border-opacity-50" style="background-color: #0F172A;">
            <button 
              @click="activeTab = 'manual'" 
              class="btn btn-sm rounded-pill px-3 py-1 fw-bold"
              :class="activeTab === 'manual' ? 'btn-primary shadow' : 'btn-dark text-secondary'"
            >
              <span>✍️ Qo'lda Tuzish</span>
            </button>
            <button 
              @click="activeTab = 'ai'" 
              class="btn btn-sm rounded-pill px-3 py-1 fw-bold"
              :class="activeTab === 'ai' ? 'btn-warning text-dark shadow' : 'btn-dark text-secondary'"
            >
              <span>🤖 PDF dan AI</span>
            </button>
          </div>

          <!-- Saved Games Library Drawer Button -->
          <button 
            @click="showSavedModal = true" 
            class="btn btn-outline-info btn-sm rounded-pill px-3 d-flex align-items-center gap-1"
            title="Saqlangan Jeopardy o'yinlari ro'yxati"
          >
            <span>📚</span>
            <span>Kutubxona ({{ savedGames.length }})</span>
          </button>

          <!-- Save Game Button -->
          <button 
            @click="handleSaveGame" 
            class="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-1"
            :disabled="isSaving"
          >
            <span>💾</span>
            <span>{{ isSaving ? 'Saqlanmoqda...' : 'Saqlash' }}</span>
          </button>

          <!-- Play Live Jeopardy Game Button -->
          <button 
            @click="handlePlayCurrentGame" 
            class="btn btn-warning btn-sm rounded-pill px-4 fw-black text-dark shadow d-flex align-items-center gap-1"
            title="To'liq ekranda o'yinni boshlash"
          >
            <span>🚀</span>
            <span>O'yinni Boshlash</span>
          </button>
        </div>

      </div>

      <!-- Toast & Error Alerts -->
      <div v-if="successToast" class="alert alert-success mt-2 mb-0 py-2 small d-flex align-items-center gap-2 rounded-3 shadow">
        <span>✅</span>
        <span>{{ successToast }}</span>
      </div>

      <div v-if="errorMessage" class="alert alert-danger mt-2 mb-0 py-2 small d-flex align-items-center gap-2 rounded-3 shadow">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="container-fluid flex-grow-1 p-3 p-md-4">
      
      <!-- ==================== TAB 1: MANUAL CREATION / GRID MATRIX ==================== -->
      <div v-if="activeTab === 'manual'">
        
        <!-- Board Header Stats & Controls -->
        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 p-3 rounded-4 bg-slate-900 border border-secondary border-opacity-30" style="background-color: #1E293B;">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary text-white rounded-pill px-3 py-2 fs-7 fw-bold">
                🏷️ {{ currentGame.categories.length }} ta Kategoriya
              </span>
              <span class="badge bg-warning text-dark rounded-pill px-3 py-2 fs-7 fw-bold">
                ❓ {{ totalQuestionsCount }} ta Savol
              </span>
              <span class="badge bg-success text-white rounded-pill px-3 py-2 fs-7 fw-bold">
                ⭐ Jami {{ totalPointsPossible }} Ball
              </span>
            </div>
            <small class="text-secondary">Katakchani bosib savol va javobni tahrirlang.</small>
          </div>

          <button 
            @click="addCategory" 
            class="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
            :disabled="currentGame.categories.length >= 6"
          >
            <span>➕</span>
            <span>Yangi Kategoriya Qo'shish</span>
          </button>
        </div>

        <div class="row g-4">
          
          <!-- LEFT / CENTER: Interactive Jeopardy Board Matrix -->
          <div class="col-lg-8 col-xl-8">
            <div class="jeopardy-board-container p-3 rounded-4 border border-secondary border-opacity-30 shadow-2xl" style="background-color: #070D1E;">
              
              <!-- Responsive Grid Layout -->
              <div 
                class="jeopardy-grid" 
                :style="{ gridTemplateColumns: `repeat(${currentGame.categories.length}, minmax(140px, 1fr))` }"
              >
                <!-- Category Headers -->
                <div 
                  v-for="(cat, catIdx) in currentGame.categories" 
                  :key="catIdx" 
                  class="category-header-cell p-2 rounded-3 text-center border border-primary border-opacity-40 shadow position-relative"
                  style="background: linear-gradient(180deg, #1E3A8A 0%, #0F172A 100%);"
                >
                  <input 
                    v-model="cat.name" 
                    type="text" 
                    class="form-control form-control-sm text-center fw-bold text-warning border-0 p-1 bg-transparent"
                    placeholder="Kategoriya nomi"
                    style="color: #FBBF24 !important; font-size: 0.95rem;"
                  />
                  <button 
                    @click="removeCategory(catIdx)" 
                    class="btn btn-sm text-danger opacity-50 hover-opacity-100 p-0 position-absolute top-0 end-0 me-1 mt-1"
                    title="Kategoriyani o'chirish"
                  >
                    ✕
                  </button>
                </div>

                <!-- Point Cells (100, 200, 300, 400, 500) -->
                <template v-for="pointTierIdx in [0, 1, 2, 3, 4]" :key="pointTierIdx">
                  <div 
                    v-for="(cat, catIdx) in currentGame.categories" 
                    :key="`${catIdx}-${pointTierIdx}`"
                    @click="selectQuestionCell(catIdx, pointTierIdx)"
                    class="jeopardy-card-cell p-3 rounded-3 text-center cursor-pointer transition-all border d-flex flex-column justify-content-center align-items-center"
                    :class="{
                      'is-selected': selectedCell.categoryIndex === catIdx && selectedCell.questionIndex === pointTierIdx,
                      'border-warning shadow-lg': selectedCell.categoryIndex === catIdx && selectedCell.questionIndex === pointTierIdx,
                      'border-secondary border-opacity-25': selectedCell.categoryIndex !== catIdx || selectedCell.questionIndex !== pointTierIdx
                    }"
                    :style="selectedCell.categoryIndex === catIdx && selectedCell.questionIndex === pointTierIdx 
                      ? 'background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);' 
                      : 'background: linear-gradient(180deg, #0B1528 0%, #060B16 100%);'"
                  >
                    <span class="fs-4 fw-black brand-font text-warning tracking-wide">
                      ${{ cat.questions[pointTierIdx]?.points || ((pointTierIdx + 1) * 100) }}
                    </span>
                    <span class="small text-truncate w-100 text-secondary opacity-75 mt-1 fs-8">
                      {{ cat.questions[pointTierIdx]?.question || 'Savol kiritilmagan' }}
                    </span>
                  </div>
                </template>
              </div>

            </div>
          </div>

          <!-- RIGHT: Focused Question & Answer Inspector / Editor -->
          <div class="col-lg-4 col-xl-4">
            <div v-if="activeQuestionItem" class="card border border-secondary border-opacity-40 rounded-4 shadow-xl p-4 sticky-top" style="background-color: #1E293B; top: 90px;">
              
              <div class="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-30 pb-3 mb-3">
                <div>
                  <span class="badge bg-warning text-dark fw-bold px-3 py-1 rounded-pill mb-1">
                    ${{ activeQuestionItem.points }} Ballik Savol
                  </span>
                  <h5 class="fw-bold text-white mb-0 text-truncate" style="max-width: 240px;">
                    {{ currentGame.categories[selectedCell.categoryIndex]?.name }}
                  </h5>
                </div>
                <span class="text-secondary small">
                  #{{ selectedCell.categoryIndex + 1 }} Kat. • {{ selectedCell.questionIndex + 1 }}-daraja
                </span>
              </div>

              <!-- Question Input -->
              <div class="mb-3">
                <label class="form-label text-light fw-bold small d-flex align-items-center gap-1">
                  <span>❓</span>
                  <span>Savol Matni (Question Prompt)</span>
                </label>
                <textarea 
                  v-model="activeQuestionItem.question" 
                  rows="4" 
                  class="form-control text-white border-secondary border-opacity-50 rounded-3"
                  placeholder="Savol matnini bu yerga yozing..."
                  style="background-color: #0F172A !important; color: #FFFFFF !important; font-size: 1.05rem;"
                ></textarea>
              </div>

              <!-- Answer Input -->
              <div class="mb-4">
                <label class="form-label text-light fw-bold small d-flex align-items-center gap-1">
                  <span>💡</span>
                  <span>To'g'ri Javob (Correct Answer)</span>
                </label>
                <textarea 
                  v-model="activeQuestionItem.answer" 
                  rows="3" 
                  class="form-control text-white border-success border-opacity-50 rounded-3"
                  placeholder="To'g'ri javobni bu yerga yozing..."
                  style="background-color: #0B1120 !important; color: #34D399 !important; font-weight: 600; font-size: 1.05rem;"
                ></textarea>
              </div>

              <!-- Points Selector -->
              <div class="d-flex align-items-center justify-content-between p-2 rounded-3 bg-dark border border-secondary border-opacity-40 mb-3">
                <span class="text-secondary small fw-semibold">Ball qiymati:</span>
                <div class="btn-group btn-group-sm">
                  <button 
                    v-for="p in [100, 200, 300, 400, 500]" 
                    :key="p"
                    @click="activeQuestionItem.points = p"
                    class="btn btn-sm px-2 fw-bold"
                    :class="activeQuestionItem.points === p ? 'btn-warning text-dark' : 'btn-dark text-secondary'"
                  >
                    ${{ p }}
                  </button>
                </div>
              </div>

              <!-- Navigation Helpers -->
              <div class="d-flex justify-content-between gap-2 pt-2 border-top border-secondary border-opacity-25">
                <button 
                  @click="selectedCell.questionIndex = Math.max(0, selectedCell.questionIndex - 1)" 
                  class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3"
                  :disabled="selectedCell.questionIndex === 0"
                >
                  ↑ Yuqoridagi
                </button>
                <button 
                  @click="selectedCell.questionIndex = Math.min(4, selectedCell.questionIndex + 1)" 
                  class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3"
                  :disabled="selectedCell.questionIndex === 4"
                >
                  ↓ Keyingi Savol
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

      <!-- ==================== TAB 2: AI GENERATION FROM PDF ==================== -->
      <div v-else-if="activeTab === 'ai'" class="max-w-4xl mx-auto py-3">
        
        <div class="card border border-warning border-opacity-40 rounded-4 shadow-2xl p-4 p-md-5" style="background-color: #1E293B; max-width: 850px; margin: 0 auto;">
          
          <div class="d-flex align-items-center gap-3 border-bottom border-secondary border-opacity-30 pb-4 mb-4">
            <div class="p-3 rounded-4 bg-warning bg-opacity-25 text-warning fs-1 d-flex align-items-center justify-content-center" style="width: 68px; height: 68px;">
              <span>🤖</span>
            </div>
            <div>
              <h3 class="brand-font text-white mb-1">PDF dan AI orqali Jeopardy Yaratish</h3>
              <p class="text-secondary small mb-0">Darslik yoki kitob PDF faylini yuklang. Gemini AI matnni tahlil qilib 5x5 Jeopardy o'yinini tuzadi.</p>
            </div>
          </div>

          <!-- Step 1: Dropzone for PDF -->
          <div class="mb-4">
            <div 
              class="border-dashed rounded-4 p-5 text-center cursor-pointer dropzone-box transition-all"
              @dragover.prevent
              @drop.prevent="handlePdfSelect"
              style="background-color: #0F172A; border-color: #F59E0B;"
            >
              <input 
                type="file" 
                id="jeopardyPdfInput" 
                class="d-none" 
                accept=".pdf,.txt,.md" 
                @change="handlePdfSelect"
              />
              <label for="jeopardyPdfInput" class="w-100 cursor-pointer mb-0">
                <div class="fs-1 mb-2">📄</div>
                <h5 class="fw-bold text-white mb-2">
                  {{ selectedPdfFile ? selectedPdfFile.name : 'PDF yoki Matnli Darslikni Yuklang' }}
                </h5>
                <p class="text-secondary small mb-3">
                  {{ selectedPdfFile ? `${(selectedPdfFile.size / 1024).toFixed(1)} KB • ${pdfChunks.length} ta bo'lim ajratildi` : 'Faylni shu yerga tashlang yoki kompyuterdan tanlang' }}
                </p>
                <span class="btn btn-warning rounded-pill px-4 py-2 fw-bold text-dark shadow-sm">
                  <span>{{ selectedPdfFile ? 'Faylni O\'zgartirish' : '📁 Faylni Tanlash' }}</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Step 2: Custom Instructions & Category Settings -->
          <div class="row g-3 mb-4">
            
            <!-- Custom Instructions -->
            <div class="col-12">
              <label class="form-label text-light fw-bold small d-flex align-items-center gap-1">
                <span>🎯</span>
                <span>Maxsus Ko'rsatmalar (Teacher Custom Prompt)</span>
              </label>
              <input 
                v-model="customAiInstructions" 
                type="text" 
                class="form-control text-white border-secondary border-opacity-50 rounded-3"
                placeholder="Masalan: 3-bob bo'yicha savollar tuzilsin, tarixiy sanalarga ko'proq urg'u berilsin..."
                style="background-color: #0F172A !important; color: #FFFFFF !important;"
              />
            </div>

            <!-- Number of Categories -->
            <div class="col-md-6">
              <label class="form-label text-light fw-bold small d-flex align-items-center gap-1">
                <span>🏷️</span>
                <span>Kategoriyalar soni</span>
              </label>
              <select 
                v-model.number="aiCategoryCount" 
                class="form-select text-white border-secondary border-opacity-50 rounded-3"
                style="background-color: #0F172A !important; color: #FFFFFF !important;"
              >
                <option :value="3">3 ta Kategoriya (15 ta savol)</option>
                <option :value="4">4 ta Kategoriya (20 ta savol)</option>
                <option :value="5">5 ta Kategoriya (Standart 25 ta savol)</option>
              </select>
            </div>

            <!-- Language -->
            <div class="col-md-6">
              <label class="form-label text-light fw-bold small d-flex align-items-center gap-1">
                <span>🌐</span>
                <span>O'yin Tili</span>
              </label>
              <select 
                v-model="aiLanguage" 
                class="form-select text-white border-secondary border-opacity-50 rounded-3"
                style="background-color: #0F172A !important; color: #FFFFFF !important;"
              >
                <option value="uz">O'zbekcha</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>

          </div>

          <!-- Progress Indicator -->
          <div v-if="isGeneratingAi" class="text-center py-4 mb-3">
            <div class="spinner-border text-warning mb-2" role="status"></div>
            <p class="text-warning fw-semibold small mb-2">{{ aiProgressStep }}</p>
            <div class="progress rounded-pill bg-dark mx-auto" style="max-width: 300px; height: 6px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning w-100"></div>
            </div>
          </div>

          <!-- Generate Button -->
          <button 
            @click="handleGenerateJeopardyAi" 
            class="btn btn-warning btn-lg w-100 rounded-pill py-3 fw-bold text-dark shadow-lg d-flex align-items-center justify-content-center gap-2"
            :disabled="isGeneratingAi || !extractedPdfText"
          >
            <span>✨</span>
            <span>{{ isGeneratingAi ? 'AI O\'yinni Tuzmoqda...' : 'Jeopardy O\'yinini Generatsiya Qilish' }}</span>
          </button>

        </div>

      </div>

    </main>

    <!-- ==================== SAVED JEOPARDY GAMES MODAL ==================== -->
    <div v-if="showSavedModal" class="modal-backdrop fade show" style="background-color: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px); z-index: 1060;"></div>
    
    <div v-if="showSavedModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1065;">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content text-light border border-secondary border-opacity-40 shadow-2xl rounded-4 overflow-hidden" style="background-color: #0F172A;">
          
          <div class="modal-header border-secondary border-opacity-25 px-4 py-3" style="background-color: #1E293B;">
            <h5 class="modal-title brand-font text-white d-flex align-items-center gap-2">
              <span>📚</span>
              <span>Saqlangan Jeopardy O'yinlari Kutubxonasi</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="showSavedModal = false"></button>
          </div>

          <div class="modal-body p-4" style="max-height: 70vh; overflow-y: auto;">
            <div v-if="isLibraryLoading" class="text-center py-4">
              <div class="spinner-border text-info" role="status"></div>
            </div>

            <div v-else-if="savedGames.length === 0" class="text-center py-4">
              <p class="text-secondary mb-0">Hozircha saqlangan Jeopardy o'yini yo'q.</p>
            </div>

            <div v-else class="row g-3">
              <div v-for="game in savedGames" :key="game.id" class="col-12">
                <div class="p-3 rounded-4 border border-secondary border-opacity-30 bg-slate-900 d-flex align-items-center justify-content-between flex-wrap gap-3" style="background-color: #1E293B;">
                  <div class="d-flex align-items-center gap-3">
                    <span class="fs-2">{{ game.isAiGenerated ? '🤖' : (game.isTemplate ? '🌟' : '🎯') }}</span>
                    <div>
                      <h6 class="text-white fw-bold mb-1">{{ game.title }}</h6>
                      <span class="text-secondary small">
                        🏷️ {{ game.categories?.length || 0 }} ta Kategoriya • ❓ {{ game.categories?.reduce((s, c) => s + (c.questions?.length || 0), 0) }} ta Savol
                      </span>
                    </div>
                  </div>

                  <div class="d-flex align-items-center gap-2">
                    <button 
                      @click="handlePlaySavedGame(game)" 
                      class="btn btn-sm btn-warning text-dark fw-bold rounded-pill px-3 shadow-sm d-flex align-items-center gap-1"
                      title="To'liq ekranda o'ynash"
                    >
                      <span>🚀</span>
                      <span>O'ynash</span>
                    </button>
                    <button 
                      @click="loadGameToEditor(game)" 
                      class="btn btn-sm btn-outline-info rounded-pill px-3"
                    >
                      Tahrirlash
                    </button>
                    <button 
                      v-if="!game.isTemplate"
                      @click="handleDeleteGame(game)" 
                      class="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center"
                      style="width: 32px; height: 32px;"
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer border-secondary border-opacity-25 px-4 py-3">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="showSavedModal = false">
              Yopish
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.jeopardy-board-container {
  overflow-x: auto;
}

.jeopardy-grid {
  display: grid;
  gap: 0.75rem;
  min-width: 650px;
}

.category-header-cell {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jeopardy-card-cell {
  min-height: 100px;
  cursor: pointer;
}

.jeopardy-card-cell:hover {
  transform: translateY(-3px);
  border-color: #F59E0B !important;
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.25) !important;
}

.jeopardy-card-cell.is-selected {
  border-color: #F59E0B !important;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4) !important;
}

.border-dashed {
  border: 2px dashed #F59E0B !important;
}

.cursor-pointer {
  cursor: pointer;
}

.fs-7 {
  font-size: 0.85rem;
}

.fs-8 {
  font-size: 0.75rem;
}
</style>
