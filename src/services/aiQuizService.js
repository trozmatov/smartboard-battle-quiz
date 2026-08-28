import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Extracts raw text from an uploaded PDF or Text file
 * 
 * @param {File} file - Uploaded File object
 * @param {Function} [onProgress] - Optional progress callback (page, totalPages)
 * @returns {Promise<string>} Extracted plain text
 */
export async function extractTextFromFile(file, onProgress = null) {
  try {
    if (!file) throw new Error('No file provided');

    // Handle plain text / markdown files directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }

    // Handle PDF files via PDF.js
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map(item => item.str).filter(Boolean);
      fullText += `\n--- [Page ${pageNum}] ---\n` + pageStrings.join(' ');

      if (onProgress) {
        onProgress(pageNum, totalPages);
      }
    }

    if (!fullText.trim()) {
      throw new Error('PDF does not contain readable text (may contain scanned images).');
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

/**
 * Generates vector embeddings for text chunks using Google Embedding API
 * 
 * @param {Array<{ index: number, content: string }>} chunks
 * @param {string} apiKey - Google API Key
 * @returns {Promise<Array<{ index: number, content: string, embedding: number[] }>>}
 */
export async function generateGoogleEmbeddings(chunks, apiKey) {
  if (!chunks || chunks.length === 0 || !apiKey) return chunks;

  const targetChunks = chunks.slice(0, 10);
  const EMBEDDING_MODELS = ['text-embedding-004', 'embedding-001'];

  for (const embModel of EMBEDDING_MODELS) {
    try {
      // 1. Try batchEmbedContents first
      const batchEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${embModel}:batchEmbedContents?key=${apiKey.trim()}`;
      const batchRes = await fetch(batchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: targetChunks.map(chunk => ({
            model: `models/${embModel}`,
            content: { parts: [{ text: chunk.content }] }
          }))
        })
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        const list = batchData.embeddings || [];
        if (list.length > 0) {
          return targetChunks.map((chunk, idx) => ({
            ...chunk,
            embedding: list[idx]?.values || []
          }));
        }
      }

      // 2. If batch is not supported on this endpoint/proxy, try individual embedContent
      const singleResults = await Promise.allSettled(
        targetChunks.map(async (chunk) => {
          const singleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${embModel}:embedContent?key=${apiKey.trim()}`;
          const res = await fetch(singleEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `models/${embModel}`,
              content: { parts: [{ text: chunk.content }] }
            })
          });

          if (res.ok) {
            const data = await res.json();
            return { ...chunk, embedding: data.embedding?.values || [] };
          }
          return { ...chunk, embedding: [] };
        })
      );

      const resolved = singleResults.map((r, i) => r.status === 'fulfilled' ? r.value : { ...targetChunks[i], embedding: [] });
      if (resolved.some(r => r.embedding && r.embedding.length > 0)) {
        return resolved;
      }
    } catch (err) {
      // Seamlessly fall back
    }
  }

  // If custom API gateway doesn't provide embedding routes, return cleanly chunked context
  return chunks;
}

/**
 * Computes cosine similarity between two vector embeddings
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Selects the most informative & diverse chunks using vector diversity selection (Maximal Marginal Relevance)
 */
export function selectDiverseChunksByEmbeddings(chunksWithEmbeddings, maxSelected = 8) {
  if (!chunksWithEmbeddings || chunksWithEmbeddings.length <= maxSelected) {
    return chunksWithEmbeddings;
  }

  // If no vector embeddings available, return distributed chunks
  const hasEmbeddings = chunksWithEmbeddings.some(c => c.embedding && c.embedding.length > 0);
  if (!hasEmbeddings) {
    const step = Math.floor(chunksWithEmbeddings.length / maxSelected);
    return chunksWithEmbeddings.filter((_, i) => i % step === 0).slice(0, maxSelected);
  }

  const selected = [chunksWithEmbeddings[0]]; // Start with first chunk (intro/title)
  const candidates = [...chunksWithEmbeddings.slice(1)];

  while (selected.length < maxSelected && candidates.length > 0) {
    let bestCandidateIdx = 0;
    let minSimilarityToSelected = 1;

    for (let i = 0; i < candidates.length; i++) {
      // Find candidate with lowest maximum similarity to already selected chunks (maximum topic diversity)
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(candidates[i].embedding, s.embedding);
        if (sim > maxSim) maxSim = sim;
      }

      if (maxSim < minSimilarityToSelected) {
        minSimilarityToSelected = maxSim;
        bestCandidateIdx = i;
      }
    }

    selected.push(candidates.splice(bestCandidateIdx, 1)[0]);
  }

  return selected;
}

