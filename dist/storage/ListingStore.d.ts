import { Listing } from '../types';
export declare class ListingStore {
    private db;
    constructor(dbPath?: string);
    private init;
    /**
     * Check if a listing already exists.
     * Complexity: O(1) — primary key lookup
     */
    exists(source: string, listingId: string): boolean;
    /**
     * Insert a new listing. Returns true if inserted (new), false if duplicate.
     * Complexity: O(1)
     */
    insert(listing: Listing): boolean;
    /**
     * Mark listing as notified (sent to Telegram).
     */
    markNotified(source: string, listingId: string): void;
    /**
     * Get recent deals below threshold.
     */
    getRecentDeals(minDiscountPct: number, limit?: number): Listing[];
    /**
     * Get average price for a category+keyword combination (for market comparison).
     * Complexity: O(n) but cached after first call
     */
    getMarketAverage(category: string, keyword: string): number | null;
    /**
     * Total listings count.
     */
    count(): number;
    /**
     * Cleanup old listings (older than N days).
     */
    cleanup(daysOld?: number): number;
    close(): void;
}
//# sourceMappingURL=ListingStore.d.ts.map