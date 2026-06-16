import { CardGeneratorForm } from "@/components/card-generator-form";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Generate Product Cards
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Create professional marketplace product images with AI. Perfect for Wildberries, Ozon, and other e-commerce platforms.
        </p>
      </div>
      <CardGeneratorForm />
    </div>
  );
}