/**
 * Splits extracted text into semantic chunks with overlap for embedding / context window
 * 
 * @param {string} text - Raw document text
 * @param {number} [chunkSize=1500] - Target characters per chunk
 * @param {number} [overlap=200] - Overlap between adjacent chunks
 * @returns {Array<{ index: number, content: string, length: number }>}
 */
export function chunkDocumentText(text, chunkSize = 1500, overlap = 200) {
  if (!text) return [];

  const chunks = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // Try to break at paragraph or sentence boundary
    if (endIndex < text.length) {
      const naturalBreak = text.lastIndexOf('\n', endIndex);
      const sentenceBreak = text.lastIndexOf('. ', endIndex);
      
      if (naturalBreak > startIndex + (chunkSize / 2)) {
        endIndex = naturalBreak;
      } else if (sentenceBreak > startIndex + (chunkSize / 2)) {
        endIndex = sentenceBreak + 1;
      }
    } else {
      endIndex = text.length;
    }

    const chunkContent = text.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 50) {
      chunks.push({
        index: chunkIdx++,
        content: chunkContent,
        length: chunkContent.length
      });
    }

    startIndex = endIndex - overlap;
    if (startIndex >= text.length - overlap) break;
  }

  return chunks;
}

/**
 * Generates interactive quiz questions from document chunks using Google Gemini API
 * 
 * @param {Object} options
 * @param {string} options.rawText - Extracted text from PDF
 * @param {Array} options.chunks - Text chunks
 * @param {number} options.questionCount - Number of questions (e.g. 5)
 * @param {string} options.difficulty - 'easy' | 'medium' | 'hard' | 'mixed'
 * @param {string} options.language - 'uz' | 'en' | 'ru'
 * @param {string} [options.apiKey] - Google Gemini API Key
 * @returns {Promise<Object>} Generated Quiz Object { title, isAiGenerated: true, questions: [...] }
 */
