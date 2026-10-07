import { ref, watch } from 'vue';

const STORAGE_KEY = 'sb_map_scores';

function loadScores() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not parse map scores from local storage', err);
  }
  return {};
}

function saveScores(scoresObj) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scoresObj));
  } catch (err) {
    console.warn('Could not save map scores to local storage', err);
  }
}

// Global reactive state
const bestScores = ref(loadScores());

export function useMapScores() {
  function getBestScore(regionId) {
    return bestScores.value[regionId] || 0;
  }

  function updateScore(regionId, score) {
    const current = bestScores.value[regionId] || 0;
    if (score > current) {
      bestScores.value[regionId] = score;
      saveScores(bestScores.value);
    }
  }

  return {
    bestScores,
    getBestScore,
    updateScore
  };
}
