<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getQuizzes, deleteQuiz } from '../firebase/quizService';
import { sound } from '../utils/sound';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'select-quiz', 'start-game', 'create-new']);

const quizzes = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const searchQuery = ref('');
const activeFilter = ref('all'); // 'all' | 'custom' | 'templates'
const expandedQuizId = ref(null);

// Watch for modal opening to instantly fetch quizzes
watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchQuizzes();
  }
});

async function fetchQuizzes() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const list = await getQuizzes();
    quizzes.value = list;
  } catch (err) {
    console.error('Failed to load quizzes:', err);
    errorMsg.value = 'Could not load quizzes. Using built-in templates.';
  } finally {
    loading.value = false;
  }
}

// Filtered and searched quizzes
const filteredQuizzes = computed(() => {
  let list = quizzes.value;
  
  if (activeFilter.value === 'custom') {
    list = list.filter(q => !q.isTemplate);
  } else if (activeFilter.value === 'templates') {
    list = list.filter(q => q.isTemplate);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    list = list.filter(q => 
      (q.title && q.title.toLowerCase().includes(query)) ||
      (q.questions && q.questions.some(item => item.questionText && item.questionText.toLowerCase().includes(query)))
    );
  }

  return list;
});

function calculateTotalPoints(quiz) {
  if (!quiz.questions) return 0;
  return quiz.questions.reduce((sum, q) => sum + (q.points || 100), 0);
}

function calculateEstimatedTime(quiz) {
  if (!quiz.questions || quiz.questions.length === 0) return '0s';
  const totalSeconds = quiz.questions.reduce((sum, q) => sum + (q.timeLimit || 15), 0);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) {
    return `~${mins}m ${secs > 0 ? secs + 's' : ''}`;
  }
  return `~${secs}s`;
}

function toggleExpand(id) {
  expandedQuizId.value = expandedQuizId.value === id ? null : id;
  sound.playTick();
}

async function handleDelete(quiz) {
  if (quiz.isTemplate) {
    alert('Starter templates are read-only. You can edit and save them as your own custom quiz.');
    return;
  }
  if (confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
    try {
      await deleteQuiz(quiz.id);
      quizzes.value = quizzes.value.filter(q => q.id !== quiz.id);
      sound.playTick();
    } catch (err) {
      alert('Error deleting quiz: ' + err.message);
    }
  }
}

function handleSelect(quiz) {
  emit('select-quiz', quiz);
  emit('close');
}

function handleStartDirect(quiz) {
  emit('start-game', quiz);
  emit('close');
}

function handleCreateNew() {
  emit('create-new');
  emit('close');
}

onMounted(() => {
  if (props.show) {
    fetchQuizzes();
  }
});
</script>

