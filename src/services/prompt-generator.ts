const LLM_API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o";
const LLM_TIMEOUT = 120_000; // 2 minutes per LLM call

export interface ReferenceAnalysis {
  colorPalette: string;
  style: string;
  composition: string;
  mood: string;
  summary: string;
}

const SYSTEM_PROMPT = `You are a creative prompt engineer for e-commerce marketplace product cards (Wildberries/Ozon style).
Your job is to generate detailed, effective English prompts for an image generation model that creates professional product cards.

Rules:
1. Always output in English (image models understand English best)
2. Include specific visual details: lighting, background, composition, typography hints
3. Adapt style based on product category (electronics, clothing, food, etc.)
4. Keep the prompt concise but descriptive (2-4 paragraphs)
5. End with technical requirements: resolution, aspect ratio, quality
6. Do NOT include placeholder text or dummy content references
7. Focus on making the product card look professional and marketplace-ready`;

export async function analyzeReferenceImages(
  referenceImages: Buffer[],
  productName: string
): Promise<ReferenceAnalysis | null> {
  if (!API_KEY) return null;
  if (referenceImages.length === 0) return null;

  const imageContents = referenceImages.map((img) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/png;base64,${img.toString("base64")}`,
      detail: "auto" as const,
    },
  }));

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
          {
            role: "system",
            content:
              "You analyze reference images for a product card designer. Describe ONLY what you see in the images. Focus on: color palette (hex codes), style/aesthetic, composition/layout, mood/atmosphere. Be specific and technical.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze these reference images for a product card for "${productName}". Return a JSON object with fields: colorPalette (string), style (string), composition (string), mood (string), summary (string).`,
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Reference analysis error:", await response.text());
      return null;
    }

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content) as ReferenceAnalysis;
    } catch {
      return null;
    }
  } catch (err) {
    console.error("Reference analysis request failed:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCreativePrompt(
  productName: string,
  description: string,
  price: string | undefined,
  style: string | undefined,
  referenceAnalysis: ReferenceAnalysis | null,
  background: string | undefined
): Promise<string> {
  if (!API_KEY) {
    // Fallback to basic prompt if no API key
    return buildFallbackPrompt(productName, description, price, style);
  }

  const userMessageParts: string[] = [
    `Product name: ${productName}`,
    `Description: ${description}`,
  ];

  if (price) userMessageParts.push(`Price: ${price}`);
  if (style) userMessageParts.push(`User's style preference: ${style}`);
  if (background) userMessageParts.push(`Background preference: ${background}`);

  if (referenceAnalysis) {
    userMessageParts.push(
      "",
      "Reference images analysis (incorporate these visual elements):",
      `Color palette: ${referenceAnalysis.colorPalette}`,
      `Style: ${referenceAnalysis.style}`,
      `Composition: ${referenceAnalysis.composition}`,
      `Mood: ${referenceAnalysis.mood}`,
      `Summary: ${referenceAnalysis.summary}`,
      "",
      "IMPORTANT: Use these reference elements to guide the visual style, but do NOT include the reference images themselves as separate products in the card."
    );
  }

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessageParts.join("\n") },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Prompt generation error:", await response.text());
      return buildFallbackPrompt(productName, description, price, style);
    }

    const data = await response.json();
    const generatedPrompt = data.choices[0].message.content.trim();

    if (!generatedPrompt) {
      return buildFallbackPrompt(productName, description, price, style);
    }

    return generatedPrompt;
  } catch (err) {
    console.error("Prompt generation request failed:", err);
    return buildFallbackPrompt(productName, description, price, style);
  } finally {
    clearTimeout(timeout);
  }
}

function buildFallbackPrompt(
  productName: string,
  description: string,
  price: string | undefined,
  style: string | undefined
): string {
  const lines: string[] = [
    `Create a professional marketplace product card for "${productName}".`,
    `Product description: ${description}`,
  ];

  if (price) {
    lines.push(`Price: ${price}`);
  }

  const resolvedStyle = style || "modern marketplace product card";
  lines.push(`Overall style: ${resolvedStyle}`);

  lines.push(
    "Requirements:",
    "- Clean white or gradient background",
    "- Professional product presentation",
    "- Include product name text overlay",
    "- Modern e-commerce aesthetic",
    "- Marketplace-ready design (Wildberries/Ozon style)",
    "- High resolution, crisp quality",
    "- No placeholder or dummy text"
  );

  return lines.join("\n");
}