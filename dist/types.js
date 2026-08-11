"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === Listing — Unified Listing Data Structure ===
// ═══════════════════════════════════════════════════════════════════════
// Complexity: O(1) — Pure data type
// Entropy: 0.0000
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_AGENTS = void 0;
exports.randomUserAgent = randomUserAgent;
exports.parsePriceToBGNStotinki = parsePriceToBGNStotinki;
exports.formatStotinki = formatStotinki;
// Default User-Agent pool for stealth scraping
exports.DEFAULT_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
];
/**
 * Pick a random User-Agent from the pool.
 * Complexity: O(1)
 */
function randomUserAgent() {
    return exports.DEFAULT_USER_AGENTS[Math.floor(Math.random() * exports.DEFAULT_USER_AGENTS.length)];
}
/**
 * Convert BGN string price to stotinki (integer).
 * "4 500 лв." → 450000
 * "12,500 EUR" → 1250000
 * Complexity: O(n) where n = length of price string
 */
function parsePriceToBGNStotinki(raw) {
    const cleaned = raw.replace(/\s+/g, '').replace(/,/g, '.');
    const isEur = /eur|€/i.test(cleaned);
    const numericStr = cleaned.replace(/[^\d.]/g, '');
    const parts = numericStr.split('.');
    let stotinki;
    if (parts.length > 1) {
        // Has decimal: "12500.50" → 1250050
        const intPart = parseInt(parts.slice(0, -1).join(''), 10) || 0;
        const decPart = parseInt(parts[parts.length - 1].padEnd(2, '0').slice(0, 2), 10) || 0;
        stotinki = intPart * 100 + decPart;
    }
    else {
        stotinki = (parseInt(numericStr, 10) || 0) * 100;
    }
    // Convert EUR → BGN at fixed rate (1 EUR ≈ 1.9558 BGN — fixed by currency board)
    if (isEur) {
        stotinki = Math.round(stotinki * 1.9558);
    }
    return { stotinki, currency: isEur ? 'EUR' : 'BGN' };
}
/**
 * Format stotinki back to human-readable BGN string.
 * 450000 → "4 500 лв."
 * Complexity: O(n)
 */
function formatStotinki(stotinki) {
    const leva = Math.floor(stotinki / 100);
    const formatted = leva.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} лв.`;
}
//# sourceMappingURL=types.js.map