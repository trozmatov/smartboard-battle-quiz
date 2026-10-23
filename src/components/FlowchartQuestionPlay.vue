<script setup>
import { ref, computed, watch } from 'vue';
import FlowTreeNodePlay from './FlowTreeNodePlay.vue';

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
const isAnswered = computed(() => playerState.value?.answeredCurrent || props.timeLeft === 0 || props.game?.roundEnded);

// Placed cards mapping: { [nodeId]: cardObject }
const placedCards = ref({});
// Cards remaining in the bank
const cardBank = ref([]);
// Currently selected card for Tap-to-Place
const selectedCard = ref(null);
// Dragged card temporary holder
const draggedCard = ref(null);

// Zoom & Auto-Fit state
const zoomLevel = ref(1.0);
const isCompact = ref(true);
const useSideDock = ref(props.question.layout === 'branching'); // Side bank for family trees

// Auto-fit zoom calculation
function autoFitZoom() {
  const count = props.question.nodes?.length || 0;
  if (count >= 16) {
    zoomLevel.value = 0.65;
  } else if (count >= 10) {
    zoomLevel.value = 0.75;
  } else if (count >= 6) {
    zoomLevel.value = 0.88;
  } else {
    zoomLevel.value = 1.0;
  }
}

function zoomIn() {
  zoomLevel.value = Math.min(1.4, +(zoomLevel.value + 0.1).toFixed(2));
}

function zoomOut() {
  zoomLevel.value = Math.max(0.45, +(zoomLevel.value - 0.1).toFixed(2));
}

function resetZoom() {
  zoomLevel.value = 1.0;
}

// Unique key to detect actual question / round changes
const questionKey = computed(() => {
  const q = props.question;
  if (!q || q.type !== 'flowchart') return '';
  const nodeIds = (q.nodes || []).map(n => n.id).join(',');
  return `${props.game.currentQuestionIndex}|${q.questionText || ''}|${nodeIds}`;
});

function initPuzzle() {
  const q = props.question;
  if (!q || q.type !== 'flowchart' || !q.nodes) {
    placedCards.value = {};
    cardBank.value = [];
    selectedCard.value = null;
    return;
  }

  // Restore if player already submitted
  if (playerState.value?.answeredCurrent && playerState.value.selectedAnswer) {
    const saved = playerState.value.selectedAnswer;
    placedCards.value = saved.placedCards || {};
    cardBank.value = saved.cardBank || [];
    selectedCard.value = null;
    return;
  }

  // Initialize fresh card bank from displayCards or fallback
  const cards = q.displayCards ? JSON.parse(JSON.stringify(q.displayCards)) : [];
  cardBank.value = cards;
  placedCards.value = {};
  selectedCard.value = null;

  // Auto-fit zoom & compact mode based on tree size
  autoFitZoom();
  isCompact.value = (q.nodes?.length || 0) >= 5 || q.layout === 'branching';
  useSideDock.value = q.layout === 'branching';
}

watch(questionKey, initPuzzle, { immediate: true });

// Round restart on the same question
watch(() => playerState.value?.answeredCurrent, (now, before) => {
  if (before && !now) initPuzzle();
});

// Auto-submit when time runs out if not already answered
watch(() => props.timeLeft, (newVal) => {
  if (newVal === 0 && !playerState.value?.answeredCurrent) {
    submitAnswer();
  }
});

// ==================== INTERACTION LOGIC ====================

// 1. Select card from bank (Tap-to-Place step 1)
function selectBankCard(card) {
  if (isAnswered.value) return;
  if (selectedCard.value && selectedCard.value.id === card.id) {
    selectedCard.value = null; // deselect
  } else {
    selectedCard.value = card;
  }
}

// 2. Click on a blank node slot (Tap-to-Place step 2)
function handleSlotClick(node) {
  if (isAnswered.value || !node.isBlank) return;

  const currentPlaced = placedCards.value[node.id];

  // If we have a selected card from the bank
  if (selectedCard.value) {
    const cardToPlace = selectedCard.value;

    // If slot already had a card, return old card to bank
    if (currentPlaced) {
      cardBank.value.push(currentPlaced);
    }

    // Place new card
    placedCards.value[node.id] = cardToPlace;
    // Remove from bank
    cardBank.value = cardBank.value.filter(c => c.id !== cardToPlace.id);
    // Clear selection
    selectedCard.value = null;
  } else if (currentPlaced) {
    // If no card selected and slot is clicked, unplace it
    unplaceCard(node.id);
  }
}

