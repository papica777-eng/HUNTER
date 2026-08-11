export interface Listing {
  id: string;
  source: 'olx' | 'mobilebg' | 'imotbg' | 'bazarbg';
  title: string;
  price_stotinki: number;
  price_display: string;
  currency: 'BGN' | 'EUR';
  url: string;
  image_url: string | null;
  location: string;
  category: string;
  first_seen: string;
  market_avg_stotinki: number | null;
  discount_pct: number | null;
  meta: Record<string, string>;
}

export interface ScrapeResult {
  source: string;
  listings: Listing[];
  errors: string[];
  duration_ms: number;
  timestamp: string;
}

export interface ScraperConfig {
  enabled: boolean;
  interval_seconds: number;
  categories: string[];
  user_agents: string[];
}

export const DEFAULT_USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
];

export function randomUserAgent(): string {
  return DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
}

export function parsePriceToBGNStotinki(raw: string): { stotinki: number; currency: 'BGN' | 'EUR' } {
  const cleaned = raw.replace(/\s+/g, '').replace(/,/g, '.');
  const isEur = /eur|€/i.test(cleaned);
  const numericStr = cleaned.replace(/[^\d.]/g, '');
  const parts = numericStr.split('.');

  let stotinki: number;
  if (parts.length > 1) {
    const intPart = parseInt(parts.slice(0, -1).join(''), 10) || 0;
    const decPart = parseInt(parts[parts.length - 1].padEnd(2, '0').slice(0, 2), 10) || 0;
    stotinki = intPart * 100 + decPart;
  } else {
    stotinki = (parseInt(numericStr, 10) || 0) * 100;
  }

  if (isEur) {
    stotinki = Math.round(stotinki * 1.9558);
  }

  return { stotinki, currency: isEur ? 'EUR' : 'BGN' };
}

export function formatStotinki(stotinki: number): string {
  const leva = Math.floor(stotinki / 100);
  const formatted = leva.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} лв.`;
}
