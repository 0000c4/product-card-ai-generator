"use server";

import { generateCardImage, generateCardImageWithReferences } from "@/services/image-generator";
import type { ImageModel, ImageQuality, OutputFormat, BackgroundOption } from "@/types";

export async function generateCard(formData: FormData) {
  const productName = formData.get("productName") as string;
  const description = formData.get("description") as string;
  const price = formData.get("price") as string;
  const style = formData.get("style") as string;
  const model = (formData.get("model") as ImageModel) || "gpt-image-2";
  const size = (formData.get("size") as string) || "1024x1024";
  const quality = (formData.get("quality") as ImageQuality) || "auto";
  const outputFormat = (formData.get("outputFormat") as OutputFormat) || "png";
  const background = (formData.get("background") as BackgroundOption) || "auto";

  if (!productName || !description) {
    return { error: "Product name and description are required." };
  }

  try {
    // Check for reference images
    const referenceFiles: File[] = [];
    for (let i = 0; i < 4; i++) {
      const file = formData.get(`reference_${i}`) as File | null;
      if (file && file.size > 0) {
        referenceFiles.push(file);
      }
    }

    const params = {
      productName,
      description,
      price: price || undefined,
      style: style || undefined,
      model,
      size,
      quality,
      outputFormat,
      background,
    };

    let result;
    if (referenceFiles.length > 0) {
      // Read files into buffers on server
      const buffers = await Promise.all(
        referenceFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return Buffer.from(arrayBuffer);
        })
      );
      result = await generateCardImageWithReferences(params, buffers);
    } else {
      result = await generateCardImage(params);
    }

    return { success: true, ...result };
  } catch (error) {
    console.error("Generation error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to generate card image.",
    };
  }
}