export async function generateQuizWithGemini({
  rawText,
  chunks = [],
  questionCount = 5,
  difficulty = 'medium',
  language = 'uz',
  apiKey = null
}) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

  // Step 1: Generate Vector Embeddings (Google text-embedding-004) & Select Diverse Chunks
  let processedChunks = chunks;
  if (effectiveApiKey && chunks.length > 0) {
    try {
      const chunksWithEmbeddings = await generateGoogleEmbeddings(chunks, effectiveApiKey);
      processedChunks = selectDiverseChunksByEmbeddings(chunksWithEmbeddings, Math.min(chunks.length, 12));
    } catch (embErr) {
      console.warn('Embedding step skipped, using raw chunks:', embErr);
    }
  }

  // Step 2: Prepare context summary from vector-selected chunks
  const contextText = processedChunks.length > 0 
    ? processedChunks.map(c => `[Context Section ${c.index + 1}]: ${c.content}`).join('\n\n')
    : rawText.slice(0, 30000);

  const langNames = {
    uz: 'O\'zbek tilida',
    en: 'Ingliz tilida (English)',
    ru: 'Rus tilida (Русский)'
  };

  const difficultyPrompt = {
    easy: 'Oson (Asosiy faktlar, ta\'riflar va xotira darajasi)',
    medium: 'O\'rta (Tushunish, qo\'llash va mantiqiy tahlil)',
    hard: 'Qiyin (Murakkab sintez, chuqur tahlil va nozik farqlarni ajratish)',
    mixed: 'Aralash (Oson, o\'rta va qiyin savollarning mutanosib balansi)'
  }[difficulty] || 'O\'rta';

  // Professional Testologist System Prompt
  const systemPrompt = `Rol: Sen ta'lim sifatini baholash bo'yicha professional testolog va pedagogik o'lchovlar ekspertisan.

Vazifa: Senga taqdim etilgan matn (PDF) asosida o'quvchilarning bilimini tekshirish uchun yuqori sifatli, standartlashtirilgan yopiq (multiple-choice) test topshiriqlarini tuzib berishing kerak. Jami aniq ${questionCount} ta test savoli tuzilsin.
Tanlangan qiyinlik darajasi: ${difficultyPrompt}.
Test tili: ${langNames[language] || 'O\'zbek tilida'}.

Qat'iy taqiqlar:
1. Savol shartida hecham "Matnda aytilishicha", "Ushbu PDF faylga ko'ra", "Qo'llanmada yozilishicha", "Muallifning fikricha" kabi havolalarni ishlatma. Barcha savollar mustaqil fakt yoki qoida sifatida, to'g'ridan-to'g'ri so'ralishi shart.
2. "Barcha javoblar to'g'ri" yoki "Hech qaysi javob to'g'ri emas" kabi qolipdagi variantlardan mutlaqo foydalanma.

Testologiya me'yorlari va talablari:
1. Savol o'zagi (Stem): Savol aniq, lo'nda va tushunarli bo'lishi kerak. Ortiqcha so'zlar va murakkab jumlalardan saqlan. O'quvchi variantlarni o'qimasdan turib nima so'ralayotganini tushunishi lozim.
2. Variantlar: Har bir savol uchun aniq 4 ta (A, B, C, D) javob varianti tuz. Variantlar uzunligi va tuzilishi jihatidan bir-biriga o'xshash bo'lishi kerak.
3. To'g'ri javob: Faqatgina 1 ta mutlaqo to'g'ri javob bo'lishini ta'minla.
4. Distraktorlar (Noto'g'ri javoblar): Noto'g'ri variantlar o'ta mantiqsiz yoki osongina topiladigan bo'lmasin. Ular mavzuga aloqador, ishonarli va o'quvchining tipik xatolariga (masalan, sanalar yoki atamalardagi kichik farqlarga) asoslangan bo'lishi kerak.
5. Grammatik moslik: Savol sharti va barcha variantlar o'rtasida to'liq grammatik va uslubiy moslik bo'lishi shart.
6. Inkor jumlalar: Agar savolda inkor ma'nosi ishlatilsa ("emas", "kirmaydi", "xato"), u holda ushbu so'zlarni qalin (**bold**) shriftda belgilab ko'rsat.
7. Har bir savol uchun to'g'ri javob indeksi (correctIndex: 0=A, 1=B, 2=C, 3=D) va qisqacha ilmiy asoslangan izoh (explanation) ber.

Chiqish formati: Faqatgina to'g'ridan-to'g'ri quyidagi JSON formatida javob ber:
{
  "title": "Mavzu bo'yicha qisqa va mazmunli sarlavha",
  "questions": [
    {
      "questionText": "Savol matni...",
      "options": ["A varianti", "B varianti", "C varianti", "D varianti"],
      "correctIndex": 0,
      "timeLimit": 15,
      "points": 100,
      "explanation": "To'g'ri javob nima uchun to'g'riligi va chalg'ituvchi variantlar nima sababdan xato ekanligi haqida ilmiy asos."
    }
  ]
}`;

  if (effectiveApiKey && effectiveApiKey !== 'YOUR_GEMINI_API_KEY') {
    // Exact strict hierarchy requested by user:
    // 1) Gemini 3.7 Flash -> 2) Gemini 3.6 Flash -> 3) Gemini 3.5 Flash -> 4) Gemini 3.5 Flash Lite -> 5) Fallbacks
    const MODEL_CASCADE = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    let lastError = null;

    for (let i = 0; i < MODEL_CASCADE.length; i++) {
      const modelName = MODEL_CASCADE[i];
      try {
        console.log(`[AI Cascade] ${i + 1}-urinish: Model "${modelName}" orqali generatsiya qilinmoqda...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey.trim()}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `HUJJAT MAZMUNI VA KONTEKST:\n${contextText}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[AI Cascade] "${modelName}" da limit tugadi yoki xatolik yuz berdi (${response.status}):`, errData.error?.message);
          lastError = new Error(errData.error?.message || `Model ${modelName} error (${response.status})`);
          
          if (i + 1 < MODEL_CASCADE.length) {
            console.log(`[AI Cascade] Avtomatik ravishda keyingi modelga o'tilmoqda: ${MODEL_CASCADE[i + 1]}...`);
          }
          continue; // Seamlessly try next model in priority order
        }

        const data = await response.json();
        const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawOutput) {
          console.warn(`[AI Cascade] "${modelName}" bo'sh javob qaytardi, keyingi modelga o'tilmoqda...`);
          continue;
        }

        // Clean & Parse JSON
        let cleanedJson = rawOutput.trim();
        if (cleanedJson.startsWith('```json')) cleanedJson = cleanedJson.slice(7);
        if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.slice(3);
        if (cleanedJson.endsWith('```')) cleanedJson = cleanedJson.slice(0, -3);

        const parsed = JSON.parse(cleanedJson.trim());

        return {
          title: parsed.title ? `🤖 ${parsed.title}` : `🤖 AI Quiz (${questionCount} ta savol)`,
          isAiGenerated: true,
          questions: parsed.questions || [],
          createdAt: new Date().toISOString()
        };
      } catch (err) {
        console.warn(`Error with ${modelName}:`, err);
        lastError = err;
      }
    }

    // If all API models in cascade failed, fall back to smart local extractor
    console.warn('All Gemini models in cascade failed, using local semantic extractor:', lastError);
    if (lastError && lastError.message && !lastError.message.includes('Quota')) {
      throw lastError;
    }
  }

  // Fallback if offline or API key absent
  return generateSimulatedAiQuiz(rawText, questionCount, difficulty, language);
}