// 3. Unplace a card from slot and return to bank
function unplaceCard(nodeId) {
  if (isAnswered.value) return;
  const card = placedCards.value[nodeId];
  if (!card) return;

  delete placedCards.value[nodeId];
  cardBank.value.push(card);
  if (selectedCard.value?.id === card.id) {
    selectedCard.value = null;
  }
}

// 4. Drag & Drop Support
function onDragStart(card, event) {
  if (isAnswered.value) return;
  draggedCard.value = card;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', card.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDropSlot(node, event) {
  if (isAnswered.value || !node.isBlank) return;
  if (event && event.preventDefault) event.preventDefault();

  const card = draggedCard.value || selectedCard.value;
  if (!card) return;

  const currentPlaced = placedCards.value[node.id];
  if (currentPlaced) {
    cardBank.value.push(currentPlaced);
  }

  placedCards.value[node.id] = card;
  cardBank.value = cardBank.value.filter(c => c.id !== card.id);

  draggedCard.value = null;
  selectedCard.value = null;
}

// ==================== SUBMISSION & EVALUATION ====================

function submitAnswer() {
  if (isAnswered.value) return;

  const nodes = props.question.nodes || [];
  const blankNodes = nodes.filter(n => n.isBlank);

  // Evaluate each blank node
  let correctCount = 0;
  const nodeResults = {};

  blankNodes.forEach(node => {
    const placed = placedCards.value[node.id];
    const isCorrect = placed && placed.nodeId === node.id;
    if (isCorrect) correctCount++;
    nodeResults[node.id] = {
      isCorrect: !!isCorrect,
      placedText: placed ? placed.text : null,
      correctText: node.text
    };
  });

  const totalBlanks = blankNodes.length;
  const isAllCorrect = totalBlanks > 0 && correctCount === totalBlanks;

  const scoringType = props.question.scoringType || 'partial';
  const maxPoints = props.question.points || 100;
  let pointsWon = 0;

  if (scoringType === 'all_or_nothing') {
    pointsWon = isAllCorrect ? maxPoints : 0;
  } else {
    // Partial scoring
    pointsWon = totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * maxPoints) : 0;
  }

  const payload = {
    placedCards: JSON.parse(JSON.stringify(placedCards.value)),
    cardBank: JSON.parse(JSON.stringify(cardBank.value)),
    correctCount,
    totalBlanks,
    isCorrect: isAllCorrect,
    pointsWon,
    nodeResults
  };

  emit('submit', props.playerKey, payload);
}

// Tree hierarchy helpers
const rootNode = computed(() => {
  const nodes = props.question.nodes || [];
  if (nodes.length === 0) return null;
  const explicitRoot = nodes.find(n => n.parentId === null);
  return explicitRoot || nodes[0];
});

function getChildren(parentNodeId) {
  const nodes = props.question.nodes || [];
  const rootId = rootNode.value?.id;

  return nodes.filter(n => {
    if (n.id === rootId) return false;
    if (n.parentId === parentNodeId) return true;
    if ((!n.parentId || n.parentId === undefined) && parentNodeId === rootId) {
      return true;
    }
    return false;
  });
}

// Helper to check individual node correctness after submit
function getNodeStatus(node) {
  if (!isAnswered.value || !node.isBlank) return null;
  const placed = placedCards.value[node.id];
  if (!placed) return 'empty';
  return placed.nodeId === node.id ? 'correct' : 'wrong';
}
</script>

