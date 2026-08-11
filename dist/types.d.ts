export interface Listing {
    /** Unique listing ID (source-specific) */
    id: string;
    /** Source platform */
    source: 'olx' | 'mobilebg' | 'imotbg' | 'bazarbg';
    /** Listing title */
    title: string;
    /** Price in BGN stotinki (AtomicU64 — ZERO FLOAT) */
    price_stotinki: number;
    /** Original price string as displayed */
    price_display: string;
    /** Currency (BGN, EUR) */
    currency: 'BGN' | 'EUR';
    /** Direct URL to the listing */
    url: string;
    /** Thumbnail image URL */
    image_url: string | null;
    /** Location (city/region) */
    location: string;
    /** Category (cars, electronics, properties, etc.) */
    category: string;
    /** Timestamp when listing was first seen (ISO 8601) */
    first_seen: string;
    /** Estimated market price in stotinki (for comparison) */
    market_avg_stotinki: number | null;
    /** Discount percentage vs market average */
    discount_pct: number | null;
    /** Extra metadata (year, mileage, sqm, etc.) */
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
    /** User-Agent rotation pool */
    user_agents: string[];
}
export declare const DEFAULT_USER_AGENTS: string[];
/**
 * Pick a random User-Agent from the pool.
 * Complexity: O(1)
 */
export declare function randomUserAgent(): string;
/**
 * Convert BGN string price to stotinki (integer).
 * "4 500 лв." → 450000
 * "12,500 EUR" → 1250000
 * Complexity: O(n) where n = length of price string
 */
export declare function parsePriceToBGNStotinki(raw: string): {
    stotinki: number;
    currency: 'BGN' | 'EUR';
};
/**
 * Format stotinki back to human-readable BGN string.
 * 450000 → "4 500 лв."
 * Complexity: O(n)
 */
export declare function formatStotinki(stotinki: number): string;
//# sourceMappingURL=types.d.ts.map