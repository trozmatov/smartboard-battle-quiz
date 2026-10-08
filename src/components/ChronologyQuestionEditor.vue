<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  question: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:question']);

// Initialize items if they don't exist
if (!props.question.items) {
  props.question.items = [
    { id: '1', text: '' },
    { id: '2', text: '' }
  ];
}

const items = computed({
  get: () => props.question.items,
  set: (val) => {
    emit('update:question', { ...props.question, items: val });
  }
});

function addItem() {
  if (items.value.length < 5) {
    items.value.push({ id: Date.now().toString(), text: '' });
  }
}

function removeItem(index) {
  if (items.value.length > 2) {
    items.value.splice(index, 1);
  }
}

// Validation logic for the teacher UI
const validationError = computed(() => {
  if (items.value.length < 2 || items.value.length > 5) return "Voqealar soni 2 tadan 5 tagacha bo'lishi shart.";
  for (let i = 0; i < items.value.length; i++) {
    if (!items.value[i].text.trim()) {
      return "Bo'sh voqea kiritish mumkin emas.";
    }
  }
  const texts = items.value.map(i => i.text.trim().toLowerCase());
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== texts.length) {
    return "Takroriy voqea kiritish mumkin emas.";
  }
  return null;
});

// Update error message back to parent if needed, but in this architecture, 
// the parent just validates before saving. I will expose it or just show it locally.
</script>

<template>
  <div class="chronology-editor mt-4">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <label class="form-label text-light fw-bold fs-5 mb-0">
        Xronologik Tartib Voqealari
      </label>
      <small class="text-info">
        <i class="bi bi-info-circle me-1"></i> Voqealarni aniq ketma-ketlikda (eng avvaldan eng keyingiga) kiriting!
      </small>
    </div>

    <!-- Error warning if validation fails -->
    <div v-if="validationError" class="alert alert-warning py-2 small d-flex align-items-center mb-3">
      <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ validationError }}
    </div>

    <!-- Draggable list -->
    <draggable 
      v-model="items" 
      item-key="id" 
      handle=".drag-handle" 
      class="list-group gap-2"
      animation="200"
    >
      <template #item="{ element, index }">
        <div class="list-group-item d-flex align-items-center gap-3 p-3 rounded-4 border border-secondary border-opacity-25" style="background-color: #162032;">
          
          <div class="drag-handle text-secondary" style="cursor: grab;" title="Sudrash uchun ushlang">
            <i class="bi bi-grip-vertical fs-4"></i>
          </div>
          
          <div class="badge rounded-circle bg-info text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
            {{ index + 1 }}
          </div>

          <div class="flex-grow-1">
            <input 
              v-model="element.text" 
              type="text" 
              class="form-control text-white border-secondary border-opacity-50 rounded-3" 
              placeholder="Voqea nomini kiriting..."
              style="background-color: #0F172A !important; color: #FFFFFF !important;"
              maxlength="100"
            />
          </div>

          <button 
            @click="removeItem(index)" 
            class="btn btn-outline-danger border-0 rounded-circle p-2" 
            :disabled="items.length <= 2"
            title="O'chirish"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </template>
    </draggable>

    <div class="mt-3">
      <button 
        @click="addItem" 
        class="btn btn-outline-info rounded-pill px-4 fw-bold"
        :disabled="items.length >= 5"
      >
        <i class="bi bi-plus-lg me-1"></i> Voqea qo'shish
      </button>
      <small class="text-secondary ms-3" v-if="items.length >= 5">Maksimal 5 ta voqea qo'shish mumkin.</small>
    </div>
  </div>
</template>

<style scoped>
.drag-handle:active {
  cursor: grabbing !important;
}
</style>
