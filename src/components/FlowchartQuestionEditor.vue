<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import FlowTreeNodeEditor from './FlowTreeNodeEditor.vue';
import { getGenerationStyle, GENERATION_PALETTES } from '../utils/flowchartTheme.js';

const props = defineProps({
  question: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:question']);

// Initialize defaults if missing
if (!props.question.layout) {
  props.question.layout = 'branching';
}
if (!props.question.scoringType) {
  props.question.scoringType = 'partial';
}
if (!props.question.nodes || !Array.isArray(props.question.nodes) || props.question.nodes.length === 0) {
  props.question.nodes = [
    { id: 'n1', text: 'Chingizxon', isBlank: false, label: '1-qadam', parentId: null },
    { id: 'n2', text: 'Jo\'ji', isBlank: true, label: '2-qadam', parentId: 'n1' },
    { id: 'n3', text: 'Chig\'atoy', isBlank: true, label: '3-qadam', parentId: 'n1' },
    { id: 'n4', text: 'O\'qtoy', isBlank: true, label: '4-qadam', parentId: 'n1' },
    { id: 'n5', text: 'Tulu', isBlank: true, label: '5-qadam', parentId: 'n1' }
  ];
}
if (!props.question.distractors || !Array.isArray(props.question.distractors)) {
  props.question.distractors = [];
}

const nodes = computed({
  get: () => props.question.nodes,
  set: (val) => {
    emit('update:question', { ...props.question, nodes: val });
  }
});

const distractors = computed({
  get: () => props.question.distractors,
  set: (val) => {
    emit('update:question', { ...props.question, distractors: val });
  }
});

// ==================== TREE & NODE HIERARCHY LOGIC ====================

// Root node (first node or node with parentId === null)
const rootNode = computed(() => {
  if (!nodes.value || nodes.value.length === 0) return null;
  const explicitRoot = nodes.value.find(n => n.parentId === null);
  return explicitRoot || nodes.value[0];
});

// Helper to get children of a node
function getChildren(parentNodeId) {
  if (!nodes.value) return [];
  const rootId = rootNode.value?.id;

  return nodes.value.filter(n => {
    if (n.id === rootId) return false; // root is never child of itself
    if (n.parentId === parentNodeId) return true;
    // Backwards compatibility: if parentId is missing and this is root's child
    if ((!n.parentId || n.parentId === undefined) && parentNodeId === rootId) {
      return true;
    }
    return false;
  });
}

// Add child directly to a parent node (e.g. under Jo'ji or under Chingizxon)
function addChild(parentNode) {
  if (nodes.value.length >= 16) {
    alert("Maksimal 16 ta blok qo'shish mumkin.");
    return;
  }
  const newId = `n${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const children = getChildren(parentNode.id);
  const nextNum = nodes.value.length + 1;

  nodes.value.push({
    id: newId,
    text: '',
    isBlank: true,
    label: `${nextNum}-qadam`,
    parentId: parentNode.id
  });
}

// Add node sequentially for linear / cycle / hierarchy
function addLinearStep(afterIndex = null) {
  if (nodes.value.length >= 16) {
    alert("Maksimal 16 ta blok qo'shish mumkin.");
    return;
  }
  const nextIdx = nodes.value.length + 1;
  const newNode = {
    id: `n${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: '',
    isBlank: true,
    label: `${nextIdx}-qadam`,
    parentId: null
  };

  if (afterIndex !== null && afterIndex >= 0) {
    nodes.value.splice(afterIndex + 1, 0, newNode);
  } else {
    nodes.value.push(newNode);
  }
}

// Delete a node
function removeNodeById(nodeId) {
  if (nodes.value.length <= 2) {
    alert("Sxemada kamida 2 ta blok bo'lishi shart.");
    return;
  }
  const idx = nodes.value.findIndex(n => n.id === nodeId);
  if (idx !== -1) {
    const parentOfDeleted = nodes.value[idx].parentId || null;
    // Reassign children of deleted node to its parent so tree doesn't break
    nodes.value.forEach(n => {
      if (n.parentId === nodeId) {
        n.parentId = parentOfDeleted;
      }
    });
    nodes.value.splice(idx, 1);
  }
}

function removeNode(index) {
  if (nodes.value.length > 2) {
    removeNodeById(nodes.value[index].id);
  }
}

// Toggle Blank status directly
function toggleBlank(node) {
  node.isBlank = !node.isBlank;
}

// Distractors
function addDistractor() {
  if (distractors.value.length < 6) {
    distractors.value.push('');
  }
}

function removeDistractor(index) {
  distractors.value.splice(index, 1);
}

// Validation logic
const validationError = computed(() => {
  if (nodes.value.length < 2) return "Sxemada kamida 2 ta blok bo'lishi shart.";
  
  const blankCount = nodes.value.filter(n => n.isBlank).length;
  if (blankCount < 1) return "Kamida 1 ta blokni 'Bo'sh katak' qilib belgilashingiz kerak.";
  
  for (let i = 0; i < nodes.value.length; i++) {
    if (!nodes.value[i].text.trim()) {
      return `${nodes.value[i].label || i + 1 + '-blok'} matni bo'sh bo'lishi mumkin emas.`;
    }
  }

  const texts = nodes.value.map(n => n.text.trim().toLowerCase());
  const uniqueTexts = new Set(texts);
  if (uniqueTexts.size !== texts.length) {
    return "Bloklar orasida takroriy matn kiritish mumkin emas.";
  }

  return null;
});

const layouts = [
  { id: 'branching', name: 'Shajara / Tarmoq', icon: 'bi-diagram-3-fill', desc: 'Family Tree va ko\'p pog\'onali shoxlar' },
  { id: 'linear', name: 'Chiziqli zanjir', icon: 'bi-arrow-right', desc: '1 → 2 → 3 → 4' },
  { id: 'cycle', name: 'Aylanma sikl', icon: 'bi-arrow-repeat', desc: '1 → 2 → 3 → 1' },
  { id: 'hierarchy', name: 'Ierarxiya', icon: 'bi-diagram-2-fill', desc: 'Yuqoridan pastga' }
];

// View tab in editor: 'canvas' (Interaktiv Preview) or 'list' (Jadval)
const editorView = ref('canvas'); // 'canvas' | 'list'

// Zoom & Compact state for Editor Preview
const zoomLevel = ref(1.0);
const isCompact = ref(props.question.layout === 'branching');

function autoFitZoom() {
  const count = nodes.value.length || 0;
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
</script>

<template>
  <div class="flowchart-editor mt-4">
    
    <!-- Top Settings: Layout & Scoring Type -->
    <div class="row g-3 mb-4">
      <div class="col-md-7">
        <label class="form-label text-light fw-bold mb-2">
          <i class="bi bi-diagram-3 text-info me-1"></i> Sxema Topologiyasi (Shablon)
        </label>
        <div class="d-flex gap-2 flex-wrap">
          <button 
            v-for="l in layouts" 
            :key="l.id"
            type="button"
            class="btn flex-grow-1 p-2 text-start rounded-3 border transition-all"
            :class="question.layout === l.id ? 'btn-info text-dark fw-bold border-info shadow' : 'btn-dark border-secondary border-opacity-50 text-white'"
            style="min-width: 140px;"
            @click="question.layout = l.id"
          >
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="small fw-bold">{{ l.name }}</span>
              <i class="bi fs-5" :class="l.icon"></i>
            </div>
            <div class="small opacity-75 font-monospace" style="font-size: 0.75rem;">{{ l.desc }}</div>
          </button>
        </div>
      </div>

      <div class="col-md-5">
        <label class="form-label text-light fw-bold mb-2">
          <i class="bi bi-award text-warning me-1"></i> Ball Hisoblash Qoidasi
        </label>
        <div class="d-flex flex-column gap-2">
          <div 
            class="p-2 rounded-3 border d-flex align-items-center gap-3 cursor-pointer"
            :class="question.scoringType === 'partial' ? 'border-warning bg-warning bg-opacity-10 text-white' : 'border-secondary border-opacity-25 text-secondary'"
            @click="question.scoringType = 'partial'"
            style="cursor: pointer;"
          >
            <input type="radio" value="partial" v-model="question.scoringType" class="form-check-input mt-0" />
            <div>
              <div class="fw-bold small text-white">Proporsional (Qisman ball)</div>
              <div class="small opacity-75" style="font-size: 0.75rem;">Har bir to'g'ri katakka teng ulushda ball beriladi.</div>
            </div>
          </div>

          <div 
            class="p-2 rounded-3 border d-flex align-items-center gap-3 cursor-pointer"
            :class="question.scoringType === 'all_or_nothing' ? 'border-warning bg-warning bg-opacity-10 text-white' : 'border-secondary border-opacity-25 text-secondary'"
            @click="question.scoringType = 'all_or_nothing'"
            style="cursor: pointer;"
          >
            <input type="radio" value="all_or_nothing" v-model="question.scoringType" class="form-check-input mt-0" />
            <div>
              <div class="fw-bold small text-white">Hammasi yoki Hech narsa (100%)</div>
              <div class="small opacity-75" style="font-size: 0.75rem;">Faqat barcha kataklar to'liq to'g'ri bo'lsagina ball beriladi.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Warning -->
    <div v-if="validationError" class="alert alert-warning py-2 small d-flex align-items-center mb-3">
      <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i> {{ validationError }}
    </div>

    <!-- ==================== MAIN INTERACTIVE CANVAS / PREVIEW ==================== -->
    <div class="card p-3 mb-4 rounded-4 border border-info border-opacity-50 shadow-lg" style="background: radial-gradient(circle at top, #1E293B, #0B1120);">
      
      <!-- Canvas Header Bar -->
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-2 mb-3 border-bottom border-secondary border-opacity-25">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="badge bg-info text-dark fw-bold px-3 py-2 fs-6">
            <i class="bi bi-pencil-square me-1"></i> Interaktiv Sxema Muharriri (Canvas)
          </span>
          <span class="badge bg-dark border border-secondary text-light">
            Jami: {{ nodes.length }} ta blok
          </span>

          <!-- Zoom & Compact Controls for Teacher -->
          <button 
            type="button"
            @click="isCompact = !isCompact" 
            class="btn btn-xs rounded-pill px-2 py-1 fw-bold border ms-2"
            :class="isCompact ? 'btn-info text-dark border-info shadow-sm' : 'btn-dark text-secondary border-secondary'"
            title="Ixcham/Keng ko'rinish"
          >
            <i class="bi me-1" :class="isCompact ? 'bi-arrows-angle-contract' : 'bi-arrows-angle-expand'"></i>
            {{ isCompact ? 'Ixcham rejim' : 'Keng rejim' }}
          </button>

          <div class="btn-group btn-group-sm bg-dark rounded-pill border border-secondary border-opacity-50 p-0 overflow-hidden">
            <button type="button" @click="zoomOut" class="btn btn-xs btn-outline-secondary text-white border-0 py-1 px-2" title="Kichraytirish">
              <i class="bi bi-dash-lg"></i>
            </button>
            <button type="button" @click="resetZoom" class="btn btn-xs btn-dark text-info border-0 py-1 px-2 font-monospace fw-bold" style="font-size: 0.75rem;" title="100% tiklash">
              {{ Math.round(zoomLevel * 100) }}%
            </button>
            <button type="button" @click="zoomIn" class="btn btn-xs btn-outline-secondary text-white border-0 py-1 px-2" title="Kattalashtirish">
              <i class="bi bi-plus-lg"></i>
            </button>
            <button type="button" @click="autoFitZoom" class="btn btn-xs btn-outline-warning text-warning border-0 py-1 px-2" title="Ekranga sig'dirish">
              <i class="bi bi-arrows-fullscreen me-1"></i> Sig'dirish
            </button>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 small">
          <span class="badge bg-warning text-dark d-flex align-items-center gap-1">
            <i class="bi bi-question-circle-fill"></i> Sariq = Bo'sh katak (O'quvchi to'ldiradi)
          </span>
          <span class="badge bg-primary text-white d-flex align-items-center gap-1">
            <i class="bi bi-lock-fill"></i> Moviy = Statik ko'rsatma
          </span>
        </div>
      </div>

      <!-- Quick Canvas Instructions -->
      <div class="alert alert-info py-1 px-3 small d-flex align-items-center justify-content-between mb-3" style="background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.25); color: #7DD3FC;">
        <div>
          <i class="bi bi-magic me-1"></i> 
          <strong>To'g'ridan-to'g'ri tahrirlash:</strong> Matnni blok ichida yozing. 
          Blok ostidagi <span class="badge bg-warning text-dark py-0 px-1">+ Avlod qo'shish</span> tugmasi orqali aynan o'sha shaxs/jarayon ostiga yangi bo'g'in qo'shishingiz mumkin!
        </div>
        <button 
          v-if="question.layout === 'linear' || question.layout === 'cycle' || question.layout === 'hierarchy'"
          @click="addLinearStep()" 
          class="btn btn-sm btn-info rounded-pill px-3 fw-bold text-dark text-nowrap"
          :disabled="nodes.length >= 16"
        >
          <i class="bi bi-plus-lg me-1"></i> Yangi qadam qo'shish
        </button>
      </div>

      <!-- Dynasty Legend in Editor -->
      <div 
        v-if="question.layout === 'branching'" 
        class="d-flex align-items-center gap-1 flex-wrap py-1 px-3 mb-3 rounded-pill border border-warning border-opacity-25 shadow-sm"
        style="background: rgba(15, 23, 42, 0.85);"
      >
        <span class="small fw-bold text-warning font-monospace text-nowrap me-2">
          <i class="bi bi-crown-fill text-warning me-1"></i> Shajara Palitrasi:
        </span>
        <span 
          v-for="p in GENERATION_PALETTES.slice(0, 5)" 
          :key="p.depth" 
          class="badge rounded-pill d-inline-flex align-items-center gap-1 font-monospace"
          :style="{ background: p.badgeBg, border: `1px solid ${p.badgeBorder}`, color: p.badgeText, fontSize: '0.68rem' }"
        >
          <i :class="p.icon"></i>
          <span>{{ p.roman }} ({{ p.title.split('(')[1]?.replace(')', '') || p.title }})</span>
        </span>
      </div>

      <!-- INTERACTIVE PREVIEW DIAGRAM VIEWPORTS -->
      <div class="interactive-canvas py-4 px-2 d-flex justify-content-center align-items-start overflow-auto position-relative" style="min-height: 420px; max-height: 720px;">
        
        <div 
          class="canvas-zoom-wrapper d-flex justify-content-center"
          :style="{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            minWidth: 'max-content',
            transition: 'transform 0.2s ease'
          }"
        >
          <!-- ==================== 1. BRANCHING / FAMILY TREE LAYOUT (Unlimited Depth) ==================== -->
          <div 
            v-if="question.layout === 'branching'" 
            class="tree-root-container d-flex flex-column align-items-center"
            style="min-width: max-content;"
          >
            <FlowTreeNodeEditor 
              v-if="rootNode"
              :node="rootNode"
              :all-nodes="nodes"
              :is-root="true"
              :compact="isCompact"
              :depth="0"
              :max-nodes-reached="nodes.length >= 24"
              @add-child="addChild($event)"
              @remove-node="removeNodeById($event)"
              @toggle-blank="toggleBlank($event)"
            />
          </div>

        <!-- ==================== 2. LINEAR CHAIN LAYOUT ==================== -->
        <div v-else-if="question.layout === 'linear'" class="d-flex align-items-center justify-content-center flex-wrap gap-3 py-2 w-100">
          <template v-for="(node, idx) in nodes" :key="node.id">
            
            <div 
              class="interactive-node-card p-3 rounded-4 shadow-lg border transition-all position-relative"
              :class="node.isBlank ? 'node-card-blank' : 'node-card-static'"
              :style="{ 
                width: isCompact ? '165px' : '205px',
                background: getGenerationStyle(idx).bg,
                borderColor: node.isBlank ? '#F59E0B' : getGenerationStyle(idx).border,
                boxShadow: node.isBlank ? '0 0 16px rgba(245, 158, 11, 0.35)' : `0 0 15px ${getGenerationStyle(idx).glow}`
              }"
            >
              <div class="royal-gold-sheen"></div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-1">
                  <i :class="getGenerationStyle(idx).icon" :style="{ color: getGenerationStyle(idx).accent, fontSize: '0.85rem' }"></i>
                  <input 
                    v-model="node.label" 
                    class="badge-input form-control form-control-xs py-0 px-1 text-center font-monospace"
                    :style="{ 
                      background: getGenerationStyle(idx).badgeBg, 
                      border: `1px solid ${getGenerationStyle(idx).badgeBorder}`, 
                      color: getGenerationStyle(idx).badgeText,
                      maxWidth: '85px', 
                      fontSize: '0.7rem' 
                    }"
                    :placeholder="getGenerationStyle(idx).roman"
                  />
                </div>

                <div class="d-flex align-items-center gap-1">
                  <button 
                    @click="toggleBlank(node)" 
                    class="btn btn-xs py-0 px-2 rounded-pill fw-bold"
                    :class="node.isBlank ? 'btn-warning text-dark' : 'btn-outline-light text-white opacity-75'"
                    style="font-size: 0.65rem;"
                  >
                    {{ node.isBlank ? 'Bo\'sh' : 'Statik' }}
                  </button>
                  <button 
                    @click="removeNodeById(node.id)" 
                    class="btn btn-xs btn-outline-danger p-0 rounded-circle"
                    style="width: 20px; height: 20px;"
                    title="O'chirish"
                    :disabled="nodes.length <= 2"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>

              <input 
                v-model="node.text" 
                type="text" 
                class="form-control text-center text-white fw-bold border-secondary border-opacity-50 rounded-3"
                placeholder="Qadam matnini kiriting..."
                style="background-color: rgba(15, 23, 42, 0.85) !important; font-size: 0.9rem;"
              />
            </div>

            <!-- Arrow and Inline Add Step button -->
            <div v-if="idx < nodes.length - 1" class="d-flex flex-column align-items-center px-1">
              <i class="bi bi-arrow-right fs-3 text-warning" style="filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));"></i>
              <button 
                @click="addLinearStep(idx)" 
                class="btn btn-xs btn-outline-warning rounded-circle p-0 mt-1" 
                style="width: 20px; height: 20px; line-height: 1;"
                title="O'rtaga yangi qadam qo'shish"
                :disabled="nodes.length >= 16"
              >
                +
              </button>
            </div>
          </template>

          <!-- Add Step at end -->
          <button 
            @click="addLinearStep()" 
            class="btn btn-outline-warning rounded-4 p-3 d-flex flex-column align-items-center justify-content-center shadow-sm"
            style="width: 140px; min-height: 95px; border-style: dashed !important;"
            :disabled="nodes.length >= 16"
          >
            <i class="bi bi-plus-circle fs-3 mb-1"></i>
            <span class="small fw-bold">Qadam qo'shish</span>
          </button>
        </div>

        <!-- ==================== 3. CYCLE LOOP LAYOUT ==================== -->
        <div v-else-if="question.layout === 'cycle'" class="d-flex align-items-center justify-content-center flex-wrap gap-3 py-2 w-100">
          <template v-for="(node, idx) in nodes" :key="node.id">
            <div 
              class="interactive-node-card p-3 rounded-4 shadow-lg border transition-all position-relative"
              :class="node.isBlank ? 'node-card-blank' : 'node-card-static'"
              :style="{ 
                width: isCompact ? '165px' : '205px',
                background: getGenerationStyle(idx).bg,
                borderColor: node.isBlank ? '#F59E0B' : getGenerationStyle(idx).border,
                boxShadow: node.isBlank ? '0 0 16px rgba(245, 158, 11, 0.35)' : `0 0 15px ${getGenerationStyle(idx).glow}`
              }"
            >
              <div class="royal-gold-sheen"></div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-1">
                  <i :class="getGenerationStyle(idx).icon" :style="{ color: getGenerationStyle(idx).accent, fontSize: '0.85rem' }"></i>
                  <input 
                    v-model="node.label" 
                    class="badge-input form-control form-control-xs py-0 px-1 text-center font-monospace"
                    :style="{ 
                      background: getGenerationStyle(idx).badgeBg, 
                      border: `1px solid ${getGenerationStyle(idx).badgeBorder}`, 
                      color: getGenerationStyle(idx).badgeText,
                      maxWidth: '85px', 
                      fontSize: '0.7rem' 
                    }"
                    :placeholder="getGenerationStyle(idx).roman"
                  />
                </div>

                <div class="d-flex align-items-center gap-1">
                  <button 
                    @click="toggleBlank(node)" 
                    class="btn btn-xs py-0 px-2 rounded-pill fw-bold"
                    :class="node.isBlank ? 'btn-warning text-dark' : 'btn-outline-light text-white opacity-75'"
                    style="font-size: 0.65rem;"
                  >
                    {{ node.isBlank ? 'Bo\'sh' : 'Statik' }}
                  </button>
                  <button 
                    @click="removeNodeById(node.id)" 
                    class="btn btn-xs btn-outline-danger p-0 rounded-circle"
                    style="width: 20px; height: 20px;"
                    title="O'chirish"
                    :disabled="nodes.length <= 2"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>

              <input 
                v-model="node.text" 
                type="text" 
                class="form-control text-center text-white fw-bold border-secondary border-opacity-50 rounded-3"
                placeholder="Davr bosqichini yozing..."
                style="background-color: rgba(15, 23, 42, 0.85) !important; font-size: 0.9rem;"
              />
            </div>

            <div v-if="idx < nodes.length - 1" class="d-flex align-items-center px-1">
              <i class="bi bi-arrow-right fs-3 text-warning" style="filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));"></i>
            </div>
            <div v-else class="d-flex align-items-center px-1" title="Aylanma davr">
              <i class="bi bi-arrow-repeat fs-2 text-warning" style="filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.7));"></i>
            </div>
          </template>

          <button 
            @click="addLinearStep()" 
            class="btn btn-outline-warning rounded-4 p-3 d-flex flex-column align-items-center justify-content-center shadow-sm"
            style="width: 140px; min-height: 95px; border-style: dashed !important;"
            :disabled="nodes.length >= 16"
          >
            <i class="bi bi-plus-circle fs-3 mb-1"></i>
            <span class="small fw-bold">Davrga qo'shish</span>
          </button>
        </div>

        <!-- ==================== 4. HIERARCHY PYRAMID LAYOUT ==================== -->
        <div v-else class="d-flex flex-column align-items-center w-100 gap-2">
          <template v-for="(node, idx) in nodes" :key="node.id">
            <div 
              class="interactive-node-card p-3 rounded-4 shadow-lg border transition-all position-relative"
              :class="node.isBlank ? 'node-card-blank' : 'node-card-static'"
              :style="{ 
                width: `${200 + idx * 40}px`,
                background: getGenerationStyle(idx).bg,
                borderColor: node.isBlank ? '#F59E0B' : getGenerationStyle(idx).border,
                boxShadow: node.isBlank ? '0 0 16px rgba(245, 158, 11, 0.35)' : `0 0 15px ${getGenerationStyle(idx).glow}`
              }"
            >
              <div class="royal-gold-sheen"></div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-1">
                  <i :class="getGenerationStyle(idx).icon" :style="{ color: getGenerationStyle(idx).accent, fontSize: '0.85rem' }"></i>
                  <input 
                    v-model="node.label" 
                    class="badge-input form-control form-control-xs py-0 px-1 text-center font-monospace"
                    :style="{ 
                      background: getGenerationStyle(idx).badgeBg, 
                      border: `1px solid ${getGenerationStyle(idx).badgeBorder}`, 
                      color: getGenerationStyle(idx).badgeText,
                      maxWidth: '85px', 
                      fontSize: '0.7rem' 
                    }"
                    :placeholder="getGenerationStyle(idx).roman"
                  />
                </div>

                <div class="d-flex align-items-center gap-1">
                  <button 
                    @click="toggleBlank(node)" 
                    class="btn btn-xs py-0 px-2 rounded-pill fw-bold"
                    :class="node.isBlank ? 'btn-warning text-dark' : 'btn-outline-light text-white opacity-75'"
                    style="font-size: 0.65rem;"
                  >
                    {{ node.isBlank ? 'Bo\'sh' : 'Statik' }}
                  </button>
                  <button 
                    @click="removeNodeById(node.id)" 
                    class="btn btn-xs btn-outline-danger p-0 rounded-circle"
                    style="width: 20px; height: 20px;"
                    title="O'chirish"
                    :disabled="nodes.length <= 2"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>

              <input 
                v-model="node.text" 
                type="text" 
                class="form-control text-center text-white fw-bold border-secondary border-opacity-50 rounded-3"
                placeholder="Mavqei / Tabaqa..."
                style="background-color: rgba(15, 23, 42, 0.85) !important; font-size: 0.9rem;"
              />
            </div>

            <i v-if="idx < nodes.length - 1" class="bi bi-arrow-down fs-4 text-warning my-1" style="filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));"></i>
          </template>

          <button 
            @click="addLinearStep()" 
            class="btn btn-outline-warning rounded-pill px-4 py-2 mt-2 fw-bold"
            :disabled="nodes.length >= 16"
          >
            <i class="bi bi-plus-lg me-1"></i> Yangi daraja qo'shish
          </button>
        </div>

        </div> <!-- end canvas-zoom-wrapper -->

      </div> <!-- end interactive-canvas -->

    </div> <!-- end card -->

    <!-- ==================== DISTRACTORS SECTION ==================== -->
    <div class="distractors-section p-3 rounded-4 border border-secondary border-opacity-25" style="background-color: #162032;">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
          <label class="form-label text-light fw-bold fs-5 mb-0">
            <i class="bi bi-shuffle text-danger me-2"></i> Chalg'ituvchi Variantlar (Distraktorlar)
          </label>
          <div class="small text-secondary">
            O'quvchi shunchaki topib qo'ymasligi uchun kartochkalar bankiga ortiqcha noto'g'ri variantlar qo'shishingiz mumkin.
          </div>
        </div>
        <button 
          @click="addDistractor" 
          class="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold"
          :disabled="distractors.length >= 6"
        >
          <i class="bi bi-plus-lg me-1"></i> Variant qo'shish
        </button>
      </div>

      <div v-if="distractors.length === 0" class="text-muted small p-3 rounded-3 border border-secondary border-opacity-10 text-center" style="background-color: #0F172A;">
        Hozircha chalg'ituvchi variant qo'shilmagan. O'quvchiga faqat to'g'ri kartochkalar aralashtirib beriladi.
      </div>

      <div class="row g-2" v-else>
        <div 
          v-for="(item, dIdx) in distractors" 
          :key="dIdx" 
          class="col-md-6"
        >
          <div class="d-flex align-items-center gap-2 p-2 rounded-3 border border-secondary border-opacity-25" style="background-color: #0F172A;">
            <span class="badge bg-danger bg-opacity-25 text-danger px-2 py-1 font-monospace" style="font-size: 0.7rem;">
              Xato #{{ dIdx + 1 }}
            </span>

            <input 
              v-model="distractors[dIdx]" 
              type="text" 
              class="form-control form-control-sm text-white border-secondary border-opacity-50 rounded-2" 
              placeholder="Chalg'ituvchi noto'g'ri matnni kiriting..."
              style="background-color: #1E293B !important;"
              maxlength="100"
            />

            <button 
              @click="removeDistractor(dIdx)" 
              class="btn btn-sm btn-outline-danger border-0 rounded-circle"
              title="O'chirish"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.interactive-canvas {
  background: radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.98) 75%);
  border: 1px dashed rgba(245, 158, 11, 0.3);
  border-radius: 16px;
}

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

/* Tree Connectors */
.tree-vertical-line {
  width: 2px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.tree-branches-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.tree-branch-column::before {
  content: '';
  position: absolute;
  top: 0;
  width: 2px;
  height: 15px;
  background-color: #38BDF8;
  opacity: 0.6;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
