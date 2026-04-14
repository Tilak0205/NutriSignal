type QuestionnaireInput = {
  feeling: string;
  mood: string;
  cravings: string;
  energy: string;
  occasion: string;
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
  const negativeSignals = ["stressed", "sad", "anxious", "tired", "low"];
  const isNegative = negativeSignals.some((s) =>
    [input.feeling, input.mood, input.energy].join(" ").toLowerCase().includes(s),
  );
  const sentiment = isNegative ? "negative" : "positive";
  return {
    sentiment,
    keyInsights: [
      `Customer reports mood: ${input.mood}.`,
      `Current craving: ${input.cravings}.`,
      `Occasion context: ${input.occasion}.`,
    ],
    interactionTips: isNegative
      ? ["Greet calmly and warmly.", "Keep communication clear and concise.", "Recommend comforting menu items."]
      : ["Be energetic and welcoming.", "Suggest specials confidently.", "Offer quick personalized recommendations."],
    serviceApproach: isNegative
      ? "Use a patient and low-pressure approach, focusing on comfort and fast service."
      : "Use a friendly and upbeat approach, with proactive recommendations.",
  };
}

const PROMPT = (input: QuestionnaireInput) => `Analyze this restaurant customer's questionnaire:
- Feeling: ${input.feeling}
- Mood: ${input.mood}
- Cravings: ${input.cravings}
- Energy: ${input.energy}
- Occasion: ${input.occasion}
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
