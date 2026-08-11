"use strict";
// ═══════════════════════════════════════════════════════════════════════
// === ЛОВЕЦ — Main Entry Point ===
// ═══════════════════════════════════════════════════════════════════════
// The Hunter: Scans OLX.bg, Mobile.bg, Imot.bg every N seconds.
// Finds listings below market price.
// Sends instant VIP alerts to Telegram channel.
//
// Architect: Dimitar Prodromov
// Authority: AETERNA_LOGOS
// Complexity: O(S * L) per cycle where S = scrapers, L = listings per page
// Entropy: 0.0000
// ═══════════════════════════════════════════════════════════════════════
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
const dotenv = __importStar(require("dotenv"));
const cron = __importStar(require("node-cron"));
const OLX_Scraper_1 = require("./scrapers/OLX_Scraper");
const MobileBG_Scraper_1 = require("./scrapers/MobileBG_Scraper");
const ImotBG_Scraper_1 = require("./scrapers/ImotBG_Scraper");
const PriceAnalyzer_1 = require("./analysis/PriceAnalyzer");
const ListingStore_1 = require("./storage/ListingStore");
const TelegramBot_1 = require("./bot/TelegramBot");
// Load environment variables
dotenv.config();
// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_VIP_CHANNEL_ID || '';
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_SECONDS || '30', 10);
const DISCOUNT_THRESHOLD = parseInt(process.env.PRICE_DISCOUNT_THRESHOLD || '20', 10);
if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ TELEGRAM_BOT_TOKEN не е конфигуриран! Виж .env.example');
    process.exit(1);
}
if (!CHANNEL_ID) {
    console.error('❌ TELEGRAM_VIP_CHANNEL_ID не е конфигуриран!');
    process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────
// Initialize Components
// ─────────────────────────────────────────────────────────────────────
const store = new ListingStore_1.ListingStore();
const analyzer = new PriceAnalyzer_1.PriceAnalyzer(store, DISCOUNT_THRESHOLD);
const bot = new TelegramBot_1.LovetsBot(TELEGRAM_TOKEN, CHANNEL_ID, store);
// Initialize scrapers based on .env configuration
const scrapers = [];
if (process.env.OLX_ENABLED !== 'false') {
    scrapers.push(new OLX_Scraper_1.OLXScraper(true));
}
if (process.env.MOBILEBG_ENABLED !== 'false') {
    scrapers.push(new MobileBG_Scraper_1.MobileBGScraper(true));
}
if (process.env.IMOTBG_ENABLED !== 'false') {
    scrapers.push(new ImotBG_Scraper_1.ImotBGScraper(true));
}
console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🎯 ЛОВЕЦ — VIP Бот за Бързи Обяви v1.0          ║
║         Architect: Dimitar Prodromov                     ║
║         Authority: AETERNA_LOGOS                         ║
╠═══════════════════════════════════════════════════════════╣
║  Активни скрапери: ${scrapers.map(s => s.getName()).join(', ').padEnd(37)}║
║  Интервал:         ${String(SCAN_INTERVAL).padEnd(37)}║
║  Праг за отстъпка: ${(DISCOUNT_THRESHOLD + '%').padEnd(37)}║
║  Канал:            ${CHANNEL_ID.padEnd(37)}║
╚═══════════════════════════════════════════════════════════╝
`);
// ─────────────────────────────────────────────────────────────────────
// Main Scan Cycle
// ─────────────────────────────────────────────────────────────────────
let isScanning = false;
let cycleCount = 0;
async function scanCycle() {
    if (isScanning) {
        console.log('[ЛОВЕЦ] ⏳ Предишният цикъл все още работи, пропускане...');
        return;
    }
    isScanning = true;
    cycleCount++;
    const startTime = Date.now();
    console.log(`\n[ЛОВЕЦ] ═══ Цикъл #${cycleCount} ═══ ${new Date().toLocaleString('bg-BG')}`);
    let totalNew = 0;
    let totalDeals = 0;
    for (const scraper of scrapers) {
        if (!scraper.isEnabled())
            continue;
        try {
            const categories = process.env.OLX_CATEGORIES?.split(',') || ['cars', 'electronics', 'properties'];
            const result = await scraper.scrape(categories);
            // Filter out duplicates — only process NEW listings
            const newListings = [];
            for (const listing of result.listings) {
                if (store.insert(listing)) {
                    newListings.push(listing);
                }
            }
            totalNew += newListings.length;
            console.log(`[${scraper.getName()}] ${result.listings.length} обяви, ${newListings.length} нови (${result.duration_ms}ms)`);
            if (result.errors.length > 0) {
                result.errors.forEach(e => console.error(`  ⚠️ ${e}`));
            }
            // Analyze new listings for deals
            if (newListings.length > 0) {
                const deals = analyzer.analyzeAndFilterDeals(newListings);
                totalDeals += deals.length;
                // Send each deal to Telegram VIP channel
                for (const deal of deals) {
                    await bot.sendDealAlert(deal);
                    // Rate limit: max 20 messages per minute to channel
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        catch (error) {
            console.error(`[${scraper.getName()}] ❌ Критична грешка: ${error?.message || error}`);
        }
    }
    const duration = Date.now() - startTime;
    console.log(`[ЛОВЕЦ] ═══ Край на цикъл #${cycleCount}: ${totalNew} нови, ${totalDeals} сделки (${duration}ms) ═══`);
    isScanning = false;
}
// ─────────────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('[ЛОВЕЦ] 🚀 Стартиране...');
    // Start Telegram bot (non-blocking)
    bot.start().catch(err => {
        console.error('[Telegram] ❌ Бот грешка:', err.message);
    });
    // Run first scan immediately
    await scanCycle();
    // Schedule recurring scans
    const cronExpr = `*/${Math.max(1, Math.floor(SCAN_INTERVAL / 60)) || 1} * * * *`;
    cron.schedule(cronExpr, () => {
        scanCycle().catch(err => {
            console.error('[ЛОВЕЦ] ❌ Грешка в цикъла:', err.message);
        });
    });
    // Also run on a tighter interval using setInterval if scan interval < 60s
    if (SCAN_INTERVAL < 60) {
        setInterval(() => {
            scanCycle().catch(err => {
                console.error('[ЛОВЕЦ] ❌ Грешка в цикъла:', err.message);
            });
        }, SCAN_INTERVAL * 1000);
    }
    console.log(`[ЛОВЕЦ] ✅ Сканирането е активно! Следващо сканиране след ${SCAN_INTERVAL} секунди.`);
    // Daily cleanup at 3:00 AM
    cron.schedule('0 3 * * *', () => {
        const deleted = store.cleanup(30);
        console.log(`[ЛОВЕЦ] 🧹 Почистване: ${deleted} стари обяви изтрити.`);
    });
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[ЛОВЕЦ] 🛑 Спиране...');
    await bot.stop();
    store.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n[ЛОВЕЦ] 🛑 Спиране (SIGTERM)...');
    await bot.stop();
    store.close();
    process.exit(0);
});
// Run
main().catch(err => {
    console.error('[ЛОВЕЦ] ❌ Фатална грешка:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map