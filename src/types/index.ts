export type ImageQuality = "low" | "medium" | "high" | "auto";
export type OutputFormat = "png" | "jpeg" | "webp";
export type BackgroundOption = "opaque" | "transparent" | "auto";
export type ImageModel = "gpt-image-1" | "gpt-image-1-mini" | "gpt-image-1.5" | "gpt-image-2";

export interface CardGenerationParams {
  productName: string;
  description: string;
  price?: string;
  style?: string;
  model: ImageModel;
  size: string;
  quality: ImageQuality;
  outputFormat: OutputFormat;
  background: BackgroundOption;
}

export interface CardGenerationResult {
  imageUrl: string;
  prompt: string;
  usage?: {
    prompt_tokens: number;
    image_input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}