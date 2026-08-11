import { BaseScraper } from './BaseScraper';
import { Listing, ScrapeResult } from '../types';
export declare class OLXScraper extends BaseScraper {
    private categoryUrls;
    constructor(enabled?: boolean);
    scrape(categories?: string[]): Promise<ScrapeResult>;
    parseListings(html: string, category: string): Listing[];
}
//# sourceMappingURL=OLX_Scraper.d.ts.map