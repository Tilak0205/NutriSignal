type QuestionnaireInput = {
  emotionalState: string;
  dayContext: string;
  energy: string;
  occasion: string;
  cravings: string;
  dietaryPreference: string;
};

export type AnalysisOutput = {
  sentiment: "positive" | "neutral" | "negative";
  keyInsights: string[];
  interactionTips: string[];
  serviceApproach: string;
};

function extractJson(text: string): AnalysisOutput | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as AnalysisOutput;
    if (!parsed.sentiment || !parsed.keyInsights || !parsed.interactionTips || !parsed.serviceApproach) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function fallbackAnalysis(input: QuestionnaireInput): AnalysisOutput {
  const negStates = new Set(["drained", "restless"]);
  const negDays = new Set(["tough-day", "long-day"]);
  const posDays = new Set(["great-day", "special-day"]);
  const isNegative =
    negStates.has(input.emotionalState) ||
    negDays.has(input.dayContext) ||
    input.energy === "low";

  const isPositive =
    !isNegative &&
    (posDays.has(input.dayContext) || input.energy === "high" || ["cheerful", "calm"].includes(input.emotionalState));

  const sentiment: "positive" | "neutral" | "negative" = isNegative
    ? "negative"
    : isPositive
      ? "positive"
      : "neutral";

  return {
    sentiment,
    keyInsights: [
      `Current state: ${input.emotionalState}. Day: ${input.dayContext}. Energy: ${input.energy}.`,
      `Craving style: ${input.cravings}. Occasion: ${input.occasion}.`,
      `Diet: ${input.dietaryPreference}.`,
    ],
    interactionTips:
      sentiment === "negative"
        ? [
            "Greet warmly and read their pace; avoid rushing the table.",
            "Favor clear menu suggestions and calming options when recommending dishes.",
            "Acknowledge their state subtly without prying; keep the tone low-pressure.",
          ]
        : sentiment === "positive"
          ? [
              "Match a friendly, upbeat tone; celebrate their occasion if appropriate.",
              "Offer confident recommendations and highlight specials that fit their craving.",
              "Let service feel energetic but still attentive to table cues.",
            ]
          : [
              "Use a balanced, easygoing tone; check in at natural pauses.",
              "Tailor dish ideas to their stated craving and dietary preference.",
              "Keep pacing steady and read whether they want space or more engagement.",
            ],
    serviceApproach:
      sentiment === "negative"
        ? "Prioritize a calm, patient presence; comfort-forward food and drink suggestions that match cravings; minimal friction."
        : sentiment === "positive"
          ? "Lean into a warm, engaging style; use occasion and high energy to elevate the experience with enthusiastic but respectful hosting."
          : "Stay adaptable: neutral valence with varied energy; mirror their rhythm and use cravings plus dietary notes to guide recommendations.",
  };
}

const PROMPT = (input: QuestionnaireInput) => `Analyze this restaurant customer's questionnaire (infer hospitality cues from their answers; do not assume they were asked about service style):
- How they feel right now: ${input.emotionalState}
- How their day has been: ${input.dayContext}
- Energy level: ${input.energy}
- Occasion: ${input.occasion}
- What sounds good to eat: ${input.cravings}
- Dietary preference: ${input.dietaryPreference}

Return ONLY strict JSON (no markdown, no code fences) with these exact keys:
sentiment ("positive"|"neutral"|"negative"),
keyInsights (string array, max 3 bullet points about the customer),
interactionTips (string array, max 3 actionable tips for restaurant staff),
serviceApproach (string, one paragraph on how to serve this customer).`;

async function callGrok(input: QuestionnaireInput): Promise<AnalysisOutput | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: "You are a restaurant customer mood analyst. Always respond with valid JSON only." },
        { role: "user", content: PROMPT(input) },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

async function callClaude(input: QuestionnaireInput): Promise<AnalysisOutput | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: PROMPT(input) }],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return extractJson(text);
}

export async function analyzeMood(input: QuestionnaireInput): Promise<AnalysisOutput> {
  const provider = (process.env.AI_PROVIDER ?? "grok").toLowerCase();
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return fallbackAnalysis(input);

  try {
    let result: AnalysisOutput | null = null;
    if (provider === "claude") {
      result = await callClaude(input);
    } else {
      result = await callGrok(input);
    }
    return result ?? fallbackAnalysis(input);
  } catch {
    return fallbackAnalysis(input);
  }
}
