/**
 * Serializes Vue 3 reactive proxies into plain JavaScript objects for Firestore.
 * Prevents Firestore "Function DocumentReference.set() called with invalid data" errors.
 * 
 * @param {any} data - Vue 3 reactive state or proxy object
 * @returns {any} - Clean plain JavaScript object
 */
export function toFirestoreData(data) {
  if (data === undefined) return null;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Generates a random 6-digit game PIN string (e.g., "482915")
 * @returns {string} 6-digit numeric string
 */
export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format seconds into mm:ss or ss
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) {
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${secs}s`;
}

/**
 * Shuffles questions order AND shuffles each question's 4 options independently.
 * Properly re-indexes correctIndex so each player gets a unique question order and option layout.
 * 
 * @param {Array} originalQuestions - Original quiz questions array
 * @returns {Array} Randomized questions with randomized options
 */
export function shuffleQuestionsAndOptions(originalQuestions) {
  if (!originalQuestions || !Array.isArray(originalQuestions)) return [];

  // Deep clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(originalQuestions));

  // Fisher-Yates array shuffler
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // 1. Shuffle the order of questions
  const shuffledQuestions = shuffle([...cloned]);

  // 2. Shuffle options for every question while preserving the correct answer index
  return shuffledQuestions.map((q) => {
    const originalCorrectText = q.options[q.correctIndex];
    const newOptions = shuffle([...q.options]);
    const newCorrectIndex = newOptions.indexOf(originalCorrectText);

    return {
      ...q,
      options: newOptions,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
    };
  });
}
