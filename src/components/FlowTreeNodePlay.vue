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
  }
});

const emit = defineEmits(['slot-click', 'unplace', 'drop-slot']);

// Generation Styles for this node and its children
const genStyle = computed(() => getGenerationStyle(props.depth));
const nextGenStyle = computed(() => getGenerationStyle(props.depth + 1));

// Direct children
const children = computed(() => {
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

function getNodeStatus(node) {
  if (!props.isAnswered || !node.isBlank) return null;
  const placed = props.placedCards[node.id];
  if (!placed) return 'empty';
  return placed.nodeId === node.id ? 'correct' : 'wrong';
}

// Compute dynamic border and shadow for the node card
const dynamicCardStyle = computed(() => {
  const isFilled = props.node.isBlank && props.placedCards[props.node.id];
  const isTarget = props.selectedCard && props.node.isBlank && !props.isAnswered;

  // Answer Evaluation States
  if (props.isAnswered && props.node.isBlank) {
    const status = getNodeStatus(props.node);
    if (status === 'correct') {
      return {
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        borderColor: '#10B981',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.65)'
      };
    } else {
      return {
        background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        borderColor: '#EF4444',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.65)'
      };
    }
  }

  // Active Target state when card is selected
  if (isTarget) {
    return {
      background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
      borderColor: '#F59E0B',
      boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)'
    };
  }

  // Blank Empty state
  if (props.node.isBlank && !isFilled) {
    return {
      background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
      borderColor: '#F59E0B',
      boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)'
    };
  }

  // Static or Filled state - themed by Generation with Royal Gold rim
  return {
    background: genStyle.value.bg,
    borderColor: genStyle.value.border,
    boxShadow: `0 0 15px ${genStyle.value.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
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
        minWidth: compact ? (isRoot ? '165px' : '135px') : (isRoot ? '210px' : '160px'), 
        maxWidth: compact ? (isRoot ? '220px' : '185px') : (isRoot ? '270px' : '220px') 
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
        <div v-if="!node.isBlank" class="fw-bold text-white small" :style="{ fontSize: compact ? '0.82rem' : '0.92rem' }">
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
          <i class="bi bi-plus-circle text-warning" :class="compact ? 'fs-6' : 'fs-4 mb-1'"></i>
          <span class="fw-semibold text-warning" :style="{ fontSize: compact ? '0.7rem' : '0.8rem' }">Bo'sh katak</span>
        </div>

        <!-- Correct Answer Revealed After Evaluation -->
        <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
          <small class="text-success fw-bold d-block text-truncate" :style="{ fontSize: compact ? '0.65rem' : '0.75rem' }">
            <i class="bi bi-check2 me-1"></i> Asl: {{ node.text }}
          </small>
        </div>
      </div>
    </div>

    <!-- STEM DOWN (Glowing gradient into next generation) -->
    <div 
      v-if="children.length > 0" 
      class="tree-stem-down" 
      :class="{ 'compact-stem': compact }"
      :style="{
        background: `linear-gradient(to bottom, ${genStyle.stemColor}, ${nextGenStyle.stemColor})`,
        boxShadow: `0 0 8px ${genStyle.glow}`
      }"
    ></div>

    <!-- RECURSIVE CHILDREN ROW (Siblings in Next Generation) -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center flex-wrap position-relative w-100"
      :class="{ 
        'multiple-children': children.length > 1,
        'gap-2 compact-children-row': compact,
        'gap-3': !compact
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
  backdrop-filter: blur(12px);
  cursor: pointer;
  border-width: 2px;
  border-style: solid;
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
  height: 20px;
  border-radius: 2px;
}

.compact-stem {
  height: 12px !important;
}

.tree-children-row {
  padding-top: 14px;
}

.compact-children-row {
  padding-top: 8px !important;
}

.tree-children-row.multiple-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 3px;
  border-radius: 2px;
  background: var(--branch-color, #EAB308);
  box-shadow: 0 0 8px var(--branch-glow, rgba(234, 179, 8, 0.4));
}

.tree-child-col::before {
  content: '';
  position: absolute;
  top: 0;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--child-stem-color, #EAB308);
  box-shadow: 0 0 8px var(--child-stem-glow, rgba(234, 179, 8, 0.4));
}

.compact-child-col::before {
  height: 8px !important;
}
</style>