<template>
  <div class="flowchart-play w-100 h-100 d-flex flex-column position-relative select-none">
    
    <!-- Top Bar: Instruction & Zoom Controls -->
    <div 
      class="alert py-1 px-3 small fw-bold shadow-sm d-flex justify-content-between align-items-center mb-2"
      style="background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.15); color: #E2E8F0;"
    >
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-hand-index-thumb text-warning fs-5"></i>
        <span class="d-none d-md-inline">Kartochkani bosib, bo'sh katakka joylashtiring</span>
        <span class="badge" :class="question.scoringType === 'all_or_nothing' ? 'bg-danger' : 'bg-warning text-dark'">
          {{ question.scoringType === 'all_or_nothing' ? '100% to\'liq' : 'Qisman ball' }}
        </span>
      </div>

      <!-- Floating Smartboard Zoom & Dock Toolbar -->
      <div class="d-flex align-items-center gap-1">
        <!-- Compact Toggle -->
        <button 
          @click="isCompact = !isCompact" 
          class="btn btn-xs py-1 px-2 rounded-pill border border-secondary"
          :class="isCompact ? 'btn-info text-dark fw-bold' : 'btn-dark text-white opacity-75'"
          style="font-size: 0.72rem;"
          title="Ixcham ko'rinishni yoqish/o'chirish"
        >
          <i class="bi bi-arrows-angle-contract me-1"></i>
          <span>Ixcham</span>
        </button>

        <!-- Side / Bottom Dock Toggle -->
        <button 
          v-if="question.layout === 'branching'"
          @click="useSideDock = !useSideDock" 
          class="btn btn-xs py-1 px-2 rounded-pill border border-secondary"
          :class="useSideDock ? 'btn-primary text-white' : 'btn-dark text-white opacity-75'"
          style="font-size: 0.72rem;"
          title="Variantlar bankini yon yoki pastga joylashtirish"
        >
          <i class="bi" :class="useSideDock ? 'bi-layout-sidebar-reverse' : 'bi-layout-split'"></i>
        </button>

        <!-- Zoom Controls -->
        <button @click="zoomOut" class="btn btn-xs btn-dark border border-secondary text-white py-1 px-2 rounded-circle" title="Kichraytirish">
          <i class="bi bi-dash"></i>
        </button>
        <span class="badge bg-dark border border-secondary text-info font-monospace py-1 px-2" style="font-size: 0.75rem;">
          {{ Math.round(zoomLevel * 100) }}%
        </span>
        <button @click="zoomIn" class="btn btn-xs btn-dark border border-secondary text-white py-1 px-2 rounded-circle" title="Kattalashtirish">
          <i class="bi bi-plus"></i>
        </button>
        <button @click="autoFitZoom" class="btn btn-xs btn-outline-info py-1 px-2 rounded-pill" style="font-size: 0.72rem;" title="Ekranga sig'dirish">
          <i class="bi bi-aspect-ratio"></i> Sig'dirish
        </button>
      </div>
    </div>

    <!-- MAIN BODY: EITHER SIDE-DOCK (FOR BRANCHING/FAMILY TREE) OR COLUMN (FOR LINEAR/CYCLE) -->
    <div 
      class="play-main-body flex-grow-1 d-flex gap-2 position-relative overflow-hidden"
      :class="useSideDock ? 'flex-row' : 'flex-column'"
    >
      
      <!-- DIAGRAM CANVAS CONTAINER -->
      <div 
        class="diagram-container flex-grow-1 p-2 rounded-4 d-flex justify-content-center align-items-start overflow-auto position-relative"
        style="min-height: 250px;"
      >
        <!-- SCALED VIEWPORT WRAPPER -->
        <div 
          class="diagram-viewport w-100 d-flex justify-content-center transition-all"
          :style="{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top center',
            paddingBottom: '40px'
          }"
        >
          
          <!-- 1. Linear Layout -->
          <div v-if="question.layout === 'linear'" class="layout-linear d-flex align-items-center justify-content-center flex-wrap gap-2 py-2 w-100">
            <template v-for="(node, idx) in question.nodes" :key="node.id">
              <div 
                class="flow-node position-relative shadow-md transition-all"
                :class="{
                  'rounded-3 p-2 compact-card': isCompact,
                  'rounded-4 p-3': !isCompact,
                  'static-node': !node.isBlank,
                  'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
                  'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
                  'node-correct': isAnswered && getNodeStatus(node) === 'correct',
                  'node-wrong': isAnswered && (getNodeStatus(node) === 'wrong' || getNodeStatus(node) === 'empty'),
                  'active-target': selectedCard && node.isBlank && !isAnswered
                }"
                :style="{ minWidth: isCompact ? '130px' : '160px', maxWidth: isCompact ? '170px' : '200px' }"
                @click="handleSlotClick(node)"
                @dragover.prevent
                @drop="onDropSlot(node, $event)"
              >
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <span class="badge rounded-pill px-2 py-0 font-monospace" :class="node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white'" style="font-size: 0.65rem;">
                    {{ node.label || `${idx + 1}-bosqich` }}
                  </span>
                  <span v-if="isAnswered && node.isBlank">
                    <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success fs-6"></i>
                    <i v-else class="bi bi-x-circle-fill text-danger fs-6"></i>
                  </span>
                </div>

                <div class="node-content text-center py-1">
                  <div v-if="!node.isBlank" class="fw-bold text-white small">{{ node.text }}</div>
                  <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
                    <div class="fw-bold text-white small text-truncate">{{ placedCards[node.id].text }}</div>
                    <button v-if="!isAnswered" @click.stop="unplaceCard(node.id)" class="btn-unplace btn btn-sm btn-outline-danger p-0 rounded-circle">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                  <div v-else class="empty-placeholder d-flex align-items-center justify-content-center gap-1 text-muted py-1">
                    <i class="bi bi-plus-circle text-warning fs-6"></i>
                    <span class="small fw-semibold text-warning">Bo'sh katak</span>
                  </div>
                  <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
                    <small class="text-success fw-bold d-block" style="font-size: 0.7rem;">Asl: {{ node.text }}</small>
                  </div>
                </div>
              </div>

              <div v-if="idx < question.nodes.length - 1" class="arrow-indicator text-secondary d-flex align-items-center px-1">
                <i class="bi bi-arrow-right fs-4 text-info"></i>
              </div>
            </template>
          </div>

          <!-- 2. Branching / Family Tree Layout (Recursive Unlimited Depth & Compact) -->
          <div v-else-if="question.layout === 'branching'" class="layout-branching d-flex flex-column align-items-center w-100 py-2">
            <FlowTreeNodePlay 
              v-if="rootNode"
              :node="rootNode"
              :all-nodes="question.nodes"
              :is-root="true"
              :is-answered="isAnswered"
              :placed-cards="placedCards"
              :selected-card="selectedCard"
              :compact="isCompact"
              @slot-click="handleSlotClick($event)"
              @unplace="unplaceCard($event)"
              @drop-slot="onDropSlot($event.node, $event.event)"
            />
          </div>

          <!-- 3. Cycle Layout -->
          <div v-else-if="question.layout === 'cycle'" class="layout-cycle d-flex align-items-center justify-content-center flex-wrap gap-2 py-2 w-100">
            <template v-for="(node, idx) in question.nodes" :key="node.id">
              <div 
                class="flow-node position-relative shadow-md transition-all"
                :class="{
                  'rounded-3 p-2 compact-card': isCompact,
                  'rounded-4 p-3': !isCompact,
                  'static-node': !node.isBlank,
                  'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
                  'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
                  'node-correct': isAnswered && getNodeStatus(node) === 'correct',
                  'node-wrong': isAnswered && (getNodeStatus(node) === 'wrong' || getNodeStatus(node) === 'empty'),
                  'active-target': selectedCard && node.isBlank && !isAnswered
                }"
                :style="{ minWidth: isCompact ? '130px' : '160px', maxWidth: isCompact ? '170px' : '200px' }"
                @click="handleSlotClick(node)"
                @dragover.prevent
                @drop="onDropSlot(node, $event)"
              >
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <span class="badge rounded-pill px-2 py-0 font-monospace" :class="node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white'" style="font-size: 0.65rem;">
                    {{ node.label || `${idx + 1}-bosqich` }}
                  </span>
                  <span v-if="isAnswered && node.isBlank">
                    <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success fs-6"></i>
                    <i v-else class="bi bi-x-circle-fill text-danger fs-6"></i>
                  </span>
                </div>

                <div class="node-content text-center py-1">
                  <div v-if="!node.isBlank" class="fw-bold text-white small">{{ node.text }}</div>
                  <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
                    <div class="fw-bold text-white small text-truncate">{{ placedCards[node.id].text }}</div>
                    <button v-if="!isAnswered" @click.stop="unplaceCard(node.id)" class="btn-unplace btn btn-sm btn-outline-danger p-0 rounded-circle">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                  <div v-else class="empty-placeholder d-flex align-items-center justify-content-center gap-1 text-muted py-1">
                    <i class="bi bi-plus-circle text-warning fs-6"></i>
                    <span class="small fw-semibold text-warning">Bo'sh katak</span>
                  </div>
                  <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
                    <small class="text-success fw-bold d-block" style="font-size: 0.7rem;">Asl: {{ node.text }}</small>
                  </div>
                </div>
              </div>

              <div v-if="idx < question.nodes.length - 1" class="arrow-indicator text-secondary d-flex align-items-center px-1">
                <i class="bi bi-arrow-right fs-4 text-info"></i>
              </div>
              <div v-else class="arrow-indicator text-warning d-flex align-items-center px-1" title="Aylanma davr">
                <i class="bi bi-arrow-repeat fs-3 text-warning"></i>
              </div>
            </template>
          </div>

          <!-- 4. Hierarchy Layout -->
          <div v-else class="layout-hierarchy d-flex flex-column align-items-center w-100 py-2 gap-2">
            <template v-for="(node, idx) in question.nodes" :key="node.id">
              <div 
                class="flow-node position-relative shadow-md transition-all"
                :class="{
                  'rounded-3 p-2 compact-card': isCompact,
                  'rounded-4 p-3': !isCompact,
                  'static-node': !node.isBlank,
                  'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
                  'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
                  'node-correct': isAnswered && getNodeStatus(node) === 'correct',
                  'node-wrong': isAnswered && (getNodeStatus(node) === 'wrong' || getNodeStatus(node) === 'empty'),
                  'active-target': selectedCard && node.isBlank && !isAnswered
                }"
                :style="{ width: `${170 + idx * 30}px` }"
                @click="handleSlotClick(node)"
                @dragover.prevent
                @drop="onDropSlot(node, $event)"
              >
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <span class="badge rounded-pill px-2 py-0 font-monospace" :class="node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white'" style="font-size: 0.65rem;">
                    {{ node.label || `${idx + 1}-daraja` }}
                  </span>
                  <span v-if="isAnswered && node.isBlank">
                    <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success fs-6"></i>
                    <i v-else class="bi bi-x-circle-fill text-danger fs-6"></i>
                  </span>
                </div>

                <div class="node-content text-center py-1">
                  <div v-if="!node.isBlank" class="fw-bold text-white small">{{ node.text }}</div>
                  <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
                    <div class="fw-bold text-white small text-truncate">{{ placedCards[node.id].text }}</div>
                    <button v-if="!isAnswered" @click.stop="unplaceCard(node.id)" class="btn-unplace btn btn-sm btn-outline-danger p-0 rounded-circle">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                  <div v-else class="empty-placeholder d-flex align-items-center justify-content-center gap-1 text-muted py-1">
                    <i class="bi bi-plus-circle text-warning fs-6"></i>
                    <span class="small fw-semibold text-warning">Bo'sh katak</span>
                  </div>
                  <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
                    <small class="text-success fw-bold d-block" style="font-size: 0.7rem;">Asl: {{ node.text }}</small>
                  </div>
                </div>
              </div>

              <i v-if="idx < question.nodes.length - 1" class="bi bi-arrow-down fs-4 text-info my-1"></i>
            </template>
          </div>

        </div>
      </div>

      <!-- CARD BANK CONTAINER (SIDE DOCK OR BOTTOM) -->
      <div 
        class="card-bank-container p-2 rounded-4 shadow-lg border border-secondary border-opacity-25 d-flex flex-column"
        :class="{
          'side-dock-bank': useSideDock,
          'w-100 mt-2': !useSideDock
        }"
        style="background: rgba(15, 23, 42, 0.95);"
      >
        <div class="d-flex align-items-center justify-content-between mb-2 px-1">
          <span class="small fw-bold text-secondary text-uppercase tracking-wider">
            <i class="bi bi-collection-fill text-info me-1"></i> Variantlar:
          </span>
          <span class="badge bg-dark border border-secondary text-info font-monospace" v-if="!isAnswered">
            {{ cardBank.length }} ta
          </span>
        </div>

        <!-- Cards List (vertical in side-dock, horizontal flex in bottom-dock) -->
        <div 
          class="bank-cards-scroll flex-grow-1 overflow-auto d-flex gap-2"
          :class="useSideDock ? 'flex-column' : 'flex-wrap justify-content-center'"
          :style="{ maxHeight: useSideDock ? 'calc(100vh - 360px)' : '100px' }"
        >
          <div 
            v-if="cardBank.length === 0 && !isAnswered" 
            class="text-success small fw-bold d-flex align-items-center justify-content-center py-2 text-center"
          >
            <i class="bi bi-check-all fs-4 me-1"></i> Barchasi joylandi!
          </div>

          <div 
            v-for="card in cardBank" 
            :key="card.id"
            class="bank-card p-2 px-3 rounded-3 d-flex align-items-center gap-2 shadow-sm transition-all text-truncate"
            :class="{
              'card-selected': selectedCard && selectedCard.id === card.id,
              'card-disabled': isAnswered,
              'w-100': useSideDock
            }"
            :draggable="!isAnswered"
            @dragstart="onDragStart(card, $event)"
            @click="selectBankCard(card)"
          >
            <i class="bi bi-grip-vertical text-secondary cursor-grab" v-if="!isAnswered"></i>
            <span class="fw-bold small text-white text-truncate">{{ card.text }}</span>
          </div>
        </div>

        <!-- SUBMIT BUTTON (INSIDE SIDE DOCK OR BOTTOM) -->
        <div class="mt-2 text-center pt-1 border-top border-secondary border-opacity-25">
          <button 
            @click="submitAnswer" 
            class="btn btn-warning rounded-pill fw-bold shadow-lg w-100"
            :class="useSideDock ? 'btn-md py-2' : 'btn-lg px-5 py-2'"
            :disabled="isAnswered"
          >
            <span>Tasdiqlash</span>
            <i class="bi bi-send-fill ms-2"></i>
          </button>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.flowchart-play {
  user-select: none;
}

