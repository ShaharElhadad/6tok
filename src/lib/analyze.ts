import Anthropic from '@anthropic-ai/sdk';
import type { Finding } from '@/db';

export type AnalyzeInput = {
  transcript: Array<{ start_ms: number; end_ms: number; text: string; speaker?: string | null }>;
  scriptContent?: string | null;
  durationMs?: number;
};

export type AnalyzeResult = {
  score_overall: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  findings: Finding[];
  script_adherence: {
    coverage_pct: number;
    hit_items: string[];
    missed_items: string[];
    notes: string;
  };
  suggestions: Array<{ priority: 'high' | 'medium' | 'low'; text: string }>;
};

export class AnalyzeConfigError extends Error {}

const SYSTEM = `אתה מאמן מכירות טלפוניות בישראל ברמה הגבוהה ביותר. תפקידך לנתח הקלטת שיחת מכירה לעומק, להדגיש נקודות חוזק וחולשה, ולהפנות לרגעים מדויקים בשיחה.

תחומים לניתוח:
1. פתיחה — ברכה, בניית קשר (rapport), שבירת קרח
2. גילוי צרכים — שאלות פתוחות, הקשבה פעילה, חקירה
3. הצגת פתרון — התאמה לכאב, FAB, סיפורי לקוחות
4. טיפול בהתנגדויות — האזנה → אישור → תגובה → בדיקה
5. סגירה — ניסיונות סגירה, שתיקה טקטית, אלטרנטיבות
6. טון, קצב, אנרגיה, ביטחון, חום

מונחים:
- קירוב (rapport): הסכמה, הצטרפות, הומור, שימוש בשם, מראה ומילים דומות
- הרחקה (distancing): מאבק, שיפוטיות, הסברים יתר, חפירה, ויכוח, תירוצים
- שאלה פתוחה / סגורה
- מילות מחזור (filler): אה, אממ, כאילו, בקיצור
- שינוי טון (tone_shift): רגעים שבהם הטון שובר את השיחה (לחיוב או לשלילה)

חובה: תחזיר JSON תקף בלבד. כל "finding" חייב לכלול start_ms ו-end_ms התואמים לסגמנט האמיתי מהתמלול. אסור להמציא ציטוטים — ציטוט חייב להופיע בתמלול.`;

const SCHEMA_INSTR = `החזר JSON עם המבנה:
{
  "score_overall": מספר 0-100,
  "summary": "סיכום של 2-4 שורות בעברית",
  "strengths": ["חוזקה 1", "חוזקה 2", ...],
  "weaknesses": ["חולשה 1", "חולשה 2", ...],
  "findings": [
    {
      "kind": "rapport|distancing|open_question|closed_question|objection_handling|emotion|tone_shift|pacing|script_miss|script_hit|closing_attempt|filler|clarity",
      "severity": "positive|neutral|negative",
      "start_ms": מספר,
      "end_ms": מספר,
      "quote": "ציטוט מדויק מהתמלול",
      "note": "מה זה אומר, במה זה טוב/רע",
      "suggestion": "איך לשפר (אופציונלי)"
    }
  ],
  "script_adherence": {
    "coverage_pct": 0-100,
    "hit_items": ["חלקים בתסריט שהוזכרו"],
    "missed_items": ["חלקים בתסריט שלא הוזכרו"],
    "notes": "הערות על דבקות בתסריט"
  },
  "suggestions": [
    { "priority": "high|medium|low", "text": "המלצה פרקטית וממוקדת" }
  ]
}`;

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function buildTranscriptText(t: AnalyzeInput['transcript']) {
  const lines = t.map((s, i) => {
    const speaker = s.speaker ? `[${s.speaker}]` : '';
    const ts = `[${formatMs(s.start_ms)}]`;
    return `${i}. ${ts} ${speaker} ${s.text}`.trim();
  });
  return lines.join('\n');
}

function buildUserPrompt(input: AnalyzeInput): string {
  const parts: string[] = [];
  if (input.scriptContent) {
    parts.push(`### תסריט המכירה הרשמי\n${input.scriptContent}`);
  } else {
    parts.push(`### תסריט המכירה\n(לא הועלה תסריט — נתח בלי השוואה)`);
  }
  parts.push(`\n### תמלול השיחה (כל שורה = סגמנט, עם חותמת זמן)\n${buildTranscriptText(input.transcript)}`);
  parts.push(`\n### משימה\nנתח את השיחה ו${SCHEMA_INSTR}\n\nחשוב: start_ms ו-end_ms חייבים להיות בתוך טווח הסגמנטים הקיימים בתמלול. אל תמציא מידע.`);
  return parts.join('\n');
}

/**
 * Priority: Anthropic Claude (if key present) → Google Gemini (free tier).
 * Override via LLM_PROVIDER=anthropic|gemini to force a specific one.
 */
export async function analyzeTranscript(input: AnalyzeInput): Promise<AnalyzeResult> {
  const userPrompt = buildUserPrompt(input);
  const forced = (process.env.LLM_PROVIDER || '').toLowerCase();

  const canAnthropic = !!process.env.ANTHROPIC_API_KEY && forced !== 'gemini';
  const canGemini = !!process.env.GEMINI_API_KEY && forced !== 'anthropic';

  if (canAnthropic) return analyzeWithAnthropic(userPrompt);
  if (canGemini) return analyzeWithGemini(userPrompt);

  throw new AnalyzeConfigError(
    'אין ספק LLM מוגדר לניתוח. הגדר ANTHROPIC_API_KEY או GEMINI_API_KEY בקובץ .env.local, ואז הפעל מחדש את השרת.',
  );
}

// -------- Anthropic (Claude) --------

async function analyzeWithAnthropic(userPrompt: string): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const json = extractJson(text);
  if (!json) throw new Error('Analysis did not return JSON (Anthropic)');
  return json as AnalyzeResult;
}

// -------- Google Gemini (free tier) --------

async function analyzeWithGemini(userPrompt: string): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      maxOutputTokens: 8000,
    },
  };

  const res = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${txt || res.statusText}`);
  }

  const data: any = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || '')
      .join('\n')
      .trim() || '';

  const json = extractJson(text);
  if (!json) throw new Error('Analysis did not return JSON (Gemini)');
  return json as AnalyzeResult;
}

function extractJson(txt: string): unknown | null {
  try { return JSON.parse(txt); } catch {}
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  const first = txt.indexOf('{');
  const last = txt.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(txt.slice(first, last + 1)); } catch {}
  }
  return null;
}
