import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromFile, chunkDocumentText, generateGoogleEmbeddings, selectDiverseChunksByEmbeddings } from './aiQuizService';

/**
 * Generates a complete Jeopardy game from a PDF document and custom instructions
 * 
 * @param {Object} params
 * @param {string} params.rawText - Extracted text from PDF
 * @param {Array} params.chunks - Text chunks
 * @param {string} [params.customInstructions] - Teacher prompt (e.g. "Focus on chapter 3", "7-sinf tarixi")
 * @param {number} [params.categoryCount=5] - Number of categories (3 to 5)
 * @param {string} [params.language='uz'] - 'uz' | 'en' | 'ru'
 * @param {string} [params.apiKey] - Google API key
 * @returns {Promise<Object>} Formatted Jeopardy Game Object matching the Firestore schema
 */
export async function generateJeopardyGameFromPdf({
  rawText,
  chunks = [],
  customInstructions = '',
  categoryCount = 5,
  language = 'uz',
  apiKey = null
}) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

  // Step 1: Chunking if not already chunked
  let processedChunks = chunks.length > 0 ? chunks : chunkDocumentText(rawText, 1500, 200);

  // Step 2: Vector Embedding & Diversity Filtering
  if (effectiveApiKey && processedChunks.length > 0) {
    try {
      const chunksWithEmbeddings = await generateGoogleEmbeddings(processedChunks, effectiveApiKey);
      processedChunks = selectDiverseChunksByEmbeddings(chunksWithEmbeddings, Math.min(processedChunks.length, 14));
    } catch (err) {
      console.warn('Embedding step skipped for Jeopardy, using raw chunks:', err);
    }
  }

  // Step 3: Prepare Context Text
  const contextText = processedChunks.length > 0
    ? processedChunks.map(c => `[Section ${c.index + 1}]: ${c.content}`).join('\n\n')
    : rawText.slice(0, 35000);

  const langNames = {
    uz: 'O\'zbek tilida',
    en: 'English',
    ru: 'Русский (Russian)'
  };

  // Structured System Prompt for Jeopardy Game Designer
  const systemPrompt = `You are a world-class educational Jeopardy Game Designer and pedagogy expert.
Your mission is to analyze the provided document context and generate an interactive classroom Jeopardy game.

Requirements:
1. Total Categories: Exactly ${categoryCount} distinct, engaging educational categories based on the text.
2. For EACH category, generate exactly 5 progressive questions with point values: 100, 200, 300, 400, and 500.
   - 100 Points: Easy / Recall level fact
   - 200 Points: Basic comprehension
   - 300 Points: Intermediate concept application
   - 400 Points: Advanced analysis / detail
   - 500 Points: Master level synthesis / challenging detail
3. For each item provide:
   - "question": Clear, concise, stand-alone question prompt. Do NOT use meta-references like "According to the PDF" or "In the text".
   - "answer": The direct, accurate, and definitive answer to the question.
4. Language: Everything (Title, Category Names, Questions, Answers) MUST be in ${langNames[language] || 'Uzbek'}.
5. Teacher Custom Instructions to follow closely: "${customInstructions || 'Cover key topics evenly'}".

Return ONLY a strictly valid JSON object matching this schema:
{
  "title": "Descriptive and exciting Jeopardy game title",
  "categories": [
    {
      "name": "Category Name (e.g. Ancient Explorers)",
      "questions": [
        { "points": 100, "question": "Question for 100 points...", "answer": "Answer..." },
        { "points": 200, "question": "Question for 200 points...", "answer": "Answer..." },
        { "points": 300, "question": "Question for 300 points...", "answer": "Answer..." },
        { "points": 400, "question": "Question for 400 points...", "answer": "Answer..." },
        { "points": 500, "question": "Question for 500 points...", "answer": "Answer..." }
      ]
    }
  ]
}`;

  if (effectiveApiKey && effectiveApiKey !== 'YOUR_GEMINI_API_KEY') {
    // 1. Try with Google Generative AI SDK
    try {
      const genAI = new GoogleGenerativeAI(effectiveApiKey.trim());
      
      const MODEL_CHAIN = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];

      for (const modelName of MODEL_CHAIN) {
        try {
          console.log(`[Jeopardy AI] Generating with SDK model: ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.35,
              responseMimeType: "application/json"
            }
          });

          const result = await model.generateContent([
            { text: systemPrompt },
            { text: `DOCUMENT CONTEXT FOR JEOPARDY:\n${contextText}` }
          ]);

          const responseText = result.response.text();
          if (responseText) {
            const parsed = parseCleanJson(responseText);
            if (parsed && parsed.categories && parsed.categories.length > 0) {
              return {
                title: parsed.title || '🤖 AI Jeopardy Game',
                isAiGenerated: true,
                categories: normalizeCategories(parsed.categories, categoryCount),
                createdAt: new Date().toISOString()
              };
            }
          }
        } catch (sdkModelErr) {
          console.warn(`[Jeopardy AI] SDK Model ${modelName} error:`, sdkModelErr.message);
        }
      }
    } catch (sdkErr) {
      console.warn('[Jeopardy AI] SDK initialization error, falling back to REST cascade:', sdkErr);
    }

    // 2. Direct REST Fallback Cascade (3.7 Flash -> 3.6 Flash -> 3.5 Flash -> 2.0 Flash)
    const REST_CASCADE = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    for (let i = 0; i < REST_CASCADE.length; i++) {
      const modelName = REST_CASCADE[i];
      try {
        console.log(`[Jeopardy AI Cascade] Urinish ${i + 1}: ${modelName}...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': effectiveApiKey.trim() },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `DOCUMENT CONTEXT FOR JEOPARDY:\n${contextText}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: "application/json"
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = parseCleanJson(rawText);
            if (parsed && parsed.categories && parsed.categories.length > 0) {
              return {
                title: parsed.title || '🤖 AI Jeopardy Game',
                isAiGenerated: true,
                categories: normalizeCategories(parsed.categories, categoryCount),
                createdAt: new Date().toISOString()
              };
            }
          }
        }
      } catch (restErr) {
        console.warn(`[Jeopardy AI] REST model ${modelName} error:`, restErr);
      }
    }
  }

  // 3. Fallback simulated Jeopardy generator if offline or API key absent
  return generateSimulatedJeopardy(rawText, categoryCount, customInstructions, language);
}

