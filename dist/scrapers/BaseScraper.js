"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === BaseScraper — Abstract Stealth Scraper Interface ===
// ═══════════════════════════════════════════════════════════════════════
// Implements: Random delays, User-Agent rotation, retry with backoff
// Complexity: O(1) per request + O(n) for parsing
// Entropy: 0.0000
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseScraper = void 0;
const types_1 = require("../types");
class BaseScraper {
    name;
    baseUrl;
    enabled;
    constructor(name, baseUrl, enabled = true) {
        this.name = name;
        this.baseUrl = baseUrl;
        this.enabled = enabled;
    }
    /**
     * Fetch HTML with stealth headers and random delay.
     * Includes retry logic with exponential backoff.
     */
    async fetchPage(url, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Random delay between 500ms-2000ms to avoid detection
                await this.randomDelay(500, 2000);
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': (0, types_1.randomUserAgent)(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'bg-BG,bg;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Cache-Control': 'max-age=0',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                    },
                    redirect: 'follow',
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.text();
            }
            catch (error) {
                const errMsg = error?.message || String(error);
                console.error(`[${this.name}] Attempt ${attempt}/${retries} failed: ${errMsg}`);
                if (attempt < retries) {
                    // Exponential backoff: 2s, 4s, 8s
                    await this.randomDelay(2000 * Math.pow(2, attempt - 1), 4000 * Math.pow(2, attempt - 1));
                }
            }
        }
        throw new Error(`[${this.name}] All ${retries} attempts failed for ${url}`);
    }
    /**
     * Random delay to mimic human browsing behavior.
     */
    randomDelay(minMs, maxMs) {
        const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
    isEnabled() {
        return this.enabled;
    }
    getName() {
        return this.name;
    }
}
exports.BaseScraper = BaseScraper;
//# sourceMappingURL=BaseScraper.js.map