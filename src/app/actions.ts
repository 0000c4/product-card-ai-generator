"use server";

import { generateCardImage, generateCardImageWithProduct } from "@/services/image-generator";
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

    // Check for product image
    const productImageFile = formData.get("productImage") as File | null;
    const hasProductImage = productImageFile && productImageFile.size > 0;

    let result;
    if (hasProductImage) {
      // Collect reference images
      const referenceFiles: Buffer[] = [];
      for (let i = 0; i < 4; i++) {
        const file = formData.get(`reference_${i}`) as File | null;
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          referenceFiles.push(Buffer.from(arrayBuffer));
        }
      }

      const productBuffer = Buffer.from(await productImageFile!.arrayBuffer());
      result = await generateCardImageWithProduct(params, productBuffer, referenceFiles);
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