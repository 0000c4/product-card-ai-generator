"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { generateCard } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Loader2, X, ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import type { ImageModel } from "@/types";

const MODELS: { value: ImageModel; label: string }[] = [
  { value: "gpt-image-2", label: "GPT Image 2 (Best)" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (Fast)" },
];

const SIZES = [
  { value: "1024x1024", label: "1024×1024 (Square)" },
  { value: "1536x1024", label: "1536×1024 (Landscape)" },
  { value: "1024x1536", label: "1024×1536 (Portrait)" },
  { value: "1920x1080", label: "1920×1080 (HD)" },
  { value: "2560x1440", label: "2560×1440 (QHD)" },
];

const QUALITIES = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low (Fast)" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG (Faster)" },
  { value: "webp", label: "WebP" },
];

const BACKGROUNDS = [
  { value: "auto", label: "Auto" },
  { value: "opaque", label: "Opaque" },
  { value: "transparent", label: "Transparent" },
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate Card
        </>
      )}
    </Button>
  );
}

interface ReferencePreview {
  file: File;
  preview: string;
}

export function CardGeneratorForm() {
  const [result, setResult] = useState<{
    imageUrl?: string;
    prompt?: string;
    usage?: {
      prompt_tokens: number;
      image_input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
    error?: string;
  } | null>(null);

  const [productImage, setProductImage] = useState<ReferencePreview | null>(null);
  const [references, setReferences] = useState<ReferencePreview[]>([]);

  function handleProductImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous preview
      if (productImage) URL.revokeObjectURL(productImage.preview);
      const preview = URL.createObjectURL(file);
      setProductImage({ file, preview });
    }
    e.target.value = "";
  }

  function removeProductImage() {
    if (productImage) {
      URL.revokeObjectURL(productImage.preview);
      setProductImage(null);
    }
  }

  function handleReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - references.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      const preview = URL.createObjectURL(file);
      setReferences((prev) => [...prev, { file, preview }]);
    }

    e.target.value = "";
  }

  function removeReference(index: number) {
    setReferences((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(formData: FormData) {
    setResult(null);

    // Append product image
    if (productImage) {
      formData.append("productImage", productImage.file);
    }

    // Append reference files
    references.forEach((ref, i) => {
      formData.append(`reference_${i}`, ref.file);
    });

    const res = await generateCard(formData);
    setResult(res);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <form
          action={handleSubmit}
          className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              name="productName"
              placeholder="e.g. Premium Cotton Hoodie"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your product in detail..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (optional)</Label>
            <Input id="price" name="price" placeholder="e.g. 2,990 ₽" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style (optional)</Label>
            <Input
              id="style"
              name="style"
              placeholder="e.g. minimal, bold, luxury"
            />
          </div>

          {/* Product Image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Upload className="h-4 w-4" />
              Product Image
              <span className="text-xs font-normal text-zinc-500">(optional)</span>
            </Label>
            {productImage ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-zinc-300 dark:border-zinc-700">
                <Image
                  src={productImage.preview}
                  alt="Product"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={removeProductImage}
                  className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-10 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500">
                <Upload className="h-8 w-8 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-500">
                  Click to upload product photo
                </span>
                <span className="text-xs text-zinc-400">
                  PNG, JPEG or WebP
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleProductImageUpload}
                />
              </label>
            )}
            <p className="text-xs text-zinc-500">
              This photo will be used as the MAIN product in the generated card
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <select
              id="model"
              name="model"
              defaultValue="gpt-image-2"
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size & Quality row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <select
                id="size"
                name="size"
                defaultValue="1024x1024"
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              >
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <select
                id="quality"
                name="quality"
                defaultValue="auto"
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              >
                {QUALITIES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format & Background row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outputFormat">Format</Label>
              <select
                id="outputFormat"
                name="outputFormat"
                defaultValue="png"
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background">Background</Label>
              <select
                id="background"
                name="background"
                defaultValue="auto"
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              >
                {BACKGROUNDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Images */}
          <div className="space-y-2">
            <Label>Reference Images (optional, up to 4)</Label>
            <div className="flex flex-wrap gap-2">
              {references.map((ref, index) => (
                <div key={index} className="relative h-16 w-16 overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
                  <Image
                    src={ref.preview}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeReference(index)}
                    className="absolute right-0 top-0 rounded-bl-md bg-black/50 p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {references.length < 4 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500">
                  <ImageIcon className="h-5 w-5 text-zinc-400" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleReferenceUpload}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Additional style references for the AI
            </p>
          </div>

          <SubmitButton />
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {result?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {result.error}
          </div>
        )}

        {result?.imageUrl && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Image
              src={result.imageUrl}
              alt="Generated card"
              width={1024}
              height={1024}
              className="w-full object-cover"
            />
          </div>
        )}

        {result?.imageUrl && (
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => {
                const link = document.createElement("a");
                link.href = result.imageUrl!;
                link.download = `card-${Date.now()}.png`;
                link.click();
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            {result.usage && (
              <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <p className="mb-1 font-medium">Token Usage</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span>Prompt tokens:</span>
                  <span className="text-right font-mono">{result.usage.prompt_tokens?.toLocaleString() ?? "—"}</span>
                  <span>Image input tokens:</span>
                  <span className="text-right font-mono">{result.usage.image_input_tokens?.toLocaleString() ?? "—"}</span>
                  <span>Output tokens:</span>
                  <span className="text-right font-mono">{result.usage.output_tokens?.toLocaleString() ?? "—"}</span>
                  <span className="font-medium">Total:</span>
                  <span className="text-right font-mono font-medium">{result.usage.total_tokens?.toLocaleString() ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
            <div className="text-center">
              <Sparkles className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Your generated card will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}