<template>
  <div v-if="show" class="modal-backdrop fade show" style="background-color: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); z-index: 1050;"></div>
  
  <div v-if="show" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content text-light border border-secondary border-opacity-50 shadow-2xl rounded-4 overflow-hidden" style="background-color: #0F172A; border-color: #334155;">
        
        <!-- Professional Modal Header -->
        <div class="modal-header border-secondary border-opacity-25 px-4 py-3" style="background-color: #1E293B;">
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 bg-warning bg-opacity-20 text-warning fs-4 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px;">
              <i class="bi bi-collection-play-fill"></i>
            </div>
            <div>
              <h4 class="modal-title brand-font text-white mb-0 d-flex align-items-center gap-2">
                Quiz Library & Templates
                <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50 fs-7 rounded-pill">
                  {{ quizzes.length }} Available
                </span>
              </h4>
              <p class="text-secondary small mb-0">Browse saved quizzes, inspect questions, or launch a live smartboard battle.</p>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button @click="handleCreateNew" class="btn btn-sm btn-outline-warning rounded-pill px-3 fw-semibold">
              <i class="bi bi-plus-lg me-1"></i> New Quiz
            </button>
            <button type="button" class="btn-close btn-close-white" @click="emit('close')"></button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="px-4 py-3 border-bottom border-secondary border-opacity-25 bg-slate-900 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3" style="background-color: #162032;">
          
          <!-- Search Input -->
          <div class="input-group" style="max-width: 380px;">
            <span class="input-group-text bg-dark border-secondary border-opacity-50 text-secondary">
              <i class="bi bi-search"></i>
            </span>
            <input 
              v-model="searchQuery" 
              type="text" 
              class="form-control form-control-sm bg-dark text-white border-secondary border-opacity-50"
              placeholder="Search quiz title or question..."
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="btn btn-sm btn-dark border-secondary border-opacity-50 text-secondary">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Category Filter Pills -->
          <div class="btn-group btn-group-sm rounded-pill p-1 bg-dark border border-secondary border-opacity-50">
            <button 
              @click="activeFilter = 'all'" 
              class="btn btn-sm rounded-pill px-3 py-1 fw-semibold"
              :class="activeFilter === 'all' ? 'btn-primary' : 'btn-dark text-secondary'"
            >
              All ({{ quizzes.length }})
            </button>
            <button 
              @click="activeFilter = 'templates'" 
              class="btn btn-sm rounded-pill px-3 py-1 fw-semibold"
              :class="activeFilter === 'templates' ? 'btn-warning text-dark' : 'btn-dark text-secondary'"
            >
              Templates
            </button>
            <button 
              @click="activeFilter = 'custom'" 
              class="btn btn-sm rounded-pill px-3 py-1 fw-semibold"
              :class="activeFilter === 'custom' ? 'btn-info text-dark' : 'btn-dark text-secondary'"
            >
              Custom Saved
            </button>
          </div>

        </div>

        <!-- Modal Body (Quiz Cards Grid) -->
        <div class="modal-body p-4" style="background-color: #0F172A; max-height: calc(100vh - 280px);">
          
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-warning" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-secondary">Fetching quizzes...</p>
          </div>

          <!-- Empty Search State -->
          <div v-else-if="filteredQuizzes.length === 0" class="text-center py-5">
            <i class="bi bi-search display-3 text-secondary opacity-50"></i>
            <h5 class="mt-3 text-white">No Quizzes Found</h5>
            <p class="text-secondary small">No quizzes match your filter "{{ searchQuery }}".</p>
            <button @click="searchQuery = ''; activeFilter = 'all'" class="btn btn-sm btn-outline-secondary rounded-pill">
              Clear Filters
            </button>
          </div>

          <!-- Quizzes List -->
          <div v-else class="row g-3">
            <div 
              v-for="quiz in filteredQuizzes" 
              :key="quiz.id" 
              class="col-12"
            >
              <div class="card border border-secondary border-opacity-30 rounded-4 shadow-sm quiz-item-card transition-all" style="background-color: #1E293B;">
                
                <!-- Main Card Header & Stats -->
                <div class="p-3 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                  
                  <div class="d-flex align-items-start gap-3">
                    <div class="p-3 rounded-3 bg-dark border border-secondary border-opacity-30 text-warning fs-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 52px; height: 52px;">
                      <i :class="quiz.isTemplate ? 'bi bi-stars' : 'bi bi-journal-text'"></i>
                    </div>

                    <div>
                      <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <h5 class="fw-bold text-white mb-0">{{ quiz.title || 'Untitled Quiz' }}</h5>
                        
                        <span v-if="quiz.isTemplate" class="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-40 rounded-pill px-2 py-0 fs-8">
                          Starter Template
                        </span>
                        <span v-else class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-40 rounded-pill px-2 py-0 fs-8">
                          Cloud Saved
                        </span>
                      </div>

                      <!-- Stats Badges -->
                      <div class="d-flex align-items-center gap-3 text-secondary small flex-wrap">
                        <span><i class="bi bi-question-circle text-info me-1"></i><strong>{{ quiz.questions ? quiz.questions.length : 0 }}</strong> Questions</span>
                        <span>•</span>
                        <span><i class="bi bi-star-fill text-warning me-1"></i><strong>{{ calculateTotalPoints(quiz) }}</strong> Total Points</span>
                        <span>•</span>
                        <span><i class="bi bi-clock text-secondary me-1"></i>{{ calculateEstimatedTime(quiz) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                    
                    <!-- Preview Button -->
                    <button 
                      @click="toggleExpand(quiz.id)" 
                      class="btn btn-sm btn-outline-secondary text-light rounded-pill px-3"
                      :title="expandedQuizId === quiz.id ? 'Hide Questions' : 'Preview Questions'"
                    >
                      <i :class="expandedQuizId === quiz.id ? 'bi bi-chevron-up me-1' : 'bi bi-eye me-1'"></i>
                      <span>{{ expandedQuizId === quiz.id ? 'Hide' : 'Preview' }}</span>
                    </button>

                    <!-- Edit / Load Button -->
                    <button 
                      @click="handleSelect(quiz)" 
                      class="btn btn-sm btn-outline-info rounded-pill px-3"
                      title="Load into Editor"
                    >
                      <i class="bi bi-pencil-square me-1"></i> Edit
                    </button>

                    <!-- Launch Game Button -->
                    <button 
                      @click="handleStartDirect(quiz)" 
                      class="btn btn-sm btn-warning text-dark fw-bold rounded-pill px-4 shadow d-flex align-items-center gap-1"
                      title="Start Live Match with this Quiz"
                    >
                      <i class="bi bi-play-fill fs-5"></i>
                      <span>Launch Game</span>
                    </button>

                    <!-- Delete Button (Only for custom quizzes) -->
                    <button 
                      v-if="!quiz.isTemplate"
                      @click="handleDelete(quiz)" 
                      class="btn btn-sm btn-outline-danger rounded-circle"
                      style="width: 32px; height: 32px;"
                      title="Delete Quiz"
                    >
                      <i class="bi bi-trash"></i>
                    </button>

                  </div>

                </div>

                <!-- Expandable Question Preview Accordion -->
                <div v-if="expandedQuizId === quiz.id" class="border-top border-secondary border-opacity-25 p-3 bg-dark bg-opacity-50">
                  <h6 class="text-warning small fw-bold mb-3 d-flex align-items-center gap-2">
                    <i class="bi bi-list-check"></i>
                    Questions Included ({{ quiz.questions.length }}):
                  </h6>

                  <div class="row g-2">
                    <div 
                      v-for="(q, qIdx) in quiz.questions" 
                      :key="qIdx" 
                      class="col-md-6"
                    >
                      <div class="p-2 rounded-3 bg-slate-900 border border-secondary border-opacity-30 small" style="background-color: #0F172A;">
                        <div class="d-flex align-items-center justify-content-between text-white fw-semibold mb-1">
                          <span>#{{ qIdx + 1 }}. {{ q.questionText }}</span>
                          <span class="badge bg-secondary rounded-pill fs-8">{{ q.timeLimit }}s</span>
                        </div>
                        <div class="row g-1">
                          <div 
                            v-for="(opt, optIdx) in q.options" 
                            :key="optIdx" 
                            class="col-6"
                          >
                            <span 
                              class="d-block text-truncate px-2 py-0 rounded fs-8"
                              :class="optIdx === q.correctIndex ? 'bg-success bg-opacity-25 text-success fw-bold border border-success border-opacity-40' : 'text-secondary'"
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

        <!-- Professional Footer -->
        <div class="modal-footer border-secondary border-opacity-25 px-4 py-3 justify-content-between" style="background-color: #1E293B;">
          <button @click="fetchQuizzes" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
            <i class="bi bi-arrow-clockwise me-1"></i> Reload
          </button>
          
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="emit('close')">
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-item-card:hover {
  border-color: rgba(255, 193, 7, 0.4) !important;
  transform: translateY(-1px);
}
.fs-7 {
  font-size: 0.75rem;
}
.fs-8 {
  font-size: 0.7rem;
}
</style>
