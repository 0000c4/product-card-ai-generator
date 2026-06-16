# Marketplace AI Card Generator

Generate professional marketplace product cards for Wildberries, Ozon, and other e-commerce platforms using AI (DALL·E 3).

## Tech Stack

- **Next.js 15** — App Router, Server Actions
- **TypeScript** — Full type safety
- **TailwindCSS v4** — Utility-first styling
- **shadcn/ui** — Accessible UI primitives
- **Fetch API** — Raw HTTP calls to OpenAI-compatible API (GPT Image models)
- **next-themes** — Dark mode support

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles & Tailwind imports
│   ├── layout.tsx           # Root layout with theme provider & header
│   ├── page.tsx             # Home page (generator form)
│   └── actions.ts           # Server Actions (form handling)
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── textarea.tsx
│   ├── theme-provider.tsx   # next-themes wrapper
│   ├── theme-toggle.tsx     # Dark/light mode toggle
│   └── card-generator-form.tsx  # Main generator component
├── lib/
│   └── utils.ts             # cn() utility (clsx + tailwind-merge)
├── services/
│   └── image-generator.ts   # OpenAI API image generation via fetch
├── types/
│   └── index.ts             # Shared TypeScript types
public/
└── uploads/                 # Generated images (gitignored)
```

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.proxyapi.ru/openai/v1
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. Fill in the form with your product name, description, optional price and style.
2. Submit the form — a Server Action calls the GPT Image API via raw fetch.
3. The generated image is saved locally to `public/uploads/`.
4. The image is displayed in the UI and can be downloaded.

## Folder Explanation

| Folder         | Purpose                                                                 |
|----------------|-------------------------------------------------------------------------|
| `app/`         | Next.js App Router pages, layouts, and Server Actions.                  |
| `components/`  | React components — UI primitives (shadcn) and business components.      |
| `lib/`         | Pure utility functions (cn, helpers, etc.).                             |
| `services/`    | External service integrations (OpenAI API via fetch).                  |
| `types/`       | TypeScript interfaces and shared types.                                 |
| `public/`      | Static assets and generated images.                                     |
| `uploads/`     | Locally saved AI-generated card images (in public/).                    |

## Environment Variables

| Variable              | Required | Description                         |
|-----------------------|----------|-------------------------------------|
| `OPENAI_API_KEY`      | Yes      | OpenAI API key                      |
| `OPENAI_BASE_URL`     | No       | Custom OpenAI-compatible API URL    |

## License

MIT