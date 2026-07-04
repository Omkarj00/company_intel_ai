/**
 * Serper.dev integration.
 * Used for: finding a company's official website, gathering supporting
 * public information (contact details, address), and discovering competitors.
 */

const SERPER_URL = 'https://google.serper.dev/search';

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

export interface SerperResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: {
    title?: string;
    website?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
  answerBox?: {
    answer?: string;
    snippet?: string;
  };
}

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    throw new Error(
      'SERPER_API_KEY is not configured on the server. Add it to your environment variables.'
    );
  }
  return key;
}

export async function serperSearch(query: string, num = 8): Promise<SerperResponse> {
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Serper.dev request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as SerperResponse;
}

const BLOCKED_DOMAINS = [
  'wikipedia.org',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'crunchbase.com',
  'glassdoor.com',
  'indeed.com',
  'bloomberg.com',
  'g2.com',
  'capterra.com',
  'reddit.com',
  'medium.com',
  'github.com',
];

function isLikelyOfficialDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return !BLOCKED_DOMAINS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

/** Given a company name, attempt to determine its official website. */
export async function findOfficialWebsite(companyName: string): Promise<string | null> {
  const result = await serperSearch(`${companyName} official website`, 8);

  if (result.knowledgeGraph?.website && isLikelyOfficialDomain(result.knowledgeGraph.website)) {
    return normalizeUrl(result.knowledgeGraph.website);
  }

  const candidate = result.organic?.find((r) => isLikelyOfficialDomain(r.link));
  return candidate ? normalizeUrl(candidate.link) : null;
}

export function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return u;
  }
}

/** Search for supplemental public info (phone/address) not found via crawling. */
export async function searchCompanyContactInfo(
  companyName: string,
  website: string
): Promise<string> {
  const domain = (() => {
    try {
      return new URL(website).hostname.replace(/^www\./, '');
    } catch {
      return companyName;
    }
  })();

  const result = await serperSearch(`${companyName} ${domain} contact phone number address`, 6);
  const snippets: string[] = [];

  if (result.knowledgeGraph?.description) snippets.push(result.knowledgeGraph.description);
  if (result.knowledgeGraph?.attributes) {
    snippets.push(
      Object.entries(result.knowledgeGraph.attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
    );
  }
  if (result.answerBox?.snippet) snippets.push(result.answerBox.snippet);
  for (const r of result.organic ?? []) {
    if (r.snippet) snippets.push(`${r.title}: ${r.snippet}`);
  }

  return snippets.join('\n').slice(0, 3000);
}

/** Search for likely competitors given industry/summary context. */
export async function searchCompetitorCandidates(
  companyName: string,
  industryOrSummary: string
): Promise<string> {
  const result = await serperSearch(
    `${companyName} competitors alternatives ${industryOrSummary}`.slice(0, 200),
    8
  );
  const snippets: string[] = [];
  if (result.answerBox?.snippet) snippets.push(result.answerBox.snippet);
  for (const r of result.organic ?? []) {
    snippets.push(`${r.title} (${r.link}): ${r.snippet ?? ''}`);
  }
  return snippets.join('\n').slice(0, 3500);
}

/** Verify / resolve a competitor's official website by name. */
export async function resolveCompetitorWebsite(name: string): Promise<string | null> {
  try {
    return await findOfficialWebsite(name);
  } catch {
    return null;
  }
}

export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  // bare domain like "stripe.com" or "www.tesla.com"
  return /^(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed) && !trimmed.includes(' ');
}
