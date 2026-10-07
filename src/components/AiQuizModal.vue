<script setup>
import { ref, watch } from 'vue';
import { extractTextFromFile, chunkDocumentText, generateQuizWithGemini } from '../services/aiQuizService';
import { sound } from '../utils/sound';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'quiz-generated']);

// Form & State
const currentStep = ref(1); // 1: Upload, 2: Settings, 3: Generating, 4: Success
const selectedFile = ref(null);
const extractedText = ref('');
const textChunks = ref([]);
const totalPages = ref(0);

// Generation Options
const questionCount = ref(5);
const difficulty = ref('medium'); // 'easy' | 'medium' | 'hard' | 'mixed'
const language = ref('uz'); // 'uz' | 'en' | 'ru'
const defaultTimeLimit = ref(15); // 10s | 15s | 20s | 30s

// Progress & Loading
const isProcessing = ref(false);
const progressStep = ref('');
const errorMessage = ref('');
const generatedQuizResult = ref(null);

// Reset when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetState();
  }
});

function resetState() {
  currentStep.value = 1;
  selectedFile.value = null;
  extractedText.value = '';
  textChunks.value = [];
  totalPages.value = 0;
  isProcessing.value = false;
  progressStep.value = '';
  errorMessage.value = '';
  generatedQuizResult.value = null;
}

// File drop & select handler
async function handleFileSelect(e) {
  const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
    errorMessage.value = 'Iltimos, faqat PDF yoki TXT formatidagi fayl yuklang.';
    return;
  }

  selectedFile.value = file;
  errorMessage.value = '';
  isProcessing.value = true;
  progressStep.value = 'Fayl o\'qilmoqda va tahlil qilinmoqda...';

  try {
    const text = await extractTextFromFile(file, (page, total) => {
      totalPages.value = total;
      progressStep.value = `PDF sahifasi o'qilmoqda: ${page} / ${total}...`;
    });

    extractedText.value = text;
    // Chunking text
    const chunks = chunkDocumentText(text, 1500, 200);
    textChunks.value = chunks;

    sound.playTick();
    currentStep.value = 2; // Move to Settings
  } catch (err) {
    errorMessage.value = 'Faylni o\'qishda xatolik: ' + err.message;
    sound.playWrong();
  } finally {
    isProcessing.value = false;
  }
}

// Generate Quiz via Gemini AI + Google Embedding
async function handleGenerateQuiz() {
  errorMessage.value = '';
  isProcessing.value = true;
  currentStep.value = 3;
  progressStep.value = 'Google text-embedding-004 va Gemini AI orqali test savollari tuzilmoqda...';

  try {
    const quiz = await generateQuizWithGemini({
      rawText: extractedText.value,
      chunks: textChunks.value,
      questionCount: questionCount.value,
      difficulty: difficulty.value,
      language: language.value
    });

    // Apply default time limit if set
    if (quiz.questions) {
      quiz.questions.forEach(q => {
        if (!q.timeLimit) q.timeLimit = defaultTimeLimit.value;
      });
    }

    generatedQuizResult.value = quiz;
    currentStep.value = 4; // Success
    sound.playFanfare();
  } catch (err) {
    errorMessage.value = 'AI Generatsiyada xatolik: ' + err.message;
    currentStep.value = 2; // Back to settings
    sound.playWrong();
  } finally {
    isProcessing.value = false;
  }
}

// Transfer to Teacher Editor
function handleOpenInEditor() {
  if (generatedQuizResult.value) {
    emit('quiz-generated', generatedQuizResult.value);
    emit('close');
  }
}
</script>

