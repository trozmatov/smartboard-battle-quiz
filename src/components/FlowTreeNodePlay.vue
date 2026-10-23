<script setup>
import { computed } from 'vue';

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
  }
});

const emit = defineEmits(['slot-click', 'unplace', 'drop-slot']);

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
</script>

<template>
  <div class="tree-play-wrapper d-flex flex-column align-items-center position-relative">
    
    <!-- NODE CARD -->
    <div 
      class="flow-node position-relative shadow-md transition-all"
      :class="{
        'rounded-3 p-2 compact-card': compact,
        'rounded-4 p-3': !compact,
        'static-node': !node.isBlank,
        'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
        'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
        'node-correct': isAnswered && getNodeStatus(node) === 'correct',
        'node-wrong': isAnswered && (getNodeStatus(node) === 'wrong' || getNodeStatus(node) === 'empty'),
        'active-target': selectedCard && node.isBlank && !isAnswered
      }"
      :style="{ 
        minWidth: compact ? (isRoot ? '160px' : '130px') : (isRoot ? '200px' : '150px'), 
        maxWidth: compact ? (isRoot ? '210px' : '175px') : (isRoot ? '260px' : '210px') 
      }"
      @click="emit('slot-click', node)"
      @dragover.prevent
      @drop="emit('drop-slot', { node, event: $event })"
    >
      <div class="d-flex align-items-center justify-content-between mb-1" :class="{ 'mb-0': compact }">
        <span 
          class="badge rounded-pill font-monospace" 
          :class="[
            node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white',
            compact ? 'px-1 py-0' : 'px-2 py-1'
          ]"
          :style="{ fontSize: compact ? '0.62rem' : '0.7rem' }"
        >
          {{ node.label || (isRoot ? 'Asosiy Boshlanish' : 'Avlod') }}
        </span>

        <span v-if="isAnswered && node.isBlank">
          <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success" :class="compact ? 'fs-6' : 'fs-5'"></i>
          <i v-else class="bi bi-x-circle-fill text-danger" :class="compact ? 'fs-6' : 'fs-5'"></i>
        </span>
      </div>

      <div class="node-content text-center" :class="compact ? 'py-0' : 'py-1'">
        <div v-if="!node.isBlank" class="fw-bold text-white small" :style="{ fontSize: compact ? '0.8rem' : '0.88rem' }">
          {{ node.text }}
        </div>

        <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
          <div class="fw-bold text-white small text-truncate" :style="{ fontSize: compact ? '0.8rem' : '0.88rem' }">
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

        <div v-else class="empty-placeholder d-flex align-items-center justify-content-center text-muted" :class="compact ? 'py-1 gap-1' : 'flex-column py-2'">
          <i class="bi bi-plus-circle text-warning" :class="compact ? 'fs-6' : 'fs-4 mb-1'"></i>
          <span class="fw-semibold text-warning" :style="{ fontSize: compact ? '0.7rem' : '0.8rem' }">Bo'sh katak</span>
        </div>

        <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-1 pt-1 border-top border-danger border-opacity-50">
          <small class="text-success fw-bold d-block" :style="{ fontSize: compact ? '0.65rem' : '0.75rem' }">
            <i class="bi bi-check2 me-1"></i> Asl: {{ node.text }}
          </small>
        </div>
      </div>
    </div>

    <!-- STEM DOWN -->
    <div v-if="children.length > 0" class="tree-stem-down" :class="{ 'compact-stem': compact }"></div>

    <!-- RECURSIVE CHILDREN ROW -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center flex-wrap position-relative w-100"
      :class="{ 
        'multiple-children': children.length > 1,
        'gap-2 compact-children-row': compact,
        'gap-3': !compact
      }"
    >
      <div 
        v-for="child in children" 
        :key="child.id" 
        class="tree-child-col d-flex flex-column align-items-center position-relative"
        :class="{ 'compact-child-col': compact }"
      >
        <FlowTreeNodePlay 
          :node="child"
          :all-nodes="allNodes"
          :is-root="false"
          :is-answered="isAnswered"
          :placed-cards="placedCards"
          :selected-card="selectedCard"
          :compact="compact"
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
  top: -24px;
  right: -8px;
  width: 22px;
  height: 22px;
  font-size: 0.9rem;
  line-height: 1;
  background-color: #1E293B;
}

.tree-stem-down {
  width: 2px;
  height: 20px;
  background-color: #38BDF8;
  opacity: 0.6;
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
  height: 2px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.tree-child-col::before {
  content: '';
  position: absolute;
  top: 0;
  width: 2px;
  height: 14px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.compact-child-col::before {
  height: 8px !important;
}
</style>
