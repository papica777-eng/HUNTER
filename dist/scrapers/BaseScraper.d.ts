import { Listing, ScrapeResult } from '../types';
export declare abstract class BaseScraper {
    protected name: string;
    protected baseUrl: string;
    protected enabled: boolean;
    constructor(name: string, baseUrl: string, enabled?: boolean);
    /**
     * Fetch HTML with stealth headers and random delay.
     * Includes retry logic with exponential backoff.
     */
    protected fetchPage(url: string, retries?: number): Promise<string>;
    /**
     * Random delay to mimic human browsing behavior.
     */
    protected randomDelay(minMs: number, maxMs: number): Promise<void>;
    /**
     * Abstract method — each scraper implements its own parsing logic.
     */
    abstract scrape(categories?: string[]): Promise<ScrapeResult>;
    /**
     * Abstract method — parse a single listing page for details.
     */
    abstract parseListings(html: string, category: string): Listing[];
    isEnabled(): boolean;
    getName(): string;
}
//# sourceMappingURL=BaseScraper.d.ts.map