export interface CompanyInfo {
  name: string;
  website: string;
  phone: string | null;
  address: string | null;
  productsServices: string[];
  painPoints: string[];
  summary: string;
  industry: string | null;
}

export interface Competitor {
  name: string;
  website: string;
  reason?: string;
}

export interface ResearchResult {
  input: string;
  company: CompanyInfo;
  competitors: Competitor[];
  sourcesUsed: string[];
  pagesCrawled: string[];
  model: string;
  generatedAt: string;
}

export type ProgressEventType = 'progress' | 'result' | 'error' | 'done';

export interface ProgressEvent {
  type: ProgressEventType;
  step?: string;
  message: string;
  percent?: number;
  data?: ResearchResult;
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

export interface DiscordConfig {
  botToken: string;
  channelId: string;
}

export interface ApplicantInfo {
  name: string;
  email: string;
}
