import fs from "fs";
import path from "path";
import type { CardGenerationParams, CardGenerationResult } from "@/types";

const API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;

interface OpenAIResponse {
  data: Array<{ b64_json?: string }>;
  usage?: {
    prompt_tokens: number;
    image_input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

function buildPrompt(params: CardGenerationParams, hasProductImage: boolean): string {
  const lines: string[] = [
    `Create a professional marketplace product card for "${params.productName}".`,
    `Product description: ${params.description}`,
  ];

  if (params.price) {
    lines.push(`Price: ${params.price}`);
  }

  const style = params.style || "modern marketplace product card";
  lines.push(`Overall style: ${style}`);

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

  if (hasProductImage) {
    lines.push(
      "",
      "IMPORTANT — Image roles:",
      "The FIRST image is the PRODUCT ITSELF. Create a card featuring THIS EXACT product as the main subject.",
      "All subsequent images are style/composition/color references only — do NOT place them as separate products in the card."
    );
  }

  return lines.join("\n");
}

function saveImage(b64: string): string {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `card-${Date.now()}.png`;
  const filepath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(b64, "base64");
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 180_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: true,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCardImage(
  params: CardGenerationParams
): Promise<CardGenerationResult> {
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildPrompt(params, false);

  const body: Record<string, unknown> = {
    model: params.model,
    prompt,
    n: 1,
    size: params.size,
    quality: params.quality,
    output_format: params.outputFormat,
    background: params.background,
  };

  const response = await fetchWithTimeout(`${API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data: OpenAIResponse = await response.json();
  const b64 = data.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("No image generated in response");
  }

  const imageUrl = saveImage(b64);

  return {
    imageUrl,
    prompt,
    usage: data.usage,
  };
}

export async function generateCardImageWithProduct(
  params: CardGenerationParams,
  productImage: Buffer,
  referenceImages: Buffer[]
): Promise<CardGenerationResult> {
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildPrompt(params, true);

  const formData = new FormData();

  formData.append("model", params.model);
  formData.append("prompt", prompt);
  formData.append("n", "1");

  // First image = the product itself
  const productBlob = new Blob([new Uint8Array(productImage)], { type: "image/png" });
  formData.append("image[]", productBlob);

  // Subsequent images = style/composition references only (up to 4)
  const maxRefs = referenceImages.slice(0, 4);
  for (const ref of maxRefs) {
    const refBlob = new Blob([new Uint8Array(ref)], { type: "image/png" });
    formData.append("image[]", refBlob);
  }

  const response = await fetchWithTimeout(`${API_BASE}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data: OpenAIResponse = await response.json();
  const b64 = data.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("No image generated in response");
  }

  const imageUrl = saveImage(b64);

  return {
    imageUrl,
    prompt,
    usage: data.usage,
  };
}