<template>
  <div v-if="show" class="modal-backdrop fade show" style="background-color: rgba(15, 23, 42, 0.88); backdrop-filter: blur(10px); z-index: 1060;"></div>
  
  <div v-if="show" class="modal fade show d-block" tabindex="-1" style="z-index: 1065;" role="dialog" aria-modal="true" aria-labelledby="aiQuizModalTitle">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content text-light border border-secondary border-opacity-40 shadow-2xl rounded-4 overflow-hidden" style="background-color: #0F172A;">
        
        <!-- Header -->
        <div class="modal-header border-secondary border-opacity-25 px-4 py-3" style="background: linear-gradient(135deg, #1E1B4B 0%, #1E293B 100%);">
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 bg-primary bg-opacity-25 text-info fs-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
              <i class="bi bi-robot"></i>
            </div>
            <div>
              <h4 id="aiQuizModalTitle" class="modal-title brand-font text-white mb-0 d-flex align-items-center gap-2">
                PDF dan AI Test Yaratish
                <span class="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-40 rounded-pill fs-7">
                  Google Embedding & Gemini
                </span>
              </h4>
              <p class="text-secondary small mb-0">PDF faylni yuklang, AI matnni tahlil qilib avtomatik test savollari tuzadi.</p>
            </div>
          </div>
          <button type="button" class="btn-close btn-close-white" @click="emit('close')"></button>
        </div>

        <!-- Body -->
        <div class="modal-body p-4" style="background-color: #0F172A;">
          
          <!-- Error Banner -->
          <div v-if="errorMessage" class="alert alert-danger py-2 small d-flex align-items-center gap-2 rounded-3 mb-3">
            <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- ==================== STEP 1: UPLOAD PDF ==================== -->
          <div v-if="currentStep === 1">
            <div 
              class="border-dashed rounded-4 p-5 text-center cursor-pointer dropzone-box transition-all"
              @dragover.prevent
              @drop.prevent="handleFileSelect"
              style="background-color: #1E293B; border-color: #38BDF8;"
            >
              <input 
                type="file" 
                id="pdfFileInput" 
                class="d-none" 
                accept=".pdf,.txt,.md" 
                @change="handleFileSelect"
              />
              <label for="pdfFileInput" class="w-100 cursor-pointer mb-0">
                <div class="display-3 text-info mb-3">
                  <i class="bi bi-file-earmark-pdf-fill"></i>
                </div>
                <h5 class="fw-bold text-white mb-2">PDF yoki Matnli Hujjatni Yuklang</h5>
                <p class="text-secondary small mb-3">
                  Faylni shu yerga tashlang yoki kompyuterdan tanlang (PDF, TXT)
                </p>
                <span class="btn btn-primary rounded-pill px-4 py-2 fw-semibold">
                  <i class="bi bi-cloud-upload me-1"></i> Faylni Tanlash
                </span>
              </label>
            </div>

            <div v-if="isProcessing" class="text-center mt-4">
              <div class="spinner-border text-info spinner-border-sm me-2" role="status"></div>
              <span class="text-light small">{{ progressStep }}</span>
            </div>
          </div>

          <!-- ==================== STEP 2: CONFIGURE AI QUIZ SETTINGS ==================== -->
          <div v-else-if="currentStep === 2">
            
            <!-- File Info Header -->
            <div class="p-3 rounded-3 bg-slate-900 border border-secondary border-opacity-30 mb-4 d-flex align-items-center justify-content-between" style="background-color: #1E293B;">
              <div class="d-flex align-items-center gap-3">
                <i class="bi bi-file-earmark-check-fill text-success fs-3"></i>
                <div>
                  <h6 class="text-white fw-bold mb-0">{{ selectedFile?.name }}</h6>
                  <span class="text-secondary small">
                    {{ (selectedFile?.size / 1024).toFixed(1) }} KB • {{ textChunks.length }} ta semantik bo'lim (chunk) ajratildi
                  </span>
                </div>
              </div>
              <button @click="currentStep = 1" class="btn btn-sm btn-outline-secondary rounded-pill">
                O'zgartirish
              </button>
            </div>

            <!-- Settings Grid (CLEAN & SIMPLE FOR TEACHERS) -->
            <div class="row g-3">
              
              <!-- Question Count -->
              <div class="col-md-6">
                <label class="form-label text-light fw-semibold small">
                  <i class="bi bi-list-ol text-warning me-1"></i> Savollar soni
                </label>
                <select 
                  v-model.number="questionCount" 
                  class="form-select text-white border-secondary border-opacity-50 rounded-3"
                  style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                >
                  <option :value="3">3 ta savol (Tezkor)</option>
                  <option :value="5">5 ta savol (Standart)</option>
                  <option :value="8">8 ta savol</option>
                  <option :value="10">10 ta savol (Kengaytirilgan)</option>
                  <option :value="15">15 ta savol (To'liq imtihon)</option>
                </select>
              </div>

              <!-- Difficulty -->
              <div class="col-md-6">
                <label class="form-label text-light fw-semibold small">
                  <i class="bi bi-bar-chart-steps text-info me-1"></i> Qiyinlik darajasi
                </label>
                <select 
                  v-model="difficulty" 
                  class="form-select text-white border-secondary border-opacity-50 rounded-3"
                  style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                >
                  <option value="easy">Oson (Faktlar va xotira)</option>
                  <option value="medium">O'rta (Tushunish va tahlil)</option>
                  <option value="hard">Qiyin (Mantiqiy chuqur savollar)</option>
                  <option value="mixed">Aralash (Oson, o'rta, qiyin)</option>
                </select>
              </div>

              <!-- Language -->
              <div class="col-md-6">
                <label class="form-label text-light fw-semibold small">
                  <i class="bi bi-translate text-success me-1"></i> Test Tili
                </label>
                <select 
                  v-model="language" 
                  class="form-select text-white border-secondary border-opacity-50 rounded-3"
                  style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                >
                  <option value="uz">O'zbekcha</option>
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                </select>
              </div>

              <!-- Time Limit per Question -->
              <div class="col-md-6">
                <label class="form-label text-light fw-semibold small">
                  <i class="bi bi-stopwatch text-warning me-1"></i> Har bir savol uchun vaqt
                </label>
                <select 
                  v-model.number="defaultTimeLimit" 
                  class="form-select text-white border-secondary border-opacity-50 rounded-3"
                  style="background-color: #0B1120 !important; color: #FFFFFF !important;"
                >
                  <option :value="10">10 soniya</option>
                  <option :value="15">15 soniya (Tavsiya etiladi)</option>
                  <option :value="20">20 soniya</option>
                  <option :value="30">30 soniya</option>
                </select>
              </div>

            </div>

            <!-- Action Button -->
            <div class="mt-4 pt-2">
              <button 
                @click="handleGenerateQuiz" 
                class="btn btn-warning btn-lg w-100 rounded-pill py-3 fw-bold text-dark shadow-lg d-flex align-items-center justify-content-center gap-2"
                :disabled="isProcessing"
              >
                <i class="bi bi-stars fs-4"></i>
                <span>Test Savollarini Generatsiya Qilish</span>
              </button>
            </div>

          </div>

          <!-- ==================== STEP 3: GENERATING IN PROGRESS ==================== -->
          <div v-else-if="currentStep === 3" class="text-center py-5">
            <div class="spinner-grow text-warning mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
            <h4 class="brand-font text-white mb-2">Google Embedding & Gemini AI Ishlamoqda...</h4>
            <p class="text-secondary small mb-3">{{ progressStep }}</p>
            
            <div class="progress rounded-pill bg-dark mx-auto" style="max-width: 350px; height: 8px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning w-100"></div>
            </div>
          </div>

          <!-- ==================== STEP 4: SUCCESS ==================== -->
          <div v-else-if="currentStep === 4 && generatedQuizResult" class="text-center py-4">
            <div class="display-3 text-success mb-3 animate__animated animate__bounceIn">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            
            <h3 class="brand-font text-white mb-1">{{ generatedQuizResult.title }}</h3>
            <p class="text-secondary small mb-4">
              <strong>{{ generatedQuizResult.questions.length }} ta savol</strong> Google Embedding 2 va Gemini AI orqali muvaffaqiyatli tuzildi. Endi uni tahrirlash oynasida ko'rib chiqishingiz va saqlashingiz mumkin.
            </p>

            <div class="d-flex justify-content-center gap-3">
              <button 
                @click="handleOpenInEditor" 
                class="btn btn-lg btn-warning rounded-pill px-5 py-3 fw-bold text-dark shadow-lg d-flex align-items-center gap-2"
              >
                <i class="bi bi-pencil-square fs-5"></i>
                <span>Tahrirlash Oynasiga O'tish</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between" style="background-color: #1E293B;">
          <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="emit('close')">
            Yopish
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.border-dashed {
  border: 2px dashed #38BDF8 !important;
}
.dropzone-box:hover {
  background-color: #162032 !important;
  border-color: #F59E0B !important;
}
.cursor-pointer {
  cursor: pointer;
}
.fs-7 {
  font-size: 0.75rem;
}
</style>
