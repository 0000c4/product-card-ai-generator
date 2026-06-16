const LLM_API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o";
const LLM_TIMEOUT = 120_000; // 2 minutes per LLM call

export interface ValidationResult {
  passed: boolean;
  issues: string[];
  improvementSuggestion?: string;
  retryPrompt?: string;
}

const VALIDATION_SYSTEM_PROMPT = `You are a quality control expert for AI-generated e-commerce product cards.
Your job is to analyze generated product card images and determine if they meet marketplace quality standards.

Check for these issues:
1. TEXT QUALITY — Is the product name readable? No garbled/corrupted text? No strange characters?
2. ARTIFACTS — Are there visual artifacts, distortions, or rendering errors?
3. COMPOSITION — Is the product properly visible? Does the card look professional?
4. MARKETPLACE STYLE — Does it look like a Wildberries/Ozon-style product card?
5. BRANDING — Is there any inappropriate or misleading text?

Output in JSON format with fields:
- passed (boolean): true if acceptable, false if needs regeneration
- issues (string[]): list of specific problems found (empty if passed)
- improvementSuggestion (string): brief suggestion to fix issues for regeneration
- retryPrompt (string): a revised prompt that fixes the identified issues, in English, ready to be sent to the image generation model. This should incorporate the issues found and produce a better result.`;

export async function validateGeneratedImage(
  imageBuffer: Buffer,
  originalPrompt: string,
  productName: string
): Promise<ValidationResult> {
  if (!API_KEY) {
    // Without API key, skip validation — assume passed
    return { passed: true, issues: [] };
  }

  const base64 = imageBuffer.toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT);

  try {
    const response = await fetch(`${LLM_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: VALIDATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this generated product card image for "${productName}". The original prompt was:\n\n${originalPrompt}\n\nCheck for text quality, artifacts, composition, and marketplace readiness. Return JSON with passed, issues, improvementSuggestion, and retryPrompt.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Validation error:", await response.text());
      return { passed: true, issues: [] }; // Skip on error
    }

    const data = await response.json();
    try {
      const result = JSON.parse(data.choices[0].message.content) as ValidationResult;
      return result;
    } catch {
      return { passed: true, issues: [] };
    }
  } catch (err) {
    console.error("Validation request failed:", err);
    return { passed: true, issues: [] }; // Skip on error
  } finally {
    clearTimeout(timeout);
  }
}