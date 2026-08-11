"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === ImotBG_Scraper — Imot.bg Property Listing Parser ===
// ═══════════════════════════════════════════════════════════════════════
// Target: https://www.imot.bg
// Parses: Title, Price, Area (sqm), Location, URL, Image
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
exports.ImotBGScraper = void 0;
const cheerio = __importStar(require("cheerio"));
const BaseScraper_1 = require("./BaseScraper");
const types_1 = require("../types");
class ImotBGScraper extends BaseScraper_1.BaseScraper {
    cityUrls = {
        'sofia': 'grad=1',
        'plovdiv': 'grad=2',
        'varna': 'grad=3',
        'burgas': 'grad=4',
        'ruse': 'grad=5',
        'stara-zagora': 'grad=6',
        'pleven': 'grad=7',
    };
    constructor(enabled = true) {
        super('Imot.bg', 'https://www.imot.bg', enabled);
    }
    async scrape(categories = ['properties']) {
        const startTime = Date.now();
        const allListings = [];
        const errors = [];
        const cities = process.env.IMOTBG_CITIES?.split(',') || ['sofia', 'plovdiv', 'varna'];
        for (const city of cities) {
            try {
                const cityParam = this.cityUrls[city.trim()] || 'grad=1';
                // Imot.bg search URL for sales sorted by newest
                const searchUrl = `${this.baseUrl}/pcgi/imot.cgi?act=3&slink=b0w7pk&f1=1&${cityParam}&sort=1`;
                console.log(`[Imot.bg] Скрапване на имоти в ${city}...`);
                const html = await this.fetchPage(searchUrl);
                const listings = this.parseListings(html, 'properties');
                // Tag listings with city
                listings.forEach(l => {
                    l.location = city;
                    l.meta['city'] = city;
                });
                allListings.push(...listings);
                console.log(`[Imot.bg] Намерени ${listings.length} обяви в ${city}`);
            }
            catch (error) {
                const errMsg = error?.message || String(error);
                errors.push(`[Imot.bg] ${city}: ${errMsg}`);
                console.error(`[Imot.bg] Грешка при ${city}: ${errMsg}`);
            }
        }
        return {
            source: 'Imot.bg',
            listings: allListings,
            errors,
            duration_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
    parseListings(html, category) {
        const $ = cheerio.load(html);
        const listings = [];
        // Imot.bg uses table-based layout similar to Mobile.bg
        $('table.tablereset, .listResult a, .advItem, .lnk1, .lnk2').each((_index, element) => {
            try {
                const $el = $(element);
                // Find listing link
                const linkEl = $el.is('a') ? $el : $el.find('a[href*="act=5"]').first();
                let url = linkEl.attr('href') || '';
                if (!url)
                    return;
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}/${url.replace(/^\//, '')}`;
                // Extract ID
                const idMatch = url.match(/adv=([^&]+)/) || url.match(/slink=([^&]+)/);
                const id = idMatch ? idMatch[1] : `imot_${Date.now()}_${_index}`;
                // Title
                const title = linkEl.text().trim()
                    || $el.find('a').first().text().trim()
                    || '';
                if (!title || title.length < 3)
                    return;
                // Price
                let priceText = '';
                $el.find('td, span, div, strong').each((_i, td) => {
                    const text = $(td).text().trim();
                    if (/\d+.*(?:лв|EUR|€)/i.test(text) && !priceText) {
                        priceText = text;
                    }
                });
                if (!priceText || !/\d/.test(priceText))
                    return;
                const { stotinki, currency } = (0, types_1.parsePriceToBGNStotinki)(priceText);
                if (stotinki <= 0)
                    return;
                // Image
                const imgEl = $el.find('img').first();
                const imageUrl = imgEl.attr('src') || imgEl.attr('data-original') || null;
                // Extract metadata (sqm, rooms, etc.)
                const meta = {};
                const sqmMatch = title.match(/([\d.]+)\s*(?:кв\.?\s*м|m2|sqm)/i);
                const roomMatch = title.match(/(\d+)\s*(?:стаен|стая|стаи|room)/i);
                if (sqmMatch)
                    meta['sqm'] = sqmMatch[1];
                if (roomMatch)
                    meta['rooms'] = roomMatch[1];
                listings.push({
                    id,
                    source: 'imotbg',
                    title: title.substring(0, 200),
                    price_stotinki: stotinki,
                    price_display: priceText,
                    currency,
                    url: fullUrl,
                    image_url: imageUrl,
                    location: '',
                    category: 'properties',
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
exports.ImotBGScraper = ImotBGScraper;
//# sourceMappingURL=ImotBG_Scraper.js.map