import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './config';
import { toFirestoreData, generatePin, shuffleQuestionsAndOptions } from '../utils/helpers';

const ACTIVE_GAMES_COLLECTION = 'active_games';

/**
 * Creates a new live game session in 'active_games'
 * 
 * @param {Object} quiz - The quiz data object containing questions and title
 * @param {string} [customPin] - Optional 6-digit PIN override
 * @returns {Promise<Object>} The created active game object with ID and PIN
 */
export async function createGameSession(quiz, customPin = null, p1Name = 'Player 1', p2Name = 'Player 2') {
  try {
    const pin = customPin || generatePin();
    const baseQuestions = quiz.questions || [];
    
    // Generate independently randomized question order & option positions for both players
    const p1Questions = shuffleQuestionsAndOptions(baseQuestions);
    const p2Questions = shuffleQuestionsAndOptions(baseQuestions);
    
    // Structure game session document
    const gameSessionData = {
      pin: pin,
      quizId: quiz.id || 'custom-quiz',
      quizTitle: quiz.title || 'Live Quiz Battle',
      status: 'in_progress', // 'waiting' | 'in_progress' | 'finished'
      currentQuestionIndex: 0,
      roundEnded: false,
      questions: baseQuestions,
      p1Questions: p1Questions,
      p2Questions: p2Questions,
      p1: {
        name: p1Name || 'Player 1',
        score: 0,
        answeredCurrent: false,
        selectedAnswer: null,
        isCorrect: null,
        lastPointsWon: 0
      },
      p2: {
        name: p2Name || 'Player 2',
        score: 0,
        answeredCurrent: false,
        selectedAnswer: null,
        isCorrect: null,
        lastPointsWon: 0
      },
      createdAt: new Date().toISOString()
    };

    const cleanData = toFirestoreData(gameSessionData);
    const docRef = await addDoc(collection(db, ACTIVE_GAMES_COLLECTION), cleanData);

    return {
      id: docRef.id,
      ...cleanData
    };
  } catch (error) {
    console.error('Error creating game session:', error);
    throw error;
  }
}

/**
 * Find an active game by its 6-digit PIN
 */
export async function findGameByPin(pin) {
  try {
    const cleanPin = pin.trim();
    const q = query(
      collection(db, ACTIVE_GAMES_COLLECTION),
      where('pin', '==', cleanPin)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Get the most recent active game matching the PIN
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error('Error finding game by PIN:', error);
    throw error;
  }
}

/**
 * Join an active game by PIN and assign player slot ('p1' or 'p2')
 */
export async function joinGameByPin(pin, playerName) {
  try {
    const game = await findGameByPin(pin);
    if (!game) {
      throw new Error('Game with PIN ' + pin + ' not found. Please verify the 6-digit PIN.');
    }

    if (game.status === 'finished') {
      throw new Error('This game session has already finished.');
    }

    const docRef = doc(db, ACTIVE_GAMES_COLLECTION, game.id);
    let assignedRole = null;

    // Check availability of player slots
    if (!game.p1.name || game.p1.name === 'Player 1') {
      assignedRole = 'p1';
      await updateDoc(docRef, {
        'p1.name': playerName
      });
    } else if (!game.p2.name || game.p2.name === 'Player 2') {
      assignedRole = 'p2';
      await updateDoc(docRef, {
        'p2.name': playerName
      });
    } else {
      // Both slots occupied, join as spectator or local smartboard player
      assignedRole = 'spectator';
    }

    return {
      gameId: game.id,
      role: assignedRole,
      game
    };
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
}

/**
 * Subscribe to realtime updates for a specific game session
 * 
 * @param {string} gameId - Document ID in 'active_games'
 * @param {Function} callback - Callback function receiving current game snapshot
 * @returns {Function} Unsubscribe function
 */
export function subscribeToGame(gameId, callback) {
  const docRef = doc(db, ACTIVE_GAMES_COLLECTION, gameId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data()
      });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Realtime subscription error:', error);
  });
}

/**
 * Submits player answer and updates player's score and answered state
 */
export async function submitPlayerAnswer(gameId, playerKey, selectedIndex, isCorrect, pointsEarned) {
  try {
    const docRef = doc(db, ACTIVE_GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const game = docSnap.data();
    const currentScore = game[playerKey]?.score || 0;
    const newScore = isCorrect ? currentScore + pointsEarned : currentScore;

    const updatePayload = {
      [`${playerKey}.answeredCurrent`]: true,
      [`${playerKey}.selectedAnswer`]: selectedIndex,
      [`${playerKey}.isCorrect`]: isCorrect,
      [`${playerKey}.score`]: newScore,
      [`${playerKey}.lastPointsWon`]: isCorrect ? pointsEarned : 0
    };

    // Check if other player has already answered
    const otherKey = playerKey === 'p1' ? 'p2' : 'p1';
    if (game[otherKey]?.answeredCurrent) {
      updatePayload.roundEnded = true;
    }

    await updateDoc(docRef, updatePayload);
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
}

/**
 * Advances the game to the next question or finishes the game
 */
export async function advanceToNextQuestion(gameId, nextIndex, totalQuestions) {
  try {
    const docRef = doc(db, ACTIVE_GAMES_COLLECTION, gameId);
    
    if (nextIndex >= totalQuestions) {
      // Game Over
      await updateDoc(docRef, {
        status: 'finished',
        roundEnded: true
      });
    } else {
      // Next Round
      await updateDoc(docRef, {
        currentQuestionIndex: nextIndex,
        roundEnded: false,
        'p1.answeredCurrent': false,
        'p1.selectedAnswer': null,
        'p1.isCorrect': null,
        'p1.lastPointsWon': 0,
        'p2.answeredCurrent': false,
        'p2.selectedAnswer': null,
        'p2.isCorrect': null,
        'p2.lastPointsWon': 0
      });
    }
  } catch (error) {
    console.error('Error advancing question:', error);
    throw error;
  }
}

/**
 * Restart the game with the same questions
 */
export async function restartGame(gameId) {
  try {
    const docRef = doc(db, ACTIVE_GAMES_COLLECTION, gameId);
    await updateDoc(docRef, {
      status: 'in_progress',
      currentQuestionIndex: 0,
      roundEnded: false,
      'p1.score': 0,
      'p1.answeredCurrent': false,
      'p1.selectedAnswer': null,
      'p1.isCorrect': null,
      'p1.lastPointsWon': 0,
      'p2.score': 0,
      'p2.answeredCurrent': false,
      'p2.selectedAnswer': null,
      'p2.isCorrect': null,
      'p2.lastPointsWon': 0
    });
  } catch (error) {
    console.error('Error restarting game:', error);
    throw error;
  }
}