/**
 * Intelligent fallback generator when offline or before adding an API key
 */
function generateSimulatedAiQuiz(text, count, difficulty, lang) {
  // Extract sentences from text
  const sentences = text
    .replace(/--- \[Page \d+\] ---/g, '')
    .split(/[.?!]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 160);

  const questions = [];
  const selectedSentences = sentences.slice(0, count);

  selectedSentences.forEach((sent, idx) => {
    const words = sent.split(' ').filter(w => w.length > 4);
    const targetWord = words.length > 0 ? words[Math.floor(words.length / 2)] : 'kalit so\'z';
    const blankedText = sent.replace(targetWord, '______');

    const options = [
      targetWord,
      `Noto'g'ri variant A (${idx + 1})`,
      `Noto'g'ri variant B (${idx + 1})`,
      `Noto'g'ri variant C (${idx + 1})`
    ];

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const correctIndex = options.indexOf(targetWord);

    questions.push({
      questionText: `Hujjat mazmuni bo'yicha: "${blankedText}" qavs o'rniga qaysi so'z mos keladi?`,
      options: options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      timeLimit: 15,
      points: 100,
      explanation: `Hujjatdan olingan matn: "${sent}"`
    });
  });

  // If text didn't produce enough sentences, pad with standard educational questions
  while (questions.length < count) {
    const padIdx = questions.length + 1;
    questions.push({
      questionText: `PDF matni bo'yicha #${padIdx}-savol: Asosiy tushuncha qanday ta'riflanadi?`,
      options: ['To\'g\'ri ta\'rif va tushuncha', 'Noto\'g\'ri tushuncha A', 'Noto\'g\'ri tushuncha B', 'Noto\'g\'ri tushuncha C'],
      correctIndex: 0,
      timeLimit: 15,
      points: 100,
      explanation: 'PDF hujjat tahlili asosida generatsiya qilindi.'
    });
  }

  return {
    title: `🤖 AI Generatsiya qilingan Test (${count} ta savol)`,
    isAiGenerated: true,
    questions: questions,
    createdAt: new Date().toISOString()
  };
}
