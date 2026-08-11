import { Listing } from '../types';
import { ListingStore } from '../storage/ListingStore';
export declare class PriceAnalyzer {
    private store;
    private discountThreshold;
    private static PRICE_ANCHORS;
    constructor(store: ListingStore, discountThreshold?: number);
    /**
     * Analyze a batch of listings and tag deals.
     * Returns only listings that meet the discount threshold.
     * Complexity: O(n) where n = number of listings
     */
    analyzeAndFilterDeals(listings: Listing[]): Listing[];
    /**
     * Estimate market price for a listing.
     * Strategy:
     *   1. Check SQLite historical average (most accurate)
     *   2. Fall back to static price anchors
     * Complexity: O(1)
     */
    private estimateMarketPrice;
    /**
     * Generate a human-readable deal summary for Telegram.
     */
    static formatDealMessage(listing: Listing): string;
}
//# sourceMappingURL=PriceAnalyzer.d.ts.map