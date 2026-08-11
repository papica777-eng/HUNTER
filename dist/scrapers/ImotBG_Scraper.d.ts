import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult } from '../types';
export declare class ImotBGScraper extends BaseScraper {
    private cityUrls;
    constructor(enabled?: boolean);
    scrape(categories?: string[]): Promise<ScrapeResult>;
    parseListings(html: string, category: string): Listing[];
}
//# sourceMappingURL=ImotBG_Scraper.d.ts.map