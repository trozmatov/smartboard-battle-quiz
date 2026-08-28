import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { toFirestoreData } from '../utils/helpers';

const QUIZZES_COLLECTION = 'quizzes';

// Sample Starter Quizzes for fast testing and onboarding
export const DEFAULT_QUIZZES = [
  {
    title: '🚀 Science & Solar System Blitz',
    questions: [
      {
        questionText: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctIndex: 1,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast'],
        correctIndex: 2,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'What gas do plants absorb during photosynthesis?',
        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
        correctIndex: 1,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'What is the closest star to planet Earth?',
        options: ['Proxima Centauri', 'Sirius', 'The Sun', 'Betelgeuse'],
        correctIndex: 2,
        timeLimit: 15,
        points: 150
      },
      {
        questionText: 'What is the chemical symbol for Gold?',
        options: ['Au', 'Ag', 'Fe', 'Gd'],
        correctIndex: 0,
        timeLimit: 15,
        points: 150
      }
    ]
  },
  {
    title: '🧠 Math & Logic Speed Battle',
    questions: [
      {
        questionText: 'What is 15 × 8?',
        options: ['110', '120', '130', '140'],
        correctIndex: 1,
        timeLimit: 10,
        points: 100
      },
      {
        questionText: 'What is the square root of 144?',
        options: ['11', '12', '14', '16'],
        correctIndex: 1,
        timeLimit: 10,
        points: 100
      },
      {
        questionText: 'If a triangle has angles 90° and 45°, what is the 3rd angle?',
        options: ['35°', '45°', '55°', '90°'],
        correctIndex: 1,
        timeLimit: 12,
        points: 150
      },
      {
        questionText: 'What is 75% of 200?',
        options: ['125', '140', '150', '175'],
        correctIndex: 2,
        timeLimit: 12,
        points: 150
      }
    ]
  },
  {
    title: '🌍 World Wonders & Geography',
    questions: [
      {
        questionText: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correctIndex: 3,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'Which country is home to the Great Barrier Reef?',
        options: ['Brazil', 'Australia', 'Indonesia', 'South Africa'],
        correctIndex: 1,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'What is the capital city of Japan?',
        options: ['Kyoto', 'Osaka', 'Tokyo', 'Hiroshima'],
        correctIndex: 2,
        timeLimit: 15,
        points: 100
      },
      {
        questionText: 'Which continent has the most countries?',
        options: ['Asia', 'Africa', 'Europe', 'South America'],
        correctIndex: 1,
        timeLimit: 15,
        points: 150
      }
    ]
  }
];

/**
 * Fetch all saved quizzes from Firestore (or starter templates if empty/offline)
 */
export async function getQuizzes() {
  try {
    const q = collection(db, QUIZZES_COLLECTION);
    const snapshot = await getDocs(q);
    const quizzes = [];
    snapshot.forEach(docSnap => {
      quizzes.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    // If no quizzes saved in Firestore yet, provide the starter templates
    if (quizzes.length === 0) {
      return DEFAULT_QUIZZES.map((q, idx) => ({
        id: `template-${idx + 1}`,
        isTemplate: true,
        ...q
      }));
    }
    
    return quizzes;
  } catch (error) {
    console.warn('Could not fetch from Firestore, using starter templates:', error);
    return DEFAULT_QUIZZES.map((q, idx) => ({
      id: `template-${idx + 1}`,
      isTemplate: true,
      ...q
    }));
  }
}

/**
 * Fetch a single quiz by ID
 */
export async function getQuizById(id) {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    throw error;
  }
}

/**
 * Create a new quiz template in Firestore
 */
export async function saveQuiz(quizData) {
  try {
    const cleanData = toFirestoreData({
      title: quizData.title || 'Untitled Quiz',
      isAiGenerated: !!quizData.isAiGenerated,
      questions: quizData.questions || [],
      updatedAt: new Date().toISOString()
    });
    
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), cleanData);
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw error;
  }
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(id, quizData) {
  try {
    const cleanData = toFirestoreData({
      title: quizData.title,
      isAiGenerated: !!quizData.isAiGenerated,
      questions: quizData.questions,
      updatedAt: new Date().toISOString()
    });
    
    const docRef = doc(db, QUIZZES_COLLECTION, id);
    await updateDoc(docRef, cleanData);
    return { id, ...cleanData };
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
}

/**
 * Delete a quiz by ID
 */
export async function deleteQuiz(id) {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
}

/**
 * Seed default sample quizzes if collection is empty
 */
export async function seedDefaultQuizzes() {
  try {
    const current = await getQuizzes();
    if (current.length === 0) {
      for (const sample of DEFAULT_QUIZZES) {
        await saveQuiz(sample);
      }
      return await getQuizzes();
    }
    return current;
  } catch (error) {
    console.warn('Could not auto-seed quizzes (check Firebase permissions or offline status):', error);
    return DEFAULT_QUIZZES.map((q, idx) => ({ id: `local-default-${idx}`, ...q }));
  }
}
