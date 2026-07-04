import { crawlWebsite } from './crawler';
import { analyzeCompany } from './openrouter';
import {
  findOfficialWebsite,
  looksLikeUrl,
  normalizeUrl,
  resolveCompetitorWebsite,
  searchCompanyContactInfo,
  searchCompetitorCandidates,
} from './serper';
import type { CompanyInfo, Competitor, ProgressEvent, ResearchResult } from './types';

type Emit = (event: ProgressEvent) => void;

export async function runResearchPipeline(
  rawInput: string,
  model: string,
  emit: Emit
): Promise<ResearchResult> {
  const input = rawInput.trim();
  if (!input) throw new Error('Please provide a company name or website URL.');

  let website: string;
  let companyNameHint: string;

  if (looksLikeUrl(input)) {
    website = normalizeUrl(input);
    companyNameHint = new URL(website).hostname.replace(/^www\./, '').split('.')[0];
    emit({ type: 'progress', step: 'identify', percent: 8, message: `Using provided website: ${website}` });
  } else {
    companyNameHint = input;
    emit({ type: 'progress', step: 'identify', percent: 5, message: `Searching for ${input}'s official website via Serper.dev...` });
    const found = await findOfficialWebsite(input);
    if (!found) {
      throw new Error(`Could not determine an official website for "${input}". Try providing the website URL directly.`);
    }
    website = found;
    emit({ type: 'progress', step: 'identify', percent: 15, message: `Found official website: ${website}` });
  }

  emit({ type: 'progress', step: 'crawl', percent: 20, message: `Crawling ${website} for key pages...` });
  const pages = await crawlWebsite(website, (url, index, total) => {
    emit({
      type: 'progress',
      step: 'crawl',
      percent: Math.min(20 + Math.round((index / total) * 25), 45),
      message: `Crawled page ${index}/${total}: ${url}`,
    });
  });
  emit({ type: 'progress', step: 'crawl', percent: 45, message: `Finished crawling ${pages.length} page(s).` });

  emit({ type: 'progress', step: 'search', percent: 50, message: `Searching public sources for contact details via Serper.dev...` });
  const supplementalContext = await searchCompanyContactInfo(companyNameHint, website).catch(() => '');

  emit({ type: 'progress', step: 'analyze', percent: 60, message: `Sending data to ${model} for AI analysis...` });
  const analysis = await analyzeCompany(companyNameHint, pages, supplementalContext, model);

  const resolvedName =
    pages[0]?.title && pages[0].title.length < 80 ? cleanTitleAsName(pages[0].title, companyNameHint) : companyNameHint;

  emit({ type: 'progress', step: 'competitors', percent: 75, message: `Searching for competitors via Serper.dev...` });
  const extraCompetitorContext = await searchCompetitorCandidates(resolvedName, analysis.industry).catch(() => '');
  const candidateNames = mergeCompetitorNames(analysis.competitorNames, extraCompetitorContext);

  emit({ type: 'progress', step: 'competitors', percent: 82, message: `Verifying competitor websites...` });
  const competitors: Competitor[] = [];
  for (const name of candidateNames.slice(0, 6)) {
    const site = await resolveCompetitorWebsite(name).catch(() => null);
    competitors.push({ name, website: site ?? '' });
    emit({
      type: 'progress',
      step: 'competitors',
      percent: Math.min(82 + Math.round((competitors.length / Math.min(candidateNames.length, 6)) * 10), 92),
      message: `Resolved competitor: ${name}${site ? ` (${site})` : ''}`,
    });
  }

  const company: CompanyInfo = {
    name: resolvedName,
    website,
    phone: analysis.phone,
    address: analysis.address,
    productsServices: analysis.productsServices,
    painPoints: analysis.painPoints,
    summary: analysis.summary,
    industry: analysis.industry,
  };

  emit({ type: 'progress', step: 'finalize', percent: 97, message: 'Compiling final report...' });

  const result: ResearchResult = {
    input,
    company,
    competitors: competitors.filter((c) => c.name),
    sourcesUsed: ['Serper.dev', 'Website crawl', `OpenRouter (${model})`],
    pagesCrawled: pages.map((p) => p.url),
    model,
    generatedAt: new Date().toISOString(),
  };

  return result;
}

function cleanTitleAsName(title: string, fallback: string): string {
  const cleaned = title.split(/[-|–—]/)[0].trim();
  return cleaned.length > 1 && cleaned.length < 60 ? cleaned : fallback;
}

function mergeCompetitorNames(aiNames: string[], searchContext: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of aiNames) {
    const key = name.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(name.trim());
    }
  }
  return result;
}
