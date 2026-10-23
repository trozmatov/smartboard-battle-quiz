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
  }
});

const emit = defineEmits(['add-child', 'remove-node', 'toggle-blank']);

// Generation styling
const genStyle = computed(() => getGenerationStyle(props.depth));
const nextGenStyle = computed(() => getGenerationStyle(props.depth + 1));

// Direct children of this node
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
        borderColor: node.isBlank ? '#F59E0B' : genStyle.border,
        boxShadow: node.isBlank ? '0 0 16px rgba(245, 158, 11, 0.35)' : `0 0 15px ${genStyle.glow}`
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

    <!-- RECURSIVE CHILDREN ROW -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center flex-wrap position-relative"
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
        <FlowTreeNodeEditor 
          :node="child"
          :all-nodes="allNodes"
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
  backdrop-filter: blur(12px);
  border-width: 2px;
  border-style: solid;
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