.diagram-container {
  background: radial-gradient(circle at center, #1E293B 0%, #0B1120 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Side dock card bank */
.side-dock-bank {
  width: 250px;
  max-width: 32%;
  min-width: 200px;
}

.flow-node {
  min-height: 85px;
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.compact-card {
  min-height: 46px !important;
}

.static-node {
  background-color: rgba(30, 41, 59, 0.85);
  border: 2px solid rgba(59, 130, 246, 0.5);
  cursor: default;
}

.blank-empty {
  background-color: rgba(15, 23, 42, 0.6);
  border: 2px dashed #F59E0B;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
}

.blank-filled {
  background-color: #1E293B;
  border: 2px solid #F59E0B;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
}

.active-target {
  animation: pulse-border 1.4s infinite;
}

@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

.node-correct {
  background-color: rgba(16, 185, 129, 0.2) !important;
  border: 2px solid #10B981 !important;
}

.node-wrong {
  background-color: rgba(239, 68, 68, 0.2) !important;
  border: 2px solid #EF4444 !important;
}

.btn-unplace {
  position: absolute;
  top: -20px;
  right: -6px;
  width: 20px;
  height: 20px;
  font-size: 0.85rem;
  line-height: 1;
  background-color: #1E293B;
}

.bank-card {
  background-color: #243046;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: grab;
}

.bank-card:hover {
  background-color: #2F3E58;
  transform: translateY(-2px);
}

.card-selected {
  background-color: #F59E0B !important;
  color: #000 !important;
  border-color: #F59E0B !important;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.8) !important;
  transform: scale(1.02);
}
.card-selected span {
  color: #000 !important;
}

.card-disabled {
  opacity: 0.6;
  cursor: default !important;
}
</style>
