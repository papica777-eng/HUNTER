"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === MobileBG_Scraper — Mobile.bg Car Listing Parser ===
// ═══════════════════════════════════════════════════════════════════════
// Target: https://www.mobile.bg
// Parses: Make, Model, Year, Mileage, Price, URL, Image
// Complexity: O(n) per page
// Entropy: 0.0000
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileBGScraper = void 0;
const cheerio = __importStar(require("cheerio"));
const BaseScraper_1 = require("./BaseScraper");
const types_1 = require("../types");
class MobileBGScraper extends BaseScraper_1.BaseScraper {
    constructor(enabled = true) {
        super('Mobile.bg', 'https://www.mobile.bg', enabled);
    }
    async scrape(categories = ['cars']) {
        const startTime = Date.now();
        const allListings = [];
        const errors = [];
        try {
            // Mobile.bg search sorted by newest: slink=... &sort=1 (newest first)
            const searchUrl = `${this.baseUrl}/pcgi/mobile.cgi?act=3&slink=stcp0h&f1=1&sort=1`;
            console.log(`[Mobile.bg] Скрапване на автомобили...`);
            const html = await this.fetchPage(searchUrl);
            const listings = this.parseListings(html, 'cars');
            allListings.push(...listings);
            console.log(`[Mobile.bg] Намерени ${listings.length} обяви`);
        }
        catch (error) {
            const errMsg = error?.message || String(error);
            errors.push(`[Mobile.bg]: ${errMsg}`);
            console.error(`[Mobile.bg] Грешка: ${errMsg}`);
        }
        return {
            source: 'Mobile.bg',
            listings: allListings,
            errors,
            duration_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
    parseListings(html, category) {
        const $ = cheerio.load(html);
        const listings = [];
        // Mobile.bg uses table-based layout with class "tablereset"
        // Each listing is in a table row with specific structure
        $('form[name="search"] table.tablereset, table.topAdv, .listContainer a, .items a').each((_index, element) => {
            try {
                const $el = $(element);
                // Try to find listing link
                const linkEl = $el.is('a') ? $el : $el.find('a[href*="act=4"]').first();
                let url = linkEl.attr('href') || '';
                if (!url)
                    return;
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}/${url.replace(/^\//, '')}`;
                // Extract ID from URL params
                const idMatch = url.match(/adv=([^&]+)/) || url.match(/slink=([^&]+)/);
                const id = idMatch ? idMatch[1] : `mbg_${Date.now()}_${_index}`;
                // Title — usually in bold or header elements
                const title = $el.find('a[href*="act=4"]').first().text().trim()
                    || linkEl.text().trim()
                    || '';
                if (!title || title.length < 3)
                    return;
                // Price — Mobile.bg displays price in a specific cell
                let priceText = '';
                $el.find('td, span, div').each((_i, td) => {
                    const text = $(td).text().trim();
                    if (/\d+.*(?:лв|EUR|€)/i.test(text) && !priceText) {
                        priceText = text;
                    }
                });
                if (!priceText) {
                    // Try sibling elements
                    priceText = $el.next().text().trim();
                }
                if (!priceText || !/\d/.test(priceText))
                    return;
                const { stotinki, currency } = (0, types_1.parsePriceToBGNStotinki)(priceText);
                if (stotinki <= 0)
                    return;
                // Image
                const imgEl = $el.find('img').first();
                const imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || null;
                const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ?
                    `${this.baseUrl}/${imageUrl.replace(/^\//, '')}` : imageUrl;
                // Extract metadata from title (year, mileage, etc.)
                const yearMatch = title.match(/(\d{4})\s*г\.?/);
                const kmMatch = title.match(/([\d\s]+)\s*км/i);
                const meta = {};
                if (yearMatch)
                    meta['year'] = yearMatch[1];
                if (kmMatch)
                    meta['mileage'] = kmMatch[1].replace(/\s/g, '');
                listings.push({
                    id,
                    source: 'mobilebg',
                    title: title.substring(0, 200),
                    price_stotinki: stotinki,
                    price_display: priceText,
                    currency,
                    url: fullUrl,
                    image_url: fullImageUrl,
                    location: '',
                    category: 'cars',
                    first_seen: new Date().toISOString(),
                    market_avg_stotinki: null,
                    discount_pct: null,
                    meta,
                });
            }
            catch {
                // Skip malformed entries
            }
        });
        return listings;
    }
}
exports.MobileBGScraper = MobileBGScraper;
//# sourceMappingURL=MobileBG_Scraper.js.map