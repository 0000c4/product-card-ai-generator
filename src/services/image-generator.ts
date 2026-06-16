import fs from "fs";
import path from "path";
import type { CardGenerationParams, CardGenerationResult } from "@/types";
import { analyzeReferenceImages, generateCreativePrompt } from "./prompt-generator";
import { validateGeneratedImage } from "./validation";

const API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MAX_RETRIES = 3;

interface OpenAIResponse {
  data: Array<{ b64_json?: string }>;
  usage?: {
    prompt_tokens: number;
    image_input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 300_000): Promise<Response> {
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

async function callImageGenerationApi(
  prompt: string,
  params: CardGenerationParams,
  productImage: Buffer | null,
  referenceImages: Buffer[]
): Promise<OpenAIResponse> {
  if (productImage) {
    // Use /v1/images/edits with product image + references
    const formData = new FormData();
    formData.append("model", params.model);
    formData.append("prompt", prompt);
    formData.append("n", "1");

    const productBlob = new Blob([new Uint8Array(productImage)], { type: "image/png" });
    formData.append("image[]", productBlob);

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

    return response.json();
  } else {
    // Use /v1/images/generations
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

    return response.json();
  }
}

export async function generateCardImage(
  params: CardGenerationParams,
  productImage?: Buffer,
  referenceImages?: Buffer[]
): Promise<CardGenerationResult> {
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const refs = referenceImages || [];

  // Step 2 + 3: Analyze reference images (if any) and generate creative prompt
  const referenceAnalysis = await analyzeReferenceImages(refs, params.productName);
  let prompt = await generateCreativePrompt(
    params.productName,
    params.description,
    params.price,
    params.style,
    referenceAnalysis,
    params.background
  );

  let lastError: string | undefined;

  // Step 4: Retry loop with validation
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`Generation attempt ${attempt + 1}/${MAX_RETRIES} for "${params.productName}"`);

    // Generate image
    const data = await callImageGenerationApi(prompt, params, productImage || null, refs);
    const b64 = data.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error("No image generated in response");
    }

    // Validate generated image with Vision
    const imageBuffer = Buffer.from(b64, "base64");
    const validation = await validateGeneratedImage(imageBuffer, prompt, params.productName);

    if (validation.passed) {
      // Save and return
      const imageUrl = saveImage(b64);
      return {
        imageUrl,
        prompt,
        usage: data.usage,
        retries: attempt,
      };
    }

    console.log(
      `Attempt ${attempt + 1} failed validation:`,
      validation.issues.join(", ")
    );

    // Failed — prepare for retry
    lastError = validation.issues.join("; ");

    if (attempt < MAX_RETRIES - 1) {
      // Use the retry prompt from validation, or append improvement suggestion
      if (validation.retryPrompt) {
        prompt = validation.retryPrompt;
      } else if (validation.improvementSuggestion) {
        prompt = `${prompt}\n\nIMPROVEMENT: ${validation.improvementSuggestion}`;
      } else {
        prompt = `${prompt}\n\nIMPROVEMENT: Ensure text is clearly readable with no artifacts or distortions. Make the product card look professional and marketplace-ready.`;
      }
    }
  }

  // All retries exhausted — save last result anyway
  throw new Error(
    `Failed to generate acceptable card after ${MAX_RETRIES} attempts. Last issues: ${lastError || "unknown"}`
  );
}

export async function generateCardImageWithProduct(
  params: CardGenerationParams,
  productImage: Buffer,
  referenceImages: Buffer[]
): Promise<CardGenerationResult> {
  // Delegates to the unified function
  return generateCardImage(params, productImage, referenceImages);
}