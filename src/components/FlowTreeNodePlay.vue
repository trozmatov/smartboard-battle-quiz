<script setup>
import { computed } from 'vue';
import { getGenerationStyle } from '../utils/flowchartTheme.js';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  allNodes: {
    type: Array,
    required: true
  },
  isRoot: {
    type: Boolean,
    default: false
  },
  isAnswered: {
    type: Boolean,
    required: true
  },
  placedCards: {
    type: Object,
    required: true
  },
  selectedCard: {
    type: Object,
    default: null
  },
  compact: {
    type: Boolean,
    default: false
  },
  depth: {
    type: Number,
    default: 0
  },
  childrenMap: {
    type: Object,
    default: () => ({})
  },
  smartFill: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['slot-click', 'unplace', 'drop-slot']);

// Generation Styles for this node and its children
const genStyle = computed(() => getGenerationStyle(props.depth));
const nextGenStyle = computed(() => getGenerationStyle(props.depth + 1));

// Fast O(1) children lookup via childrenMap, fallback to filter
const children = computed(() => {
  if (props.childrenMap && props.childrenMap[props.node.id]) {
    return props.childrenMap[props.node.id];
  }
  if (!props.allNodes) return [];
  return props.allNodes.filter(n => {
    if (n.id === props.node.id) return false;
    if (n.parentId === props.node.id) return true;
    if (props.isRoot && (!n.parentId || n.parentId === undefined)) {
      return true;
    }
    return false;
  });
});

// Smart Fill visibility logic:
// Show descendants if:
// 1) Node has children
// 2) AND either smartFill is off, quiz is evaluated, node is static (like Abulxayrxon), or node has been filled with a card!
const shouldShowChildren = computed(() => {
  if (children.value.length === 0) return false;
  if (!props.smartFill || props.isAnswered) return true;
  if (!props.node.isBlank) return true;
  return !!props.placedCards[props.node.id];
});

function getNodeStatus(node) {
  if (!props.isAnswered || !node.isBlank) return null;
  const placed = props.placedCards[node.id];
  if (!placed) return 'empty';
  return placed.nodeId === node.id ? 'correct' : 'wrong';
}

// Compute dynamic border and background for the node card (high-performance hex colors)
const dynamicCardStyle = computed(() => {
  const isFilled = props.node.isBlank && props.placedCards[props.node.id];
  const isTarget = props.selectedCard && props.node.isBlank && !props.isAnswered;

  // Answer Evaluation States
  if (props.isAnswered && props.node.isBlank) {
    const status = getNodeStatus(props.node);
    if (status === 'correct') {
      return {
        background: '#064E3B',
        borderColor: '#10B981',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
      };
    } else {
      return {
        background: '#7F1D1D',
        borderColor: '#EF4444',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
      };
    }
  }

  // Active Target state when card is selected
  if (isTarget) {
    return {
      background: '#1E293B',
      borderColor: '#FACC15',
      boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
    };
  }

  // Blank Empty state
  if (props.node.isBlank && !isFilled) {
    return {
      background: '#0F172A',
      borderColor: genStyle.value.border,
      boxShadow: 'none'
    };
  }

  // Static or Filled state - themed by Generation with solid rich palette
  return {
    background: genStyle.value.bg,
    borderColor: genStyle.value.border,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)'
  };
});
</script>