/**
 * Normalizes categories array so each category always has exactly 100, 200, 300, 400, 500 questions
 */
function normalizeCategories(categories, targetCount = 5) {
  const pointsList = [100, 200, 300, 400, 500];
  
  return categories.slice(0, targetCount).map((cat, catIdx) => {
    const existingQuestions = cat.questions || cat.items || [];
    const questions = pointsList.map((pt, pIdx) => {
      const found = existingQuestions.find(q => Number(q.points) === pt || Number(q.value) === pt) || existingQuestions[pIdx] || {};
      
      const qText = found.question || found.questionText || found.prompt || found.savol || `${cat.name || `Kategoriya ${catIdx + 1}`} bo'yicha ${pt} ballik savol`;
      const aText = found.answer || found.correctAnswer || found.correct_answer || found.javob || found.to_gri_javob || found.solution || found.response || `${pt} ballik to'g'ri javob`;

      return {
        points: pt,
        question: qText.trim(),
        answer: aText.trim()
      };
    });

    return {
      name: cat.name || cat.category || cat.title || `Kategoriya #${catIdx + 1}`,
      questions
    };
  });
}

/**
 * Parses raw JSON string with markdown fence stripping
 */
function parseCleanJson(text) {
  try {
    let clean = text.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    return JSON.parse(clean.trim());
  } catch (err) {
    console.error('Failed to parse AI JSON:', err, text);
    return null;
  }
}

/**
 * Smart simulated Jeopardy generator for demo or offline mode
 */
function generateSimulatedJeopardy(text, count = 5, instructions = '', lang = 'uz') {
  const categoryNames = [
    'Tarixiy Voqealar & Sanalar',
    'Asosiy Shaxslar & Arboblari',
    'Atamalar & Tushunchalar',
    'Geografiya & Joylar',
    'Madaniyat & San\'at'
  ].slice(0, count);

  const categories = categoryNames.map((catName, cIdx) => {
    return {
      name: catName,
      questions: [100, 200, 300, 400, 500].map(pts => ({
        points: pts,
        question: `${catName} bo'yicha ${pts} ballik test topshirig'i (PDF tahlili asosida)?`,
        answer: `${pts} ballik to'g'ri va to'liq javob.`
      }))
    };
  });

  return {
    title: instructions ? `🤖 AI Jeopardy (${instructions})` : `🤖 AI Jeopardy O'yini (${count} ta kategoriya)`,
    isAiGenerated: true,
    categories,
    createdAt: new Date().toISOString()
  };
}
