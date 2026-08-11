import { Listing, ScrapeResult, randomUserAgent } from '../types';

export abstract class BaseScraper {
  protected name: string;
  protected baseUrl: string;
  protected enabled: boolean;

  constructor(name: string, baseUrl: string, enabled: boolean = true) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.enabled = enabled;
  }

  protected async fetchPage(url: string, retries: number = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.randomDelay(500, 2000);

        const response = await fetch(url, {
          headers: {
            'User-Agent': randomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'bg-BG,bg;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        console.error(`[${this.name}] Attempt ${attempt}/${retries} failed: ${errMsg}`);
        if (attempt < retries) {
          await this.randomDelay(2000 * Math.pow(2, attempt - 1), 4000 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw new Error(`[${this.name}] All ${retries} attempts failed for ${url}`);
  }

  protected randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  abstract scrape(categories?: string[]): Promise<ScrapeResult>;
  abstract parseListings(html: string, category: string): Listing[];

  isEnabled(): boolean {
    return this.enabled;
  }

  getName(): string {
    return this.name;
  }
}
