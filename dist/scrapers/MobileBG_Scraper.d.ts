import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult } from '../types';
export declare class MobileBGScraper extends BaseScraper {
    constructor(enabled?: boolean);
    scrape(categories?: string[]): Promise<ScrapeResult>;
    parseListings(html: string, category: string): Listing[];
}
//# sourceMappingURL=MobileBG_Scraper.d.ts.map