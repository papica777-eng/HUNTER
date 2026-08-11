"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === OLX_Scraper — OLX.bg Listing Parser ===
// ═══════════════════════════════════════════════════════════════════════
// Target: https://www.olx.bg
// Parses: Title, Price, URL, Image, Location, Category
// Complexity: O(n) per page where n = number of listings
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
exports.OLXScraper = void 0;
const cheerio = __importStar(require("cheerio"));
const BaseScraper_1 = require("./BaseScraper");
const types_1 = require("../types");
class OLXScraper extends BaseScraper_1.BaseScraper {
    // OLX.bg category URL mappings
    categoryUrls = {
        'cars': '/d/avto/q-/',
        'electronics': '/d/elektronika/q-/',
        'properties': '/d/imoti/q-/',
        'phones': '/d/telefoni-i-aksesoa/q-/',
        'furniture': '/d/dom-i-gradina/q-/',
        'sports': '/d/sport/q-/',
        'clothes': '/d/moda/q-/',
        'all': '/d/ads/q-/',
    };
    constructor(enabled = true) {
        super('OLX.bg', 'https://www.olx.bg', enabled);
    }
    async scrape(categories = ['cars', 'electronics', 'properties']) {
        const startTime = Date.now();
        const allListings = [];
        const errors = [];
        for (const category of categories) {
            try {
                const urlPath = this.categoryUrls[category] || this.categoryUrls['all'];
                const url = `${this.baseUrl}${urlPath}?search%5Border%5D=created_at%3Adesc`;
                console.log(`[OLX] Скрапване на категория: ${category} → ${url}`);
                const html = await this.fetchPage(url);
                const listings = this.parseListings(html, category);
                allListings.push(...listings);
                console.log(`[OLX] Намерени ${listings.length} обяви в ${category}`);
            }
            catch (error) {
                const errMsg = error?.message || String(error);
                errors.push(`[OLX] ${category}: ${errMsg}`);
                console.error(`[OLX] Грешка при ${category}: ${errMsg}`);
            }
        }
        return {
            source: 'OLX.bg',
            listings: allListings,
            errors,
            duration_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
    parseListings(html, category) {
        const $ = cheerio.load(html);
        const listings = [];
        // OLX.bg uses data-cy="l-card" for listing cards
        $('[data-cy="l-card"]').each((_index, element) => {
            try {
                const $el = $(element);
                // Extract listing URL and ID
                const linkEl = $el.find('a[href*="/d/"]').first();
                const url = linkEl.attr('href') || '';
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                // Extract ID from URL: /d/ad/nqkva-obiava-ID12345.html → ID12345
                const idMatch = url.match(/ID([a-zA-Z0-9]+)/i) || url.match(/-(\d+)\.html/);
                const id = idMatch ? idMatch[1] : `olx_${Date.now()}_${_index}`;
                // Extract title
                const title = $el.find('h6').first().text().trim()
                    || $el.find('[data-cy="ad-card-title"]').text().trim()
                    || linkEl.attr('title')?.trim()
                    || '';
                if (!title)
                    return;
                // Extract price
                const priceText = $el.find('[data-testid="ad-price"]').text().trim()
                    || $el.find('p').filter((_i, p) => /лв|EUR|€/i.test($(p).text())).first().text().trim()
                    || '';
                if (!priceText || /по договаряне|безплатно/i.test(priceText))
                    return;
                const { stotinki, currency } = (0, types_1.parsePriceToBGNStotinki)(priceText);
                if (stotinki <= 0)
                    return;
                // Extract image
                const imgEl = $el.find('img').first();
                const imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || null;
                // Extract location
                const locationText = $el.find('[data-testid="location-date"]').text().trim()
                    || $el.find('small').last().text().trim()
                    || '';
                // Location is usually "Город - Днес 14:30"
                const location = locationText.split(' - ')[0]?.trim() || locationText.split(',')[0]?.trim() || '';
                listings.push({
                    id,
                    source: 'olx',
                    title,
                    price_stotinki: stotinki,
                    price_display: priceText,
                    currency,
                    url: fullUrl,
                    image_url: imageUrl,
                    location,
                    category,
                    first_seen: new Date().toISOString(),
                    market_avg_stotinki: null,
                    discount_pct: null,
                    meta: {},
                });
            }
            catch {
                // Skip malformed listings silently
            }
        });
        return listings;
    }
}
exports.OLXScraper = OLXScraper;
//# sourceMappingURL=OLX_Scraper.js.map