<template>
  <div class="tree-play-wrapper d-flex flex-column align-items-center position-relative">
    
    <!-- NODE CARD -->
    <div 
      class="flow-node position-relative transition-all"
      :class="{
        'rounded-3 p-2 compact-card': compact,
        'rounded-4 p-3': !compact,
        'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
        'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
        'active-target': selectedCard && node.isBlank && !isAnswered
      }"
      :style="{ 
        ...dynamicCardStyle,
        minWidth: compact ? (isRoot ? '160px' : '135px') : (isRoot ? '210px' : '160px'), 
        maxWidth: compact ? (isRoot ? '210px' : '175px') : (isRoot ? '260px' : '210px') 
      }"
      @click="emit('slot-click', node)"
      @dragover.prevent
      @drop="emit('drop-slot', { node, event: $event })"
    >
      <!-- Royal Gold Top Sheen -->
      <div class="royal-gold-sheen"></div>

      <!-- CARD HEADER: Generation Badge & Verification Icon -->
      <div class="d-flex align-items-center justify-content-between mb-1" :class="{ 'mb-0': compact }">
        <span 
          class="badge rounded-pill font-monospace d-flex align-items-center gap-1 shadow-sm" 
          :style="{
            background: genStyle.badgeBg,
            border: `1px solid ${genStyle.badgeBorder}`,
            color: genStyle.badgeText,
            fontSize: compact ? '0.62rem' : '0.72rem',
            padding: compact ? '1px 6px' : '2px 8px'
          }"
        >
          <i :class="genStyle.icon" style="font-size: 0.85em;"></i>
          <span>{{ node.label || genStyle.roman }}</span>
        </span>

        <span v-if="isAnswered && node.isBlank">
          <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success" :class="compact ? 'fs-6' : 'fs-5'"></i>
          <i v-else class="bi bi-x-circle-fill text-danger" :class="compact ? 'fs-6' : 'fs-5'"></i>
        </span>
      </div>

      <!-- CARD BODY -->
      <div class="node-content text-center" :class="compact ? 'py-0' : 'py-1'">
        <!-- Static Node Text -->
        <div v-if="!node.isBlank" class="fw-bold text-white small text-truncate" :style="{ fontSize: compact ? '0.82rem' : '0.92rem' }">
          {{ node.text }}
        </div>

        <!-- Placed Card Content -->
        <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
          <div class="fw-bold text-white small text-truncate" :style="{ fontSize: compact ? '0.82rem' : '0.92rem' }">
            {{ placedCards[node.id].text }}
          </div>
          <button 
            v-if="!isAnswered" 
            @click.stop="emit('unplace', node.id)" 
            class="btn-unplace btn btn-sm btn-outline-danger p-0 rounded-circle"
            :style="compact ? 'top: -18px; right: -6px; width: 18px; height: 18px; font-size: 0.75rem;' : ''"
            title="Qaytarish"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>

        <!-- Blank Slot Empty Placeholder -->
        <div v-else class="empty-placeholder d-flex align-items-center justify-content-center text-muted" :class="compact ? 'py-1 gap-1' : 'flex-column py-2'">
          <i class="bi bi-plus-circle" :style="{ color: genStyle.accent }" :class="compact ? 'fs-6' : 'fs-5 mb-1'"></i>
          <span class="fw-semibold" :style="{ color: genStyle.accent, fontSize: compact ? '0.7rem' : '0.8rem' }">Bo'sh katak</span>
          <!-- Smart Fill Hint: shows how many child descendants this branch holds before unlocking -->
          <span 
            v-if="smartFill && !shouldShowChildren && children.length > 0 && !isAnswered" 
            class="badge rounded-pill mt-1 border border-warning border-opacity-50 text-warning font-monospace"
            :style="{ fontSize: compact ? '0.58rem' : '0.65rem', background: 'rgba(245, 158, 11, 0.15)' }"
            title="Ushbu shaxs joylangach quyi avlodlari ochiladi"
          >
            <i class="bi bi-diagram-3-fill me-1"></i>{{ children.length }} ta avlod
          </span>
        </div>

        <!-- Correct Answer Revealed After Evaluation -->
        <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
          <small class="text-success fw-bold d-block text-truncate" :style="{ fontSize: compact ? '0.65rem' : '0.75rem' }">
            <i class="bi bi-check2 me-1"></i> Asl: {{ node.text }}
          </small>
        </div>
      </div>
    </div>

    <!-- STEM DOWN (From parent card down to children connector bar) -->
    <div 
      v-if="shouldShowChildren" 
      class="tree-stem-down" 
      :class="{ 'compact-stem': compact }"
      :style="{
        background: `linear-gradient(to bottom, ${genStyle.stemColor}, ${nextGenStyle.stemColor})`
      }"
    ></div>

    <!-- RECURSIVE CHILDREN ROW (Siblings in Next Generation: NEVER WRAP!) -->
    <div 
      v-if="shouldShowChildren" 
      class="tree-children-row d-flex justify-content-center flex-nowrap position-relative branch-reveal-anim"
      :class="{ 
        'multiple-children': children.length > 1,
        'compact-children-row': compact
      }"
      :style="{
        '--branch-color': nextGenStyle.stemColor,
        '--branch-glow': nextGenStyle.glow
      }"
    >
      <div 
        v-for="child in children" 
        :key="child.id" 
        class="tree-child-col d-flex flex-column align-items-center position-relative"
        :class="{ 'compact-child-col': compact }"
        :style="{
          '--child-stem-color': nextGenStyle.stemColor,
          '--child-stem-glow': nextGenStyle.glow
        }"
      >
        <FlowTreeNodePlay 
          :node="child"
          :all-nodes="allNodes"
          :children-map="childrenMap"
          :smart-fill="smartFill"
          :is-root="false"
          :is-answered="isAnswered"
          :placed-cards="placedCards"
          :selected-card="selectedCard"
          :compact="compact"
          :depth="depth + 1"
          @slot-click="emit('slot-click', $event)"
          @unplace="emit('unplace', $event)"
          @drop-slot="emit('drop-slot', $event)"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.flow-node {
  min-height: 85px;
  cursor: pointer;
  border-width: 2px;
  border-style: solid;
  touch-action: manipulation;
  contain: layout style;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.compact-card {
  min-height: 48px !important;
}

/* Royal gold sheen on the top rim */
.royal-gold-sheen {
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #FACC15, transparent);
  border-radius: 2px;
  pointer-events: none;
  opacity: 0.8;
}

.blank-empty {
  border-style: dashed !important;
}

/* Fast, GPU-composited target pulse (no repaints!) */
.active-target {
  border-color: #FACC15 !important;
  animation: pulse-card 1.2s ease-in-out infinite;
}

@keyframes pulse-card {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.92;
  }
}

