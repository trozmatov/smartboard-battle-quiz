import { shuffleQuestionsAndOptions } from './src/utils/helpers.js';
import { DEFAULT_QUIZZES } from './src/firebase/quizService.js';

try {
  console.log("Testing default quizzes...");
  const shuf = shuffleQuestionsAndOptions(DEFAULT_QUIZZES[0].questions);
  console.log("Success:", shuf.length);
} catch (e) {
  console.error("Error:", e);
}
