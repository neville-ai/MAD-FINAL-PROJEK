"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type PredictionResult = {
  estimatedKg: number;
  gramsPerChildPerMeal: number;
  servingsCovered: number;
  confidence: "low" | "medium" | "high";
  assumptions: string;
  reasoning: string;
};

function fallbackPrediction(args: {
  population: number;
  mealsPerDay: number;
  days: number;
}) {
  const gramsPerChildPerMeal = 25;
  const totalGrams =
    args.population * args.mealsPerDay * args.days * gramsPerChildPerMeal;

  return {
    estimatedKg: Math.max(0.5, Number((totalGrams / 1000).toFixed(1))),
    gramsPerChildPerMeal,
    servingsCovered: args.population * args.mealsPerDay * args.days,
    confidence: "medium" as const,
    assumptions:
      "Perhitungan fallback: 25 gram per anak per porsi untuk lauk pendamping.",
    reasoning:
      "Model AI tidak tersedia, sehingga sistem menggunakan rumus baseline yang konsisten.",
    model: "baseline-rule",
  };
}

function extractJson(text: string) {
  const cleaned = text.trim();
  const direct = cleaned.match(/\{[\s\S]*\}/);
  if (!direct) {
    return null;
  }

  try {
    return JSON.parse(direct[0]) as PredictionResult;
  } catch {
    return null;
  }
}

export const predictDonationNeed = action({
  args: {
    receiverName: v.string(),
    population: v.number(),
    foodType: v.string(),
    mealsPerDay: v.optional(v.number()),
    days: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const mealsPerDay = args.mealsPerDay ?? 2;
    const days = args.days ?? 1;
    const baseline = fallbackPrediction({
      population: args.population,
      mealsPerDay,
      days,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return baseline;
    }

    const prompt = `
Kamu adalah asisten perhitungan logistik donasi pangan.
Hitung estimasi kebutuhan "${args.foodType}" untuk panti berikut:
- nama: ${args.receiverName}
- jumlah anak: ${args.population}
- porsi makan per hari: ${mealsPerDay}
- jumlah hari: ${days}

Gunakan pendekatan realistis dan konservatif untuk lauk pendamping.
Balas HANYA dalam JSON valid (tanpa markdown) dengan schema:
{
  "estimatedKg": number,
  "gramsPerChildPerMeal": number,
  "servingsCovered": number,
  "confidence": "low" | "medium" | "high",
  "assumptions": string,
  "reasoning": string
}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      },
    );

    if (!response.ok) {
      return baseline;
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return baseline;
    }

    const parsed = extractJson(text);
    if (!parsed) {
      return baseline;
    }

    const safeEstimatedKg =
      typeof parsed.estimatedKg === "number" && Number.isFinite(parsed.estimatedKg)
        ? Number(Math.max(0.5, Math.min(parsed.estimatedKg, 2000)).toFixed(1))
        : baseline.estimatedKg;

    return {
      estimatedKg: safeEstimatedKg,
      gramsPerChildPerMeal:
        typeof parsed.gramsPerChildPerMeal === "number" &&
        Number.isFinite(parsed.gramsPerChildPerMeal)
          ? parsed.gramsPerChildPerMeal
          : baseline.gramsPerChildPerMeal,
      servingsCovered:
        typeof parsed.servingsCovered === "number" &&
        Number.isFinite(parsed.servingsCovered)
          ? parsed.servingsCovered
          : baseline.servingsCovered,
      confidence:
        parsed.confidence === "low" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "high"
          ? parsed.confidence
          : baseline.confidence,
      assumptions: parsed.assumptions || baseline.assumptions,
      reasoning: parsed.reasoning || baseline.reasoning,
      model: "gemini-2.5-flash",
    };
  },
});
