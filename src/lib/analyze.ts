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

function buildTranscriptText(
  t: AnalyzeInput['transcript'],
): { indexed: string; lookup: Map<number, { start: number; end: number }> } {
  const lookup = new Map<number, { start: number; end: number }>();
  const lines = t.map((s, i) => {
    lookup.set(i, { start: s.start_ms, end: s.end_ms });
    const speaker = s.speaker ? `[${s.speaker}]` : '';
    const ts = `[${formatMs(s.start_ms)}]`;
    return `${i}. ${ts} ${speaker} ${s.text}`.trim();
  });
  return { indexed: lines.join('\n'), lookup };
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export async function analyzeTranscript(input: AnalyzeInput): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

  const { indexed } = buildTranscriptText(input.transcript);

  const userParts: string[] = [];
  if (input.scriptContent) {
    userParts.push(`### תסריט המכירה הרשמי\n${input.scriptContent}\n`);
  } else {
    userParts.push(`### תסריט המכירה\n(לא הועלה תסריט — נתח בלי השוואה)`);
  }
  userParts.push(`\n### תמלול השיחה (כל שורה = סגמנט, עם חותמת זמן)\n${indexed}`);
  userParts.push(`\n### משימה\nנתח את השיחה ו${SCHEMA_INSTR}\n\nחשוב: start_ms ו-end_ms חייבים להיות בתוך טווח הסגמנטים הקיימים בתמלול. אל תמציא מידע.`);

  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: userParts.join('\n'),
      },
    ],
  });

  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const json = extractJson(text);
  if (!json) throw new Error('Analysis did not return JSON');
  return json as AnalyzeResult;
}

function extractJson(txt: string): unknown | null {
  // Try direct parse
  try {
    return JSON.parse(txt);
  } catch {}
  // Try fenced ```json ... ```
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {}
  }
  // Find first { ... last }
  const first = txt.indexOf('{');
  const last = txt.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(txt.slice(first, last + 1));
    } catch {}
  }
  return null;
}
