# CompanyIntel.ai 

An AI-powered Company Research Assistant. Give it a company name or a website
URL and it will:

1. Determine the company's official website (via [Serper.dev](https://serper.dev) if only a name was given)
2. Crawl the site's most relevant pages (About, Products, Services, Solutions, Contact, Pricing)
3. Pull in supplemental public information (contact details, address) via Serper.dev
4. Send everything to an AI model of your choice via [OpenRouter](https://openrouter.ai) to generate a summary, products/services list, and AI-generated pain points
5. Identify and verify real competitors (name + website)
6. Render a downloadable, professional PDF report
7. Optionally push the report — with applicant details — straight to a Discord channel

All of this happens through a ChatGPT-style chat interface with live progress
updates as each step runs.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript) — single unified project, API routes + frontend in one deployable app
- **Search:** Serper.dev (Google Search API)
- **AI:** OpenRouter (model-agnostic — pick any supported model from the UI)
- **Crawling:** `cheerio` (lightweight HTML parsing, serverless-friendly)
- **PDF Generation:** `@react-pdf/renderer` (pure JS, no headless browser needed — works on serverless platforms like Vercel)
- **Discord:** Discord Bot API (`POST /channels/{id}/messages` with a file attachment)
- **Styling:** Tailwind CSS
- **Storage:** None required. Discord config is stored client-side in `localStorage` only; there is no database.

---

## Project Structure

```
company-research-ai/
├── app/
│   ├── api/
│   │   ├── research/route.ts     # Streams progress + final result as NDJSON
│   │   ├── pdf/route.ts          # Generates & returns the PDF report
│   │   ├── discord/send/route.ts # Sends report + applicant info to Discord
│   │   └── health/route.ts       # Reports whether server API keys are set
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Chat.tsx           # Main chat orchestrator (state, streaming, settings)
│   ├── Header.tsx
│   ├── ProgressTracker.tsx
│   ├── ResultCard.tsx
│   └── SettingsModal.tsx
├── lib/
│   ├── pipeline.ts        # Orchestrates the full research workflow
│   ├── serper.ts          # Serper.dev search integration
│   ├── crawler.ts         # Website crawler (page discovery + extraction)
│   ├── openrouter.ts      # OpenRouter AI integration
│   ├── pdf-generator.tsx  # PDF report layout & rendering
│   ├── discord.ts         # Discord bot message + file upload
│   └── types.ts
├── .env.example
└── README.md
```

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable             | Required | Description                                                                 |
|-----------------------|:--------:|-------------------------------------------------------------------------------|
| `SERPER_API_KEY`      | Yes      | API key from [serper.dev](https://serper.dev). Free tier includes 2,500 searches. |
| `OPENROUTER_API_KEY`  | Yes      | API key from [openrouter.ai/keys](https://openrouter.ai/keys).                |
| `APP_URL`             | No       | Your deployed URL, sent as the `HTTP-Referer` header to OpenRouter.           |

> **Discord Bot Token & Channel ID are not environment variables.** They're
> entered by the user at runtime in the app's **Settings** panel and stored
> only in the browser's `localStorage` — never on the server or in a
> database, per the "no database required" project constraint.

### 3. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
npm run build
npm run start
```

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the environment variables (`SERPER_API_KEY`, `OPENROUTER_API_KEY`, optionally `APP_URL`) in the Vercel project settings.
4. Deploy. No other configuration is needed — the crawler and PDF generator both run in standard Node.js serverless functions (no headless browser dependency).

The same steps apply to Netlify or Cloudflare Pages with their respective Next.js adapters.

---

## How Each Requirement Is Met

- **Dual input support:** the app detects whether the input looks like a URL or a bare company name (`lib/serper.ts#looksLikeUrl`) and branches accordingly.
- **Website crawling:** `lib/crawler.ts` fetches the homepage, discovers internal links, scores them by relevance to keywords (about/product/service/solution/contact/pricing), de-duplicates by normalized URL, and skips login/cart/account/asset pages.
- **Serper.dev integration:** used to find the official website, gather contact/address info not present on the site, and to source competitor candidates.
- **OpenRouter AI integration:** `lib/openrouter.ts` calls the chat completions endpoint with a JSON-mode prompt; the model is selectable from the UI dropdown (`AVAILABLE_MODELS`), and any OpenRouter model ID can be added there.
- **Competitor analysis:** the AI proposes competitor names from crawled content + search context; each name is then independently re-resolved to a real website via Serper.dev to avoid hallucinated URLs.
- **PDF generation:** `lib/pdf-generator.tsx` renders a structured, styled report with `@react-pdf/renderer`, downloadable with one click from the result card.
- **Chat interface:** `components/Chat.tsx` streams progress (NDJSON) from `/api/research` and renders a terminal-style live log, followed by a "dossier" result card.
- **Discord integration (bonus):** Settings panel collects Bot Token, Channel ID, Applicant Name, and Applicant Email; after a report is generated, "Send to Discord" posts an embed + the PDF file to the configured channel via the Discord Bot API.
- **No auth / no DB:** all state is either passed through the request/response cycle or kept in browser `localStorage`.

---

## Notes & Limitations

- The crawler is intentionally dependency-light (`cheerio`, no headless browser) so it deploys cleanly to serverless platforms. Very JS-heavy sites that render content entirely client-side may yield thinner content than a full browser-based crawler (e.g. Playwright) would — a reasonable trade-off for a fast, serverless-friendly deployment.
- Competitor websites are only included when Serper.dev can confidently resolve them; a competitor may appear with an empty website if resolution fails, rather than risk showing an incorrect URL.
- This app makes outbound requests to arbitrary company websites and third-party search/AI/Discord APIs; make sure the API keys you provide belong to accounts you control.
