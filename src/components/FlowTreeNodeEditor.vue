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
  maxNodesReached: {
    type: Boolean,
    default: false
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
  }
});

const emit = defineEmits(['add-child', 'remove-node', 'toggle-blank']);

// Generation styling
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
</script>

<template>
  <div class="tree-node-wrapper d-flex flex-column align-items-center position-relative">
    
    <!-- NODE CARD -->
    <div 
      class="interactive-node-card shadow-lg transition-all position-relative"
      :class="[
        compact ? 'p-2 rounded-3 compact-editor-card' : 'p-3 rounded-4',
        node.isBlank ? 'node-card-blank' : 'node-card-static'
      ]"
      :style="{ 
        width: compact ? (isRoot ? '190px' : '155px') : (isRoot ? '240px' : '200px'),
        background: genStyle.bg,
        borderColor: genStyle.border,
        boxShadow: node.isBlank ? `0 0 16px ${genStyle.glow}` : `0 0 15px ${genStyle.glow}`
      }"
    >
      <!-- Royal Gold Top Sheen -->
      <div class="royal-gold-sheen"></div>

      <!-- Card Header: Generation Icon, Label input, Blank toggle, Delete -->
      <div class="d-flex align-items-center justify-content-between mb-1">
        <div class="d-flex align-items-center gap-1">
          <i :class="genStyle.icon" :style="{ color: genStyle.accent, fontSize: compact ? '0.75rem' : '0.85rem' }"></i>
          <input 
            v-model="node.label" 
            class="badge-input form-control form-control-xs py-0 px-1 text-center font-monospace"
            :style="{ 
              background: genStyle.badgeBg, 
              border: `1px solid ${genStyle.badgeBorder}`, 
              color: genStyle.badgeText,
              maxWidth: compact ? '65px' : '85px', 
              fontSize: compact ? '0.62rem' : '0.7rem' 
            }"
            :placeholder="genStyle.roman"
          />
        </div>

        <div class="d-flex align-items-center gap-1">
          <!-- Toggle Blank / Static -->
          <button 
            type="button"
            @click="emit('toggle-blank', node)" 
            class="btn btn-xs py-0 px-1 rounded-pill fw-bold"
            :class="node.isBlank ? 'btn-warning text-dark' : 'btn-outline-light text-white opacity-75'"
            :style="{ fontSize: compact ? '0.6rem' : '0.65rem' }"
            :title="node.isBlank ? 'Statik qilish' : 'Bo\'sh katak qilish'"
          >
            {{ node.isBlank ? 'Bo\'sh' : 'Statik' }}
          </button>

          <!-- Delete Node -->
          <button 
            type="button"
            @click="emit('remove-node', node.id)" 
            class="btn btn-xs btn-outline-danger p-0 rounded-circle"
            :style="{ width: compact ? '18px' : '20px', height: compact ? '18px' : '20px', lineHeight: 1 }"
            title="O'chirish"
            :disabled="allNodes.length <= 2"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <!-- Card Body: Text Input -->
      <div class="mb-1">
        <input 
          v-model="node.text" 
          type="text" 
          class="form-control text-center text-white fw-bold border-secondary border-opacity-50 rounded-2 shadow-inner"
          placeholder="Ism / Atamani yozing..."
          style="background-color: rgba(15, 23, 42, 0.85) !important;"
          :style="{ fontSize: compact ? '0.82rem' : '0.92rem', padding: compact ? '2px 4px' : '6px 8px' }"
        />
      </div>

      <!-- Action: Add Child directly to THIS node -->
      <div class="text-center mt-1">
        <button 
          type="button"
          @click="emit('add-child', node)" 
          class="btn btn-xs rounded-pill px-2 py-0 fw-bold shadow-sm transition-all"
          :style="{ 
            fontSize: compact ? '0.65rem' : '0.72rem',
            background: nextGenStyle.badgeBg,
            borderColor: nextGenStyle.badgeBorder,
            color: nextGenStyle.badgeText
          }"
          :title="`${node.text || node.label || 'Ushbu shaxs'} quyisiga avlod qo'shish`"
          :disabled="maxNodesReached"
        >
          <i class="bi me-1" :class="isRoot ? 'bi-plus-circle-fill' : 'bi-arrow-down-circle-fill'"></i>
          <span>{{ isRoot ? 'Shox qo\'shish' : `+ ${nextGenStyle.roman}` }}</span>
        </button>
      </div>
    </div>

    <!-- STEM DOWN IF THIS NODE HAS CHILDREN -->
    <div 
      v-if="children.length > 0" 
      class="tree-stem-down" 
      :class="{ 'compact-stem': compact }"
      :style="{
        background: `linear-gradient(to bottom, ${genStyle.stemColor}, ${nextGenStyle.stemColor})`,
        boxShadow: `0 0 8px ${genStyle.glow}`
      }"
    ></div>

    <!-- RECURSIVE CHILDREN ROW (Siblings in Next Generation: NEVER WRAP!) -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center flex-nowrap position-relative"
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
        <FlowTreeNodeEditor 
          :node="child"
          :all-nodes="allNodes"
          :children-map="childrenMap"
          :is-root="false"
          :max-nodes-reached="maxNodesReached"
          :compact="compact"
          :depth="depth + 1"
          @add-child="emit('add-child', $event)"
          @remove-node="emit('remove-node', $event)"
          @toggle-blank="emit('toggle-blank', $event)"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.interactive-node-card {
  border-width: 2px;
  border-style: solid;
  touch-action: manipulation;
  contain: layout style;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

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

.node-card-blank {
  border-style: dashed !important;
}

.badge-input {
  border-radius: 9999px;
  font-weight: bold;
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