.btn-unplace {
  position: absolute;
  top: -24px;
  right: -8px;
  width: 22px;
  height: 22px;
  font-size: 0.9rem;
  line-height: 1;
  background-color: #1E293B;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.tree-stem-down {
  width: 3px;
  height: 14px;
  border-radius: 2px;
}

.compact-stem {
  height: 10px !important;
}

/* Children Row: strictly nowrap to prevent sibling vertical stacking! */
.tree-children-row {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  justify-content: center;
  align-items: flex-start;
  padding-top: 14px;
}

.compact-children-row {
  padding-top: 10px !important;
}

/* Smooth Progressive Reveal Animation */
.branch-reveal-anim {
  animation: branchFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top center;
}

@keyframes branchFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Each sibling column */
.tree-child-col {
  padding: 0 8px;
  flex: 0 0 auto;
}

.compact-child-col {
  padding: 0 5px !important;
}

/* ==================== CLEAN HIGH-PERFORMANCE TREE CONNECTORS ==================== */
/* Left and right horizontal arms meeting at column center */
.tree-child-col::before,
.tree-child-col::after {
  content: '';
  position: absolute;
  top: 0;
  height: 14px;
  box-sizing: border-box;
}

/* Left horizontal arm (from left border of column to 50% center) */
.tree-child-col::before {
  right: 50%;
  left: 0;
  border-top: 3px solid var(--child-stem-color, #EAB308);
}

/* Right horizontal arm (from 50% center to right border) + vertical stem dropping down at 50% */
.tree-child-col::after {
  left: 50%;
  right: 0;
  border-top: 3px solid var(--child-stem-color, #EAB308);
  border-left: 3px solid var(--child-stem-color, #EAB308);
}

/* First child has no left arm */
.tree-child-col:first-child::before {
  display: none !important;
}

/* Last child has no right arm */
.tree-child-col:last-child::after {
  border-top: none !important;
}

/* Only child has no horizontal bar at all: only a straight vertical line */
.tree-child-col:only-child::before {
  display: none !important;
}
.tree-child-col:only-child::after {
  border-top: none !important;
  right: auto !important;
  width: 3px !important;
}

/* Compact mode heights */
.compact-child-col::before,
.compact-child-col::after {
  height: 10px !important;
}
</style>
