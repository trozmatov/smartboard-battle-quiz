import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './config';
import { toFirestoreData } from '../utils/helpers';

const JEOPARDY_COLLECTION = 'jeopardy_games';

/**
 * Starter Jeopardy Games
 */
export const DEFAULT_JEOPARDY_GAMES = [
  {
    id: 'starter-jeopardy-world-history',
    title: '🌍 World History & Civilizations Jeopardy',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    categories: [
      {
        name: 'Ancient Egypt',
        questions: [
          { points: 100, question: 'Which river was the lifeblood of Ancient Egyptian civilization?', answer: 'The Nile River' },
          { points: 200, question: 'What were the massive stone tombs built for pharaohs called?', answer: 'Pyramids' },
          { points: 300, question: 'What ancient paper-like writing material was made from reeds?', answer: 'Papyrus' },
          { points: 400, question: 'Who was the famous boy king whose intact tomb was found in 1922?', answer: 'King Tutankhamun (King Tut)' },
          { points: 500, question: 'Which stone discovered in 1799 unlocked the translation of Egyptian hieroglyphs?', answer: 'The Rosetta Stone' }
        ]
      },
      {
        name: 'Greek Mythology',
        questions: [
          { points: 100, question: 'Who is the king of the Olympian gods and god of the sky?', answer: 'Zeus' },
          { points: 200, question: 'Who is the Greek goddess of wisdom and warfare?', answer: 'Athena' },
          { points: 300, question: 'Which mythical hero completed 12 legendary labors?', answer: 'Heracles (Hercules)' },
          { points: 400, question: 'What mythical creature had the body of a man and the head of a bull?', answer: 'The Minotaur' },
          { points: 500, question: 'Which winged horse was born from Medusa\'s neck?', answer: 'Pegasus' }
        ]
      },
      {
        name: 'Science & Cosmos',
        questions: [
          { points: 100, question: 'What is the closest planet to the Sun in our Solar System?', answer: 'Mercury' },
          { points: 200, question: 'What force keeps planets in orbit around the Sun?', answer: 'Gravity' },
          { points: 300, question: 'What is the chemical symbol for Gold on the periodic table?', answer: 'Au' },
          { points: 400, question: 'What type of galaxy is our Milky Way?', answer: 'Barred Spiral Galaxy' },
          { points: 500, question: 'What subatomic particle carries a negative electric charge?', answer: 'Electron' }
        ]
      },
      {
        name: 'World Geography',
        questions: [
          { points: 100, question: 'What is the largest ocean on planet Earth?', answer: 'Pacific Ocean' },
          { points: 200, question: 'Which continent is home to the Sahara Desert?', answer: 'Africa' },
          { points: 300, question: 'What is the capital city of Japan?', answer: 'Tokyo' },
          { points: 400, question: 'Which South American mountain range is the longest continental range?', answer: 'The Andes' },
          { points: 500, question: 'Which country has the most natural lakes in the world?', answer: 'Canada' }
        ]
      },
      {
        name: 'Inventions & Tech',
        questions: [
          { points: 100, question: 'Who is credited with inventing the modern movable type printing press in Europe?', answer: 'Johannes Gutenberg' },
          { points: 200, question: 'What does "WWW" stand for in website addresses?', answer: 'World Wide Web' },
          { points: 300, question: 'Which brothers successfully flew the first motorized airplane in 1903?', answer: 'The Wright Brothers (Orville and Wilbur)' },
          { points: 400, question: 'What programming language was created by Brendan Eich in just 10 days in 1995?', answer: 'JavaScript' },
          { points: 500, question: 'What device was invented by Alexander Graham Bell in 1876?', answer: 'The Telephone' }
        ]
      }
    ]
  }
];

/**
 * Fetch all Jeopardy games from Firestore
 * 
 * @returns {Promise<Array>} List of jeopardy game objects
 */
export async function getJeopardyGames() {
  try {
    const q = query(collection(db, JEOPARDY_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const games = [];
    querySnapshot.forEach((doc) => {
      games.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // If Firestore collection is empty, return starter templates
    if (games.length === 0) {
      return DEFAULT_JEOPARDY_GAMES;
    }

    // Merge custom games with starter templates
    return [...games, ...DEFAULT_JEOPARDY_GAMES];
  } catch (error) {
    console.warn('Could not fetch from Firestore, returning starter Jeopardy games:', error);
    return DEFAULT_JEOPARDY_GAMES;
  }
}

/**
 * Fetch a single Jeopardy game by ID
 */
export async function getJeopardyGameById(id) {
  try {
    const defaultFound = DEFAULT_JEOPARDY_GAMES.find(g => g.id === id);
    if (defaultFound) return defaultFound;

    const docRef = doc(db, JEOPARDY_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Jeopardy game by ID:', error);
    throw error;
  }
}

/**
 * Create a new Jeopardy game in Firestore
 * 
 * @param {Object} gameData - { title, categories, isAiGenerated }
 * @returns {Promise<Object>} Created game object with generated ID
 */
export async function saveJeopardyGame(gameData) {
  try {
    // Strip Vue 3 Reactive Proxy objects
    const cleanData = toFirestoreData({
      title: gameData.title || 'Untitled Jeopardy Game',
      isAiGenerated: !!gameData.isAiGenerated,
      categories: gameData.categories || [],
      createdAt: new Date().toISOString()
    });

    const docRef = await addDoc(collection(db, JEOPARDY_COLLECTION), cleanData);
    return {
      id: docRef.id,
      ...cleanData
    };
  } catch (error) {
    console.error('Error saving Jeopardy game to Firestore:', error);
    throw error;
  }
}

/**
 * Update an existing Jeopardy game
 */
export async function updateJeopardyGame(id, gameData) {
  try {
    const cleanData = toFirestoreData({
      title: gameData.title,
      isAiGenerated: !!gameData.isAiGenerated,
      categories: gameData.categories,
      updatedAt: new Date().toISOString()
    });

    const docRef = doc(db, JEOPARDY_COLLECTION, id);
    await updateDoc(docRef, cleanData);
    return {
      id,
      ...cleanData
    };
  } catch (error) {
    console.error('Error updating Jeopardy game:', error);
    throw error;
  }
}

/**
 * Delete a Jeopardy game
 */
export async function deleteJeopardyGame(id) {
  try {
    const docRef = doc(db, JEOPARDY_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting Jeopardy game:', error);
    throw error;
  }
}
