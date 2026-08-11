"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === PriceAnalyzer — Market Price Comparison Engine ===
// ═══════════════════════════════════════════════════════════════════════
// Compares listing price against historical market average.
// Tags listings with discount_pct when below threshold.
// Complexity: O(1) per listing (hash-map lookup for averages)
// Entropy: 0.0000
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAnalyzer = void 0;
class PriceAnalyzer {
    store;
    discountThreshold; // Minimum discount % to flag as "deal"
    // Manual price anchors for common item categories (in stotinki)
    // These serve as initial market estimates until we have enough data
    static PRICE_ANCHORS = {
        cars: {
            'bmw': 1500000, // 15,000 лв average
            'audi': 1400000,
            'mercedes': 1600000,
            'vw': 900000,
            'opel': 600000,
            'toyota': 1200000,
            'ford': 700000,
            'peugeot': 500000,
            'renault': 500000,
            'hyundai': 800000,
            'honda': 900000,
            'mazda': 800000,
            'skoda': 700000,
            'seat': 600000,
            'fiat': 400000,
            'nissan': 700000,
            'kia': 700000,
            'volvo': 1000000,
            'citroen': 500000,
            'dacia': 500000,
        },
        electronics: {
            'iphone': 150000, // 1,500 лв
            'samsung': 120000,
            'laptop': 100000,
            'macbook': 200000,
            'playstation': 60000,
            'xbox': 50000,
            'ipad': 80000,
            'телевизор': 60000,
            'monitor': 40000,
            'видеокарта': 80000,
            'процесор': 40000,
        },
        properties: {
            '1-стаен': 8000000, // 80,000 лв
            '2-стаен': 12000000, // 120,000 лв
            '3-стаен': 16000000, // 160,000 лв
            '4-стаен': 20000000, // 200,000 лв
            'къща': 15000000, // 150,000 лв
            'парцел': 5000000, // 50,000 лв
            'гараж': 2000000, // 20,000 лв
        },
    };
    constructor(store, discountThreshold = 20) {
        this.store = store;
        this.discountThreshold = discountThreshold;
    }
    /**
     * Analyze a batch of listings and tag deals.
     * Returns only listings that meet the discount threshold.
     * Complexity: O(n) where n = number of listings
     */
    analyzeAndFilterDeals(listings) {
        const deals = [];
        for (const listing of listings) {
            const marketAvg = this.estimateMarketPrice(listing);
            if (marketAvg && marketAvg > 0) {
                listing.market_avg_stotinki = marketAvg;
                // discount_pct = ((market - actual) / market) * 100
                const discountPct = ((marketAvg - listing.price_stotinki) / marketAvg) * 100;
                listing.discount_pct = Math.round(discountPct * 10) / 10; // 1 decimal
                if (discountPct >= this.discountThreshold) {
                    deals.push(listing);
                }
            }
        }
        // Sort by biggest discount first
        deals.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));
        return deals;
    }
    /**
     * Estimate market price for a listing.
     * Strategy:
     *   1. Check SQLite historical average (most accurate)
     *   2. Fall back to static price anchors
     * Complexity: O(1)
     */
    estimateMarketPrice(listing) {
        const titleLower = listing.title.toLowerCase();
        const category = listing.category;
        // Strategy 1: Historical average from our own database
        const keywords = titleLower.split(/[\s,\-]+/).filter(w => w.length > 2);
        for (const keyword of keywords) {
            const dbAvg = this.store.getMarketAverage(category, keyword);
            if (dbAvg && dbAvg > 0) {
                return dbAvg;
            }
        }
        // Strategy 2: Static price anchors
        const anchors = PriceAnalyzer.PRICE_ANCHORS[category];
        if (anchors) {
            for (const [keyword, avgPrice] of Object.entries(anchors)) {
                if (titleLower.includes(keyword.toLowerCase())) {
                    return avgPrice;
                }
            }
        }
        return null;
    }
    /**
     * Generate a human-readable deal summary for Telegram.
     */
    static formatDealMessage(listing) {
        const sourceEmoji = {
            'olx': '🟢 OLX.bg',
            'mobilebg': '🚗 Mobile.bg',
            'imotbg': '🏠 Imot.bg',
            'bazarbg': '🛒 Bazar.bg',
        };
        const source = sourceEmoji[listing.source] || listing.source;
        const discount = listing.discount_pct
            ? `🔥 -${listing.discount_pct}% ПОД ПАЗАРНАТА ЦЕНА`
            : '';
        const metaLines = [];
        if (listing.meta['year'])
            metaLines.push(`📅 Година: ${listing.meta['year']}`);
        if (listing.meta['mileage'])
            metaLines.push(`🔧 Пробег: ${listing.meta['mileage']} км`);
        if (listing.meta['sqm'])
            metaLines.push(`📐 Площ: ${listing.meta['sqm']} кв.м`);
        if (listing.meta['rooms'])
            metaLines.push(`🚪 Стаи: ${listing.meta['rooms']}`);
        if (listing.location)
            metaLines.push(`📍 ${listing.location}`);
        const metaStr = metaLines.length > 0 ? '\n' + metaLines.join('\n') : '';
        return [
            `${source}`,
            ``,
            `📌 *${escapeMarkdown(listing.title)}*`,
            `💰 *${escapeMarkdown(listing.price_display)}*`,
            discount ? `${discount}` : '',
            metaStr,
            ``,
            `⏰ ${new Date(listing.first_seen).toLocaleString('bg-BG')}`,
        ].filter(Boolean).join('\n');
    }
}
exports.PriceAnalyzer = PriceAnalyzer;
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}
//# sourceMappingURL=PriceAnalyzer.js.map