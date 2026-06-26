import type { BotConfig } from "./config.js";
import type { Signal } from "./types.js";

type OpenAIAnalysis = {
  overall_risk: "low" | "medium" | "high";
  signals: Array<{
    type: string;
    evidence: string;
    confidence: number;
  }>;
  genuine_relationship_indicators?: string[];
  explanation: string;
  next_steps: string[];
};

const signalLabels: Record<string, string> = {
  money_request: "Money or financial request",
  refuses_video: "Avoids spontaneous live video",
  offplatform_pivot: "Moved off the dating platform quickly",
  classic_unavailable_persona: "Unavailable-but-plausible persona",
  love_bombing: "Fast intense affection",
  story_inconsistency: "Story or timeline inconsistency",
  secrecy_pressure: "Secrecy or isolation pressure",
  future_faking: "Future-faking or rapid commitment",
  ai_generated_photo: "Photo may be AI-generated",
  reused_photo: "Photo may be reused on unrelated profiles",
  deepfake_or_faceswap: "Photo may show deepfake or face-swap indicators",
};

const signalWeights: Record<string, number> = {
  money_request: 3.4,
  refuses_video: 2.8,
  offplatform_pivot: 2.2,
  classic_unavailable_persona: 2.4,
  love_bombing: 1.6,
  story_inconsistency: 1.7,
  secrecy_pressure: 1.9,
  future_faking: 1.4,
  ai_generated_photo: 2.6,
  reused_photo: 2.8,
  deepfake_or_faceswap: 2.6,
};

export async function analyzeWithOpenAI(
  config: BotConfig,
  input: { text?: string; imageDataUrl?: string },
): Promise<{ signals: Signal[]; balancingSignals: string[]; explanation?: string; nextSteps?: string[] } | undefined> {
  if (!config.openai.enabled || !config.openai.apiKey) return undefined;

  const content: Array<Record<string, unknown>> = [];
  if (input.text) {
    content.push({ type: "input_text", text: input.text });
  }
  if (input.imageDataUrl) {
    content.push({
      type: "input_image",
      image_url: input.imageDataUrl,
    });
  }

  if (content.length === 0) return undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.openai.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.openai.model,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "romance_scam_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI analysis failed: ${response.status} ${errorText.slice(0, 500)}`);
  }

  const payload = await response.json() as { output_text?: string; output?: unknown[] };
  const outputText = payload.output_text ?? extractOutputText(payload.output);
  if (!outputText) return undefined;

  const parsed = JSON.parse(outputText) as OpenAIAnalysis;
  return {
    signals: parsed.signals.map((signal) => ({
      type: signal.type,
      label: signalLabels[signal.type] ?? signal.type.replaceAll("_", " "),
      evidence: signal.evidence,
      confidence: signal.confidence,
      weight: signalWeights[signal.type] ?? 1,
      source: "llm",
    })),
    balancingSignals: parsed.genuine_relationship_indicators ?? [],
    explanation: parsed.explanation,
    nextSteps: parsed.next_steps,
  };
}

function extractOutputText(output: unknown): string | undefined {
  if (!Array.isArray(output)) return undefined;
  for (const item of output as Array<{ content?: Array<{ text?: string }> }>) {
    const text = item.content?.find((contentItem) => typeof contentItem.text === "string")?.text;
    if (text) return text;
  }
  return undefined;
}

const systemPrompt = `
You are Veritas, an expert romance-scam analyst. Evaluate only people/offers directed at the user.
Never claim certainty. Use "signals" and "patterns", not proof. Be conservative about genuine long-distance relationships.

Return strict JSON only.

Red-flag taxonomy:
- High: money request, refuses spontaneous live video, moves off dating app quickly, unavailable persona such as overseas military/oil rig/doctor abroad/engineer on contract, AI-generated/reused/deepfake photo.
- Medium: love-bombing, story inconsistency, secrecy pressure, future-faking.
- Low: scripted wording, lack of mundane verifiable details.
- Balancing: willing spontaneous video, no money dynamic, consistent verifiable details, comfortable involving friends/family.

For screenshots, read the visible chat first, then analyze it. If the image is a profile photo rather than chat screenshot, only emit image-related signals when visible evidence supports it and otherwise say what could not be checked.
`;

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall_risk",
    "signals",
    "genuine_relationship_indicators",
    "explanation",
    "next_steps",
  ],
  properties: {
    overall_risk: { type: "string", enum: ["low", "medium", "high"] },
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "evidence", "confidence"],
        properties: {
          type: {
            type: "string",
            enum: [
              "money_request",
              "refuses_video",
              "offplatform_pivot",
              "classic_unavailable_persona",
              "love_bombing",
              "story_inconsistency",
              "secrecy_pressure",
              "future_faking",
              "ai_generated_photo",
              "reused_photo",
              "deepfake_or_faceswap",
              "generic_scripted_language",
              "limited_verifiable_details",
            ],
          },
          evidence: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    genuine_relationship_indicators: {
      type: "array",
      items: { type: "string" },
    },
    explanation: { type: "string" },
    next_steps: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;
