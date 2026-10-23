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
  maxNodesReached: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-child', 'remove-node', 'toggle-blank']);

// Direct children of this node
const children = computed(() => {
  if (!props.allNodes) return [];
  return props.allNodes.filter(n => {
    if (n.id === props.node.id) return false;
    if (n.parentId === props.node.id) return true;
    // Backwards compatibility: if parentId is missing and this is root's child
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
      class="interactive-node-card p-3 rounded-4 shadow-lg border transition-all position-relative"
      :class="node.isBlank ? 'node-card-blank' : 'node-card-static'"
      :style="{ width: isRoot ? '240px' : '200px' }"
    >
      <!-- Card Header: Label input, Blank toggle, Delete -->
      <div class="d-flex align-items-center justify-content-between mb-2">
        <input 
          v-model="node.label" 
          class="badge-input form-control form-control-xs py-0 px-1 text-center font-monospace"
          :class="node.isBlank ? 'bg-warning text-dark' : 'bg-primary text-white'"
          placeholder="Nomi / Bosqich"
          style="max-width: 85px; font-size: 0.7rem;"
        />

        <div class="d-flex align-items-center gap-1">
          <!-- Toggle Blank / Static -->
          <button 
            @click="emit('toggle-blank', node)" 
            class="btn btn-xs py-0 px-2 rounded-pill fw-bold"
            :class="node.isBlank ? 'btn-warning text-dark' : 'btn-outline-info text-info'"
            style="font-size: 0.65rem;"
            :title="node.isBlank ? 'Statik qilish' : 'Bo\'sh katak qilish'"
          >
            {{ node.isBlank ? 'Bo\'sh' : 'Statik' }}
          </button>

          <!-- Delete Node -->
          <button 
            @click="emit('remove-node', node.id)" 
            class="btn btn-xs btn-outline-danger p-0 rounded-circle"
            style="width: 20px; height: 20px; line-height: 1;"
            title="O'chirish"
            :disabled="allNodes.length <= 2"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <!-- Card Body: Text Input -->
      <div class="mb-2">
        <input 
          v-model="node.text" 
          type="text" 
          class="form-control text-center text-white fw-bold border-secondary border-opacity-50 rounded-3 shadow-inner"
          placeholder="Ism / Atamani yozing..."
          style="background-color: #0F172A !important; font-size: 0.92rem;"
        />
      </div>

      <!-- Action: Add Child directly to THIS node (Shaybon, Jo'ji, Chingizxon, etc.) -->
      <div class="text-center mt-2">
        <button 
          @click="emit('add-child', node)" 
          class="btn btn-xs rounded-pill px-3 py-1 fw-bold shadow-sm transition-all"
          :class="isRoot ? 'btn-outline-info text-info' : 'btn-outline-warning text-warning'"
          style="font-size: 0.72rem;"
          :title="`${node.text || node.label || 'Ushbu shaxs'} quyisiga avlod qo'shish`"
          :disabled="maxNodesReached"
        >
          <i class="bi me-1" :class="isRoot ? 'bi-plus-circle' : 'bi-arrow-down-circle-fill'"></i>
          <span>{{ isRoot ? 'Asosiy shox qo\'shish' : 'Avlod qo\'shish' }}</span>
        </button>
      </div>
    </div>

    <!-- STEM DOWN IF THIS NODE HAS CHILDREN -->
    <div v-if="children.length > 0" class="tree-stem-down"></div>

    <!-- RECURSIVE CHILDREN ROW -->
    <div 
      v-if="children.length > 0" 
      class="tree-children-row d-flex justify-content-center gap-3 flex-wrap position-relative"
      :class="{ 'multiple-children': children.length > 1 }"
    >
      <div 
        v-for="child in children" 
        :key="child.id" 
        class="tree-child-col d-flex flex-column align-items-center position-relative"
      >
        <FlowTreeNodeEditor 
          :node="child"
          :all-nodes="allNodes"
          :is-root="false"
          :max-nodes-reached="maxNodesReached"
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
  backdrop-filter: blur(8px);
}

.node-card-static {
  background-color: #1E293B;
  border-color: #38BDF8 !important;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}

.node-card-blank {
  background-color: #1E293B;
  border-color: #F59E0B !important;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
}

.badge-input {
  border: none;
  font-weight: bold;
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
