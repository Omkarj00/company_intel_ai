import type { CrawledPage } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (fast, recommended)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (fast)' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { id: 'mistralai/mistral-large', label: 'Mistral Large' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
];

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not configured on the server. Add it to your environment variables.'
    );
  }
  return key;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function openRouterChat(
  messages: ChatMessage[],
  model: string,
  options: { jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: options.maxTokens ?? 1800,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL ?? 'https://localhost:3000',
      'X-Title': 'Company Research Assistant',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned an empty response.');
  return content as string;
}

function extractJson(raw: string): unknown {
  let text = raw.trim();
  // Strip markdown code fences if the model added them despite instructions.
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain valid JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

export interface AiAnalysis {
  summary: string;
  industry: string;
  productsServices: string[];
  painPoints: string[];
  phone: string | null;
  address: string | null;
  competitorNames: string[];
}

/** Send crawled pages + supplemental search context to the AI for structured analysis. */
export async function analyzeCompany(
  companyNameHint: string,
  pages: CrawledPage[],
  supplementalContext: string,
  model: string
): Promise<AiAnalysis> {
  const pageDump = pages
    .map((p) => `--- PAGE: ${p.url} ---\nTITLE: ${p.title}\nCONTENT:\n${p.content}`)
    .join('\n\n')
    .slice(0, 18000);

  const system = `You are an expert B2B research analyst. You analyze raw crawled website content and public search snippets about a company, then produce a strictly valid JSON object with your findings. Do not include any text outside the JSON object. Do not use markdown code fences. Be concise but concrete. If information is genuinely unavailable, use null (for strings) or an empty array.`;

  const user = `Company (as given by user): ${companyNameHint}

=== CRAWLED WEBSITE CONTENT ===
${pageDump}

=== SUPPLEMENTAL PUBLIC SEARCH INFO ===
${supplementalContext || '(none found)'}

Return a JSON object with EXACTLY this shape:
{
  "summary": "2-4 sentence company summary",
  "industry": "short industry/category label",
  "productsServices": ["list", "of", "key products or services"],
  "painPoints": ["3-6 plausible customer/business pain points this company's offering addresses or that the company itself likely faces, inferred from its positioning"],
  "phone": "phone number string or null",
  "address": "postal/HQ address string or null",
  "competitorNames": ["5-8 real, well-known company names that compete directly with this company in the same industry, country, or with similar products/services"]
}`;

  const raw = await openRouterChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    model,
    { jsonMode: true }
  );

  const parsed = extractJson(raw) as Partial<AiAnalysis>;

  return {
    summary: parsed.summary ?? 'No summary available.',
    industry: parsed.industry ?? 'Unknown',
    productsServices: Array.isArray(parsed.productsServices) ? parsed.productsServices : [],
    painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
    phone: parsed.phone ?? null,
    address: parsed.address ?? null,
    competitorNames: Array.isArray(parsed.competitorNames) ? parsed.competitorNames : [],
  };
}
