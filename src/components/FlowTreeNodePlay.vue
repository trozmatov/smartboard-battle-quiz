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
      class="flow-node position-relative rounded-4 p-3 shadow-md transition-all"
      :class="{
        'static-node': !node.isBlank,
        'blank-empty': node.isBlank && !placedCards[node.id] && !isAnswered,
        'blank-filled': node.isBlank && placedCards[node.id] && !isAnswered,
        'node-correct': isAnswered && getNodeStatus(node) === 'correct',
        'node-wrong': isAnswered && (getNodeStatus(node) === 'wrong' || getNodeStatus(node) === 'empty'),
        'active-target': selectedCard && node.isBlank && !isAnswered
      }"
      :style="{ minWidth: isRoot ? '200px' : '150px', maxWidth: isRoot ? '260px' : '210px' }"
      @click="emit('slot-click', node)"
      @dragover.prevent
      @drop="emit('drop-slot', { node, event: $event })"
    >
      <div class="d-flex align-items-center justify-content-between mb-1">
        <span 
          class="badge rounded-pill px-2 py-1 font-monospace" 
          :class="node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white'" 
          style="font-size: 0.7rem;"
        >
          {{ node.label || (isRoot ? 'Asosiy Boshlanish' : 'Avlod') }}
        </span>

        <span v-if="isAnswered && node.isBlank">
          <i v-if="getNodeStatus(node) === 'correct'" class="bi bi-check-circle-fill text-success fs-5"></i>
          <i v-else class="bi bi-x-circle-fill text-danger fs-5"></i>
        </span>
      </div>

      <div class="node-content text-center py-1">
        <div v-if="!node.isBlank" class="fw-bold text-white small">
          {{ node.text }}
        </div>

        <div v-else-if="placedCards[node.id]" class="placed-card-content position-relative">
          <div class="fw-bold text-white small">
            {{ placedCards[node.id].text }}
          </div>
          <button 
            v-if="!isAnswered" 
            @click.stop="emit('unplace', node.id)" 
            class="btn-unplace btn btn-sm btn-outline-danger p-0 rounded-circle"
            title="Qaytarish"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>

        <div v-else class="empty-placeholder d-flex flex-column align-items-center justify-content-center text-muted py-2">
          <i class="bi bi-plus-circle text-warning fs-4 mb-1"></i>
          <span class="small fw-semibold text-warning">Bo'sh katak</span>
        </div>

        <div v-if="isAnswered && node.isBlank && getNodeStatus(node) !== 'correct'" class="mt-2 pt-2 border-top border-danger border-opacity-50">
          <small class="text-success fw-bold d-block" style="font-size: 0.75rem;">
            <i class="bi bi-check2 me-1"></i> Asl javob: {{ node.text }}
          </small>
        </div>
      </div>
    </div>

    <!-- STEM DOWN -->
    <div v-if="children.length > 0" class="tree-stem-down"></div>

    <!-- RECURSIVE CHILDREN ROW -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center gap-3 flex-wrap position-relative w-100"
      :class="{ 'multiple-children': children.length > 1 }"
    >
      <div 
        v-for="child in children" 
        :key="child.id" 
        class="tree-child-col d-flex flex-column align-items-center position-relative"
      >
        <FlowTreeNodePlay 
          :node="child"
          :all-nodes="allNodes"
          :is-root="false"
          :is-answered="isAnswered"
          :placed-cards="placedCards"
          :selected-card="selectedCard"
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
  min-height: 90px;
  backdrop-filter: blur(8px);
  cursor: pointer;
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
  height: 24px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.tree-children-row {
  padding-top: 14px;
}

.tree-children-row.multiple-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
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
</style>
