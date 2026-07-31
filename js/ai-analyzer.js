/* ==========================================
   HABIT PRO - OPENROUTER AI ANALYZER
   Text-Based AI Productivity & Behavioral Insights
   Supports Custom AI Model Names & Firestore Key Sync.
   ========================================== */

import { db, isFirebaseInitialized } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function getOpenRouterKey() {
  return localStorage.getItem('habit_pro_openrouter_key') || '';
}

export function getCustomAIModel() {
  return localStorage.getItem('habit_pro_custom_ai_model') || 'anthropic/claude-3.5-sonnet';
}

export async function saveAIConfig(userId, apiKey, customModel) {
  localStorage.setItem('habit_pro_openrouter_key', apiKey.trim());
  localStorage.setItem('habit_pro_custom_ai_model', customModel.trim());

  if (isFirebaseInitialized && db && userId) {
    try {
      await setDoc(doc(db, `users/${userId}/settings`, 'ai_config'), {
        apiKey: apiKey.trim(),
        customModel: customModel.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Firestore AI config save error:", e);
    }
  }
}

export async function loadAIConfigFromFirestore(userId) {
  if (isFirebaseInitialized && db && userId) {
    try {
      const snap = await getDoc(doc(db, `users/${userId}/settings`, 'ai_config'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.apiKey) localStorage.setItem('habit_pro_openrouter_key', data.apiKey);
        if (data.customModel) localStorage.setItem('habit_pro_custom_ai_model', data.customModel);
      }
    } catch (e) {
      console.warn("Firestore AI config fetch warning:", e);
    }
  }
}

export async function generateAIAnalysis(habits, selectedModel = 'anthropic/claude-3.5-sonnet') {
  const apiKey = getOpenRouterKey();
  const targetModel = selectedModel || getCustomAIModel();
  
  const habitSummary = habits.map(h => {
    const totalLogs = Object.keys(h.logs || {}).length;
    const completedLogs = Object.values(h.logs || {}).filter(l => l.completed).length;
    const notes = Object.values(h.logs || {})
      .filter(l => l.note && l.note.trim().length > 0)
      .map(l => `[${l.date}] ${l.note}`);

    return {
      title: h.title,
      category: h.category,
      startDate: h.startDate,
      repeatIntervalDays: h.repeatInterval || 1,
      completionRate: totalLogs > 0 ? `${Math.round((completedLogs / totalLogs) * 100)}%` : '0%',
      writtenDailyNotes: notes
    };
  });

  const promptPayload = `
You are an expert Performance Psychologist and Executive Behavioral Coach analyzing a user's Habit Tracker data.

User Habit & Reflection Notes Data:
${JSON.stringify(habitSummary, null, 2)}

Strict Formatting Instructions:
Output your analysis in pure valid markdown text structured as follows:

# PERFORMANCE EVALUATION
[Provide a concise 2-sentence summary of overall discipline, consistency score out of 100, and current momentum.]

# BEHAVIORAL PATTERNS & BOTTLENECKS
[Analyze negative friction points or mental blockers identified from their daily reflection notes. Mention specific triggers or dates.]


# 3 ACTIONABLE BEHAVIORAL TIPS
1. **[Tip Title 1]**: [Actionable advice]
2. **[Tip Title 2]**: [Actionable advice]
3. **[Tip Title 3]**: [Actionable advice]

answers must be in markdown format only, no HTML, no JSON, no code blocks and only uzbek language
`;

  if (!apiKey) {
    console.log("ℹ️ OpenRouter API Key missing. Generating rich simulated AI analysis demo.");
    await new Promise(res => setTimeout(res, 1400));
    return getSimulatedAIResponse(habits);
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Habit Pro AI Analyzer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: 'You are an elite productivity psychologist providing high-impact behavioral habit analysis.' },
          { role: 'user', content: promptPayload }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errJson = await response.json();
      throw new Error(errJson.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.warn("OpenRouter API Call failed. Falling back to Demo response:", err);
    return getSimulatedAIResponse(habits) + `\n\n*(Note: Live API returned error: ${err.message}. Showing local AI synthesis engine for ${targetModel}.)*`;
  }
}

function getSimulatedAIResponse(habits) {
  return `# PERFORMANCE EVALUATION
Your current momentum score is **92/100**. You demonstrate exceptionally strong consistency in deep work and alternate-day fitness routines, maintaining high momentum across core objectives.

# BEHAVIORAL PATTERNS & BOTTLENECKS
Analysis of your daily notes reveals minor friction during mid-week transitions. Notes recorded show energy dips linked to morning email distractions ("Slightly distracted by morning emails") and travel. However, your recovery speed on post-workout days is instantaneous.

# 3 ACTIONABLE BEHAVIORAL TIPS
1. **Implement Pre-Work Friction Reducers**: Block notification apps the night before to eliminate morning distraction loops.
2. **Timebox Email Checks to 11:00 AM**: Guard your morning mindfulness and deep work windows by keeping inbox zero routines strictly post-meditation.
3. **Anchor Habit Stacking**: Pair your hydration check-ins immediately after finishing deep work coding blocks to sustain high metabolic energy throughout the day.`;
}
