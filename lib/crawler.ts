import * as cheerio from 'cheerio';
import type { CrawledPage } from './types';

const PRIORITY_KEYWORDS = [
  { keyword: 'about', weight: 10 },
  { keyword: 'product', weight: 10 },
  { keyword: 'service', weight: 10 },
  { keyword: 'solution', weight: 9 },
  { keyword: 'contact', weight: 9 },
  { keyword: 'pricing', weight: 8 },
  { keyword: 'plans', weight: 6 },
  { keyword: 'company', weight: 6 },
  { keyword: 'team', weight: 4 },
  { keyword: 'customer', weight: 3 },
];

const IGNORE_PATTERNS = [
  /login/i,
  /signin/i,
  /sign-in/i,
  /signup/i,
  /sign-up/i,
  /register/i,
  /cart/i,
  /checkout/i,
  /account/i,
  /privacy/i,
  /terms/i,
  /cookie/i,
  /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|css|js|ico|webp|woff|woff2)$/i,
  /\/blog\//i, // avoid endless blog pagination; individual blog posts rarely help company overview
  /careers?\//i,
  /wp-json/i,
  /#/,
];

const MAX_PAGES = 7;
const FETCH_TIMEOUT_MS = 8000;

function shouldIgnore(url: string): boolean {
  return IGNORE_PATTERNS.some((re) => re.test(url));
}

function scoreLink(href: string): number {
  const lower = href.toLowerCase();
  let score = 0;
  for (const { keyword, weight } of PRIORITY_KEYWORDS) {
    if (lower.includes(keyword)) score += weight;
  }
  return score;
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CompanyResearchBot/1.0; +https://example.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractMainText($: cheerio.CheerioAPI): string {
  $('script, style, noscript, svg, iframe, nav, footer, header, form').remove();
  const title = $('title').first().text().trim();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  return `${title ? `Title: ${title}\n` : ''}${bodyText}`.slice(0, 6000);
}

function normalize(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${u.hostname}${path}`;
  } catch {
    return url;
  }
}

/**
 * Crawl a website starting at baseUrl, discovering and extracting content
 * from the most relevant pages (About, Products, Services, Solutions,
 * Contact, Pricing) while ignoring duplicates, login pages, and irrelevant
 * assets.
 */
export async function crawlWebsite(
  baseUrl: string,
  onPage?: (url: string, index: number, total: number) => void
): Promise<CrawledPage[]> {
  const origin = (() => {
    try {
      const u = new URL(baseUrl);
      return `${u.protocol}//${u.hostname}`;
    } catch {
      return baseUrl;
    }
  })();

  const visited = new Set<string>();
  const pages: CrawledPage[] = [];

  // 1. Fetch homepage first.
  const homeUrl = normalize(origin);
  const homeRes = await fetchWithTimeout(homeUrl);
  if (!homeRes || !homeRes.ok) {
    throw new Error(`Could not reach ${origin}. The site may be down or blocking automated requests.`);
  }
  const homeHtml = await homeRes.text();
  const $home = cheerio.load(homeHtml);
  visited.add(homeUrl);
  pages.push({ url: homeUrl, title: $home('title').first().text().trim() || origin, content: extractMainText(cheerio.load(homeHtml)) });
  onPage?.(homeUrl, 1, MAX_PAGES);

  // 2. Discover internal links from homepage, score & rank by relevance.
  const candidates = new Map<string, number>();
  $home('a[href]').each((_, el) => {
    const href = $home(el).attr('href');
    if (!href) return;
    let absolute: string;
    try {
      absolute = new URL(href, origin).toString();
    } catch {
      return;
    }
    const normalized = normalize(absolute);
    if (!normalized.startsWith(origin)) return; // internal links only
    if (shouldIgnore(normalized)) return;
    if (visited.has(normalized)) return;

    const score = scoreLink(normalized) + scoreLink($home(el).text() || '');
    if (score > 0) {
      candidates.set(normalized, Math.max(candidates.get(normalized) ?? 0, score));
    }
  });

  // Ensure we at least try common paths even if not linked with matching anchor text.
  const commonPaths = ['/about', '/about-us', '/products', '/services', '/solutions', '/contact', '/contact-us', '/pricing'];
  for (const path of commonPaths) {
    const url = normalize(`${origin}${path}`);
    if (!visited.has(url) && !candidates.has(url)) {
      candidates.set(url, 5);
    }
  }

  const ranked = Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url)
    .slice(0, MAX_PAGES - 1);

  let index = 1;
  for (const url of ranked) {
    if (visited.has(url)) continue;
    visited.add(url);
    const res = await fetchWithTimeout(url);
    index += 1;
    if (!res || !res.ok) continue;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) continue;
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || url;
    pages.push({ url, title, content: extractMainText($) });
    onPage?.(url, index, MAX_PAGES);
    if (pages.length >= MAX_PAGES) break;
  }

  return pages;
}
