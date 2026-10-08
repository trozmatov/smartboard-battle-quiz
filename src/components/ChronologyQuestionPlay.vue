<script setup>
import { ref, computed, watch } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  playerKey: {
    type: String,
    required: true
  },
  game: {
    type: Object,
    required: true
  },
  timeLeft: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['submit']);

const playerState = computed(() => props.game[props.playerKey]);
const isAnswered = computed(() => playerState.value.answeredCurrent || props.timeLeft === 0 || props.game.roundEnded);

// We need a local array for the student to drag.
// It is initialized from question.displayItems.
const localItems = ref([]);

// Watch for question change to reset local items
watch(() => props.question, (newQ) => {
  if (newQ && newQ.type === 'chronology' && newQ.displayItems) {
    // Clone displayItems for local manipulation
    localItems.value = JSON.parse(JSON.stringify(newQ.displayItems));
  } else {
    localItems.value = [];
  }
}, { immediate: true, deep: true });

function submitAnswer() {
  if (isAnswered.value) return;
  // Emit the submitted order
  emit('submit', props.playerKey, localItems.value.map(i => i.id));
}

// Function to check if a specific item is in its correct original position
function isItemCorrect(item, index) {
  if (!isAnswered.value) return null; // don't show feedback until answered
  
  // The correct order is `props.question.items`
  // item is currently at index `index` in localItems
  // what is its index in the original items?
  const originalIndex = props.question.items.findIndex(i => i.id === item.id);
  
  // For chronology, we show if it's placed in the exactly right slot.
  // Alternatively, just checking if originalIndex === index.
  return originalIndex === index;
}

function moveUp(index) {
  if (index > 0 && !isAnswered.value) {
    const temp = localItems.value[index];
    localItems.value[index] = localItems.value[index - 1];
    localItems.value[index - 1] = temp;
  }
}

function moveDown(index) {
  if (index < localItems.value.length - 1 && !isAnswered.value) {
    const temp = localItems.value[index];
    localItems.value[index] = localItems.value[index + 1];
    localItems.value[index + 1] = temp;
  }
}

const shapes = [
  'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangle
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // Diamond
  'circle(50% at 50% 50%)', // Circle
  'inset(0)', // Square
  'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)' // Pentagon
];

const colors = ['#E21B3C', '#1368CE', '#D89E00', '#26890C', '#8E44AD'];

function getShapeStyle(index) {
  return {
    clipPath: shapes[index % shapes.length],
    backgroundColor: colors[index % colors.length]
  };
}
</script>

<template>
  <div class="chronology-play w-100 h-100 d-flex flex-column">
    <div class="alert alert-secondary py-2 px-3 text-center small fw-bold shadow-sm d-flex justify-content-center align-items-center gap-2 mb-3" style="background-color: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2);">
      <i class="bi bi-arrows-expand"></i> Plitkalarni to'g'ri tartibda (avvaldan keyinga) joylashtirish uchun sudrang
    </div>

    <!-- The Draggable Puzzle Container -->
    <div class="puzzle-container flex-grow-1 position-relative d-flex flex-column gap-2 overflow-auto px-2 pb-2">
      <draggable 
        v-model="localItems" 
        item-key="id" 
        handle=".drag-handle" 
        class="d-flex flex-column gap-2"
        animation="300"
        :disabled="isAnswered"
      >
        <template #item="{ element, index }">
          <div 
            class="puzzle-piece rounded-3 d-flex align-items-stretch overflow-hidden shadow-sm transition-all"
            :class="{ 
              'disabled-piece': isAnswered,
              'correct-piece': isAnswered && isItemCorrect(element, index),
              'wrong-piece': isAnswered && !isItemCorrect(element, index)
            }"
            style="background-color: #2D3748; min-height: 60px;"
          >
            <!-- Drag Handle / Shape indicator -->
            <div 
              class="drag-handle d-flex align-items-center justify-content-center"
              style="width: 50px; cursor: grab; background-color: rgba(0,0,0,0.2);"
            >
              <div v-if="!isAnswered" style="width: 20px; height: 20px;" :style="getShapeStyle(index)"></div>
              <!-- Status Icon when answered -->
              <div v-else>
                <i v-if="isItemCorrect(element, index)" class="bi bi-check-lg text-success fs-3"></i>
                <i v-else class="bi bi-x-lg text-danger fs-3"></i>
              </div>
            </div>

            <!-- Text Content (Also acts as a drag handle for easier touch) -->
            <div class="drag-handle p-3 flex-grow-1 d-flex align-items-center text-white fw-bold fs-5" style="cursor: grab;" title="Sudrash uchun ushlang">
              {{ element.text }}
            </div>
            
            <!-- Manual Move Buttons (For Smart Board UX) -->
            <div v-if="!isAnswered" class="px-2 py-1 d-flex flex-column justify-content-center align-items-center border-start border-secondary border-opacity-25 gap-1" style="background-color: rgba(0,0,0,0.15); min-width: 50px;">
              <button @click.stop="moveUp(index)" :disabled="index === 0" class="btn btn-sm btn-dark py-0 px-2 rounded opacity-75 hover-opacity-100" style="font-size: 1.2rem; line-height: 1;"><i class="bi bi-caret-up-fill"></i></button>
              <button @click.stop="moveDown(index)" :disabled="index === localItems.length - 1" class="btn btn-sm btn-dark py-0 px-2 rounded opacity-75 hover-opacity-100" style="font-size: 1.2rem; line-height: 1;"><i class="bi bi-caret-down-fill"></i></button>
            </div>

            <!-- Index indicator -->
            <div class="px-3 d-flex align-items-center justify-content-center fw-bold fs-4 text-white border-start border-secondary border-opacity-25" style="background-color: rgba(0,0,0,0.25); min-width: 50px;">
              {{ index + 1 }}
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- Submit Button -->
    <div class="mt-3 text-center">
      <button 
        @click="submitAnswer" 
        class="btn btn-lg btn-warning rounded-pill px-5 fw-bold shadow-lg"
        :disabled="isAnswered"
      >
        Javobni yuborish <i class="bi bi-send-fill ms-1"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.puzzle-piece {
  border: 2px solid transparent;
}
.drag-handle:active {
  cursor: grabbing !important;
}
.disabled-piece {
  opacity: 0.9;
}
.disabled-piece .drag-handle {
  cursor: default !important;
}
.correct-piece {
  border-color: #10B981 !important; /* Green */
  background-color: rgba(16, 185, 129, 0.1) !important;
}
.wrong-piece {
  border-color: #EF4444 !important; /* Red */
  background-color: rgba(239, 68, 68, 0.1) !important;
}